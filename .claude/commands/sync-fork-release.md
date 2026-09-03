---
description: Detect a new upstream Rallly release and, if found, cut/rebase/merge the fork's release-branch workflow
---

# Fork sync / release-branch runbook

You are maintaining the verdigado/rallly fork of lukevella/rallly. This command
is meant to run both interactively and unattended (VM cron or a scheduled
cloud routine calling `claude -p`), so make no assumption that a human is
watching — surface problems by writing to GitHub (PRs, issues, comments), not
by asking a question and waiting.

Full design context lives in issue #64 (`Maintained Customization`) and this
command's own git history. This file itself must be kept correct across every
future rebase, same as any other customization.

## Auth — read this before doing anything else

Do **not** use the `gh` CLI and do not rely on any pre-existing `git`
credential on this host. Mint a fresh, narrowly-scoped GitHub App installation
token for every run:

```bash
export TOKEN=$(node scripts/fork-sync/get-installation-token.mjs)
```

Requires `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY_PATH` to already be set in the environment — if
they're missing, stop and report that instead of guessing at credentials.

Use `$TOKEN` explicitly, per call:
- REST API: `Authorization: Bearer $TOKEN` header.
- git push/fetch to verdigado/rallly: `git -c http.extraheader="AUTHORIZATION: bearer $TOKEN" push https://github.com/verdigado/rallly.git <refspec>` (the extraheader form avoids the token ending up embedded in a remote URL or process argv).

Reads of the public upstream repo `lukevella/rallly` need **no auth** — never
send `$TOKEN` to any host other than `api.github.com`/`github.com` for
`verdigado/rallly`.

## Phase 1 — Detection (cheap, run this every time)

1. Fetch upstream: `git fetch https://github.com/lukevella/rallly.git main` (public, unauthenticated).
2. Push it into verdigado/rallly `main`:
   `git push -c http.extraheader="AUTHORIZATION: bearer $TOKEN" https://github.com/verdigado/rallly.git FETCH_HEAD:main`
   Only `main`. Never push anything else here.
3. Get upstream's latest release: `GET https://api.github.com/repos/lukevella/rallly/releases/latest` (unauthenticated). Note its tag, e.g. `v4.13.1`.
4. List existing release branches: `GET https://api.github.com/repos/verdigado/rallly/git/matching-refs/heads/release/` (send `Authorization: Bearer $TOKEN` since this is a verdigado/rallly read) and find the highest `release/<semver>-fork` branch.
5. Check whether that highest release branch has **any** `<semver>-fork.N` tag pointing into it (`GET /repos/verdigado/rallly/git/matching-refs/tags/<semver>-fork.`). **Untagged means unfinished**, regardless of how far behind or ahead upstream now is:
   - **Untagged** → this release is still blocked on something from a prior run (unresolved conflicts, or a run that stopped before tagging). Resume Phase 2 against this **same** `release/<semver>-fork` and `<upstream_semver>` — do not cut a newer release branch even if upstream has moved on further in the meantime. Finish one release before starting the next.
   - **Tagged** → that release is fully done. Compare its `<semver>` against upstream's latest tag from step 3. Equal or ahead → **stop here, silently** (no branch to create, nothing to post — a quiet no-op is a successful run). Behind → continue to Phase 2 with `<upstream_semver>` = upstream's new tag and `<upstream_commit>` = that release's target commit, to cut a **new** release branch.

## Phase 2 — Full workflow (only when Phase 1 found something new)

### 2a. Cut the release branch

**Only when resuming an in-progress release** (Phase 1 found it untagged),
skip this step — the branch already exists, use it as-is.

Otherwise, create `release/<upstream_semver>-fork` from `<upstream_commit>`
and push it (same `http.extraheader` auth as above). This is a protected
branch push of a brand new branch, not a force-push — that's expected and
fine.

### 2b. Find the branches to carry forward

Do **not** glob-match `feature/*` — branch names have drifted (e.g.
`feat/62-support-oidc-sso`, `bug/52-fix-language-cookie-setting` alongside the
usual `feature/<n>-<slug>`). Instead:

```
GET /repos/verdigado/rallly/issues?labels=Maintained%20Customization&state=open
```

For each issue, resolve its branch by matching the issue number as a token
inside a branch name (any prefix — `feature/62-...`, `feat/62-...`,
`bug/62-...` all count), not by parsing the issue body/comments or looking
for a linked PR: in practice these issues don't mention their branch in text,
and GitHub's own linked-branch relationship isn't set on them either (checked
via the issue timeline API — no such event). Fetch
`GET /repos/verdigado/rallly/branches` and match `<issue-number>-` against
each branch name. Flag (don't silently drop) any open Maintained-Customization
issue with no matching branch, and any branch matching no open issue's
number.

### 2c. Rebase, resolve, self-review, merge — per branch

**Before rebasing each branch, re-fetch the local `release/<upstream_semver>-fork`
ref** (`git fetch https://github.com/verdigado/rallly.git release/<upstream_semver>-fork:release/<upstream_semver>-fork --force`) —
merges happen via the REST API, which doesn't update local refs, so without
this a later branch in the loop can rebase against a stale copy and miss a
real conflict against one merged moments ago.

For each branch from 2b: if resuming an in-progress release and this
branch's PR already merged into `release/<upstream_semver>-fork` on a prior
run, skip it — don't re-rebase or re-merge something already done. Otherwise:

**0. Read the issue(s) before touching anything.** The branch's linked issue
*and any of its GitHub sub-issues* (`GET /repos/verdigado/rallly/issues/<n>/sub_issues`
— a sub-issue can carry the customization's actual requirements without its
own `Maintained Customization` label, inheriting scope from the parent; e.g.
`#41` is a sub-issue of `#29`) is the ground truth for what this
customization must still do — not just "whatever makes git stop
complaining." Read all of it, including embedded screenshots (download and
view them), before attempting a resolution.

**1. Rebase it onto the new `release/<upstream_semver>-fork`.**

**2. If it conflicts, actually resolve it** — guided by what you just read,
not by picking a side mechanically:
   - Work out, from the issue's documented intent, which side should win for
     each conflicting hunk, or how to reconcile both.
   - **Hard exception for translation/locale files** (`public/locales/**`,
     `packages/emails/locales/**`, i18n `*.json`) — narrowed: CLAUDE.md's
     "don't hand-edit, `i18n:scan`/`i18n:sync` owns these" rule protects
     Crowdin-owned keys, not values this fork already decided on. Resolve
     directly only when every conflicting key is one the customization's own
     commit already set (reapplying, not inventing); any Crowdin-owned key
     in the mix still escalates (step 4). Never run `i18n:sync --sync-all`.
     A fork-owned key with no current upstream counterpart: keep it, flag as
     possibly dead in the summary rather than deleting it.
   - A conflict confined to a lockfile (`pnpm-lock.yaml`) or other generated
     output can just be regenerated (`pnpm install`) rather than merged by hand.
   - **Needing to write new code — not just re-apply an existing diff — is
     not itself a reason to escalate.** If part of a customization looks
     missing after the rebase, check what's actually true before assuming
     something was deleted: a file the customization itself *adds* (not one
     it modifies) survives every rebase unconflicted, same as any other new
     file — it doesn't need "rebuilding" at all, it's just already there.
     The only real conflicts happen where upstream modified the *same*
     existing code the customization also touches. Concrete case: issue #62's
     OIDC logout customization looked at first like it needed a rebuilt
     backend route (`/api/auth/oidc-logout`) — it didn't; that route is the
     customization's own file, applied cleanly the whole time. The actual
     (and only) conflict was in `auth-client.ts`'s `signOut()`, which
     upstream had also modified. Once genuinely rebuilding something is
     needed, check whether upstream now does it natively (then it's an
     obsolescence candidate, 2e — flag, don't rebuild) and whether the
     pieces to reconstruct it still exist elsewhere in the codebase — that's
     real work, but still bounded and resolvable, not ambiguity.
   - If, after actually engaging with the issue's intent — including
     checking whether the pieces to rebuild a missing capability actually
     exist — the correct resolution is still genuinely unclear (not just
     effortful, and not just "requires writing more code than a one-line
     fix"), that's a legitimate reason to escalate (step 4).

**3. Self-review — validate against the issue's own documented outcome, not just that the code compiles:**
   - Always: `pnpm check`, `pnpm type-check`, `pnpm test:unit`, and read the
     full diff for anything that looks wrong (leftover conflict artifacts, an
     unintended change dragged in by the rebase, etc).
   - **If the issue documents a visual/UI outcome** (screenshots, described
     visual states — most front-end customizations will): stand up a real
     local instance (`pnpm docker:up`, `pnpm db:reset` if the schema
     changed, `pnpm dev` against the **real** `apps/web/.env`, not
     `.env.test`) and capture the actual rendered state of the affected
     surface(s) with Playwright (`npx playwright screenshot <url> <file>` is
     enough for a single view; install browsers first with `npx playwright
     install chromium` if missing). Compare what you captured against the
     issue's own reference screenshots, side by side, visually — this is the
     real check; "the diff looks plausible" is not a substitute for seeing
     the rendered result. Tear the local instance down afterward (`pnpm
     docker:down`, plus the Keycloak container below) — don't leave anything
     running.
   - **Logging in for this uses real OIDC via a throwaway Keycloak, not a
     shortcut.** `apps/web/.env` has `EMAIL_LOGIN_ENABLED=false` with OIDC as
     the only method — a real user never sees a login page at all (`/login`
     shows a brief spinner then redirects straight to the IdP; see
     `apps/web/src/app/[locale]/(auth)/login/page.tsx`). Don't switch to
     `.env.test`'s email-OTP login to dodge this — it would validate a login
     mechanism nobody actually uses. Instead, before `pnpm dev`, bring up a
     disposable Keycloak matching the app's existing OIDC config:
     - Read `OIDC_DISCOVERY_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`,
       `OIDC_NAME_CLAIM_PATH`, and `NEXT_PUBLIC_BASE_URL` straight out of
       `apps/web/.env` — don't invent new values, match what the app already
       expects (currently: realm `gruenes-netz`, client `rallly`, on port
       `8080`, per the discovery URL's path).
     - Start it with the app's own values baked into a realm import, e.g.:
       ```bash
       docker run -d --name fork-sync-keycloak -p 8080:8080 \
         -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin \
         -v /tmp/fork-sync-realm.json:/opt/keycloak/data/import/realm.json:ro \
         quay.io/keycloak/keycloak:latest start-dev --import-realm
       ```
       where `/tmp/fork-sync-realm.json` is generated at run time (realm
       name and client id/secret from `.env`, `standardFlowEnabled: true`,
       `redirectUris` including `<NEXT_PUBLIC_BASE_URL>/api/auth/callback/oidc`
       — that path comes from Better Auth's `genericOAuth` plugin config,
       `providerId: "oidc"`, in `apps/web/src/lib/auth.ts` (verified against
       the actual redirect Better Auth sends — don't trust the plugin name
       to imply the path), plus one test
       user with a known username/password and `emailVerified: true` for
       Playwright to actually log in as.
     - Drive the real flow: navigate to `/login`, follow the redirect to
       Keycloak, fill in the test user's credentials on Keycloak's own login
       form, let it redirect back — this is what genuinely exercises OIDC,
       not a bypass of it.
     - `docker rm -f fork-sync-keycloak` when done, alongside the rest of the
       teardown. Nothing about this — the container, the realm file, the
       test user — persists between runs or gets committed anywhere.
   - **If the issue documents a behavioral/flow outcome** that can't be
     screenshotted (e.g. an auth redirect flow): validate by tracing the
     logic against the issue's description and any existing tests. If real
     confidence isn't achievable without something unavailable here (a live
     external identity provider, etc.), that is a legitimate reason to
     escalate (step 4) rather than merge something unverified.
   - Fix what you find and re-validate. There's no fixed round limit — keep
     going as long as each attempt is making real progress toward a
     validated result. Stop and escalate (step 4) once further attempts
     stop being productive, not after an arbitrary count.
   - Never claim a visual or behavioral check passed without having actually
     performed it this run.

**4. Wait for CI, then merge or escalate:**
   - Locally validated (checks pass, and any required visual/behavioral
     comparison actually confirms the issue's documented outcome still
     holds): push, open (or update) a PR against
     `release/<upstream_semver>-fork` — CI only runs once the commit reaches
     GitHub (`ci.yml` triggers on PRs into `release/**`).
   - **Poll `GET /repos/verdigado/rallly/commits/<head-sha>/check-runs`**
     every ~30s until every returned run reports `status: completed` (cap
     the wait at ~20 minutes — the docker-smoke-test and integration-tests
     jobs are the slow ones).
   - All runs `conclusion` in `success`/`neutral`/`skipped`: merge via `PUT
     /repos/verdigado/rallly/pulls/<number>/merge`. **Do not wait for a
     human approval** — the PR exists for the audit trail, not as a gate. In
     the PR description, say what was resolved, how it was validated, and
     that CI passed.
   - Any run `failure`/`cancelled`/`timed_out`, or nothing finishes within
     the wait cap: **do not merge.** CI is a hard precondition, not optional
     — treat this exactly like any other blocked case below.
   - Still blocked (hard i18n exception hit, genuinely ambiguous resolution,
     a local check that fails and can't be fixed with real further effort,
     or CI red/stuck per above): push the best-effort branch state,
     open/update the PR as a **draft** — do not merge it — and explain
     specifically what was tried and why it's still blocked, not just
     "conflict" or "CI failed." Note it in the Phase 2 summary (2e). Move on
     to the next branch; one blocked branch must never stop the others.

### 2d. Tag — only if every branch from 2b actually merged

**Do not tag unless every branch from 2b ended this run merged into
`release/<upstream_semver>-fork` — zero open or draft PRs remaining against
it.** A tag is a claim that this release works; it also drives CI
(`docker-image.yml`, `release.yml` both trigger on tag push), so tagging a
release that's still missing a customization — including, concretely, a
release-automation customization like #48 that touches the CI workflow
itself — can push a tag whose build doesn't reflect what was intended, and
CI will burn a cycle on it either way.

If anything from 2b is still open/draft: **skip tagging entirely** this run.
Say so explicitly in the Phase 2f summary, name which branches are blocking
it, and note that this release stays untagged until a human resolves them
(a later run will pick this same release back up per Phase 1 step 5).

If everything merged cleanly: tag it —
- First fork release of this upstream version: `<upstream_semver>-fork.1`
- A fix re-run on an already-tagged release branch: increment `.n`

Push the tag with the same authenticated method as above (or
`POST /repos/verdigado/rallly/git/refs` with `ref: refs/tags/<tag>`).

### 2e. Obsolescence check — flag only, never decide

For each `Maintained Customization` issue from 2b, skim upstream's changelog/
release notes between the previously-synced version and `<upstream_semver>`
(and, if that's ambiguous, a targeted look at the relevant upstream source
paths) for anything that looks like it might now natively cover that issue —
e.g. issue #62 (OIDC single sign-out via the Better Auth Generic OAuth plugin)
against a new upstream auth-related changelog entry.

This is a **heuristic signal for a human, never an automatic decision**:
- On a plausible match: comment on the issue linking the specific upstream
  changelog entry/PR/commit, and ask a human to confirm whether the
  customization can now be dropped.
- Never close the issue, never remove its `Maintained Customization` label,
  never delete its branch based on this check alone — no matter how
  confident the match looks.
- No match found is not worth a comment. Silence is fine here too.

### 2f. Final summary — stop before the human-only step

Do **not** touch the Salt pillar or the infra repo — this automation has no
access there, and the pillar bump is the one deliberate human-approval gate
in this whole process (it's what actually triggers a production deploy).

Post one summary — as a comment on issue #64, or a new issue if that one's
closed — stating:
- Whether a tag was cut this run, and which one — or, if 2d skipped tagging,
  say so explicitly and name what's still blocking it.
- Which branches merged cleanly (self-reviewed, no human involved).
- Which branches are stuck as draft PRs needing manual conflict resolution (link them).
- Which issues got an obsolescence-check comment this run, if any.
- The explicit next step for a human: if a tag was cut, bump
  `pillars/latest-version/rallly.sls` to `<upstream_semver>-fork.<n>` to
  deploy; if not, resolve the blocking draft PR(s) — the next run will pick
  this same release back up.

## Guardrails (apply throughout, not just where mentioned above)

- **Never tag a release branch that still has any open or draft PR against it from 2b** — a tag drives real CI (image build, release draft) and implies the release is complete and working, not partially assembled.
- Never push to `main` except the plain fast-forward sync from upstream in Phase 1 step 2.
- Never touch anything outside the verdigado/rallly repo — the App installation structurally can't reach anywhere else, keep it that way (never widen its install).
- Never push a branch that still has leftover conflict markers or an otherwise broken/half-merged state — a pushed branch (merged or draft) must always be a real, complete attempt, not a checkpoint mid-resolution.
- In a translation/locale file conflict, only ever reapply values the customization's own commit already set — never invent a translation or touch a Crowdin-owned key, and never run `i18n:sync --sync-all` (2c step 2).
- **Never merge a branch's PR before its CI checks (`ci.yml`, which runs on `release/**` too) have completed green** — CI is a hard precondition alongside local self-review, never a substitute for it or something optional under time pressure (2c step 4).
- Never claim a visual or behavioral validation passed without actually having performed it this run (a running dev server and a real screenshot comparison, or actually tracing the behavior) — "the diff looks right" is not a substitute.
- Never auto-close an issue, strip a label, or delete a branch based on the obsolescence check.
- Effort spent resolving a conflict is not itself a reason to keep going — escalate (2c step 4) once a genuinely ambiguous call or a hard exception is hit, not just when it gets time-consuming; conversely, don't escalate early just because the first attempt didn't work.
- If `Phase 1` finds nothing new, that is a fully successful run — do not manufacture a status update.

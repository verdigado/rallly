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

### 2c. Rebase, self-review, merge — per branch

For each branch from 2b: if resuming an in-progress release and this
branch's PR already merged into `release/<upstream_semver>-fork` on a prior
run, skip it — don't re-rebase or re-merge something already done. Otherwise:

1. Rebase it onto the new `release/<upstream_semver>-fork`.
2. **Clean rebase:**
   - Push the rebased branch.
   - Open a PR against `release/<upstream_semver>-fork` (`POST /repos/verdigado/rallly/pulls`).
   - Self-review it, up to ~2 rounds: run `pnpm check`, `pnpm type-check`, `pnpm test:unit`, and actually read the diff for anything that looks wrong (leftover conflict markers, an unintended change dragged in by the rebase, etc). Fix what you find, push the fix, re-run checks.
   - If clean (immediately or after fixes): merge via `PUT /repos/verdigado/rallly/pulls/<number>/merge`. **Do not wait for a human approval** — the PR exists for the audit trail, not as a gate.
   - If checks are still failing after ~2 rounds: treat it exactly like a conflict (next bullet) — don't force a third round, don't merge broken code.
3. **Conflict (at rebase time, or checks still failing after 2 review rounds):**
   - Push the best-effort branch state.
   - Open the PR as a **draft** — do not merge it.
   - Note it in the Phase 2 summary (2e). Move on to the next branch; one blocked branch must never stop the others.

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
- Never force-push over a branch that still has unresolved conflicts.
- Never auto-close an issue, strip a label, or delete a branch based on the obsolescence check.
- The self-review-and-fix loop is capped at ~2 rounds per branch; past that, it's a conflict, not a retry target.
- If `Phase 1` finds nothing new, that is a fully successful run — do not manufacture a status update.

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
5. If the highest existing release branch's `<semver>` already equals or exceeds upstream's latest tag: **stop here, silently**. No branch to create, nothing to post — do not open an issue or comment just to say "nothing changed." A quiet no-op is a successful run.
6. Otherwise, continue to Phase 2 with `<upstream_semver>` = the new tag (e.g. `4.13.1`) and `<upstream_commit>` = that release's target commit.

## Phase 2 — Full workflow (only when Phase 1 found something new)

### 2a. Cut the release branch

Create `release/<upstream_semver>-fork` from `<upstream_commit>` and push it
(same `http.extraheader` auth as above). This is a protected branch push of a
brand new branch, not a force-push — that's expected and fine.

### 2b. Find the branches to carry forward

Do **not** glob-match `feature/*` — branch names have drifted (e.g.
`feat/62-support-oidc-sso`, `bug/52-fix-language-cookie-setting` alongside the
usual `feature/<n>-<slug>`). Instead:

```
GET /repos/verdigado/rallly/issues?labels=Maintained%20Customization&state=open
```

For each issue, find its linked branch (issue body/comments, or a linked PR)
— this is the authoritative list, not the branch namespace.

### 2c. Rebase, self-review, merge — per branch

For each branch from 2b:

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

### 2d. Tag

Once all cleanly-mergeable branches are merged into `release/<upstream_semver>-fork`, tag it:
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
- The new tag that was cut.
- Which branches merged cleanly (self-reviewed, no human involved).
- Which branches are stuck as draft PRs needing manual conflict resolution (link them).
- Which issues got an obsolescence-check comment this run, if any.
- The explicit next step for a human: bump `pillars/latest-version/rallly.sls` to `<upstream_semver>-fork.<n>` to deploy.

## Guardrails (apply throughout, not just where mentioned above)

- Never push to `main` except the plain fast-forward sync from upstream in Phase 1 step 2.
- Never touch anything outside the verdigado/rallly repo — the App installation structurally can't reach anywhere else, keep it that way (never widen its install).
- Never force-push over a branch that still has unresolved conflicts.
- Never auto-close an issue, strip a label, or delete a branch based on the obsolescence check.
- The self-review-and-fix loop is capped at ~2 rounds per branch; past that, it's a conflict, not a retry target.
- If `Phase 1` finds nothing new, that is a fully successful run — do not manufacture a status update.

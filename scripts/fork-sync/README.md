# Fork-sync automation

Automates the manual monthly process of keeping this fork in sync with
upstream [`lukevella/rallly`](https://github.com/lukevella/rallly): cutting a
new `release/<semver>-fork` branch, rebasing and merging every
`Maintained Customization` branch onto it, tagging it, and flagging
customizations upstream may have since absorbed. Tracked in issue #64.

The actual step-by-step logic lives in
[`.claude/commands/sync-fork-release.md`](../../.claude/commands/sync-fork-release.md)
(invoked as `/sync-fork-release`, or by a scheduled Claude Code process). This
file explains the *system* around that runbook: why there are two separate
GitHub Apps involved, how credentials flow, and what's still manual.

## Two GitHub Apps — different jobs, don't confuse them

**1. The `rallly-fork-bot` GitHub App** (custom, owned by verdigado)
Installed on `verdigado/rallly` only, with exactly `contents: write`,
`issues: write`, `pull_requests: write`, `metadata: read` and nothing else.
This is the credential the *runbook itself* uses for every git push and every
GitHub API call it makes (creating branches, opening/merging PRs, commenting
on issues, tagging). `get-installation-token.mjs` in this directory mints a
fresh ~1-hour installation token from it on every run by signing a JWT with
its private key and exchanging that for a token via
`POST /app/installations/<id>/access_tokens`.

Deliberately **not** the `gh` CLI, and not a personal access token: a PAT's
scope is tied to a whole GitHub account and can't be limited to one repo; a
dedicated single-repo App install is structurally incapable of reaching
anything else, no matter what else that GitHub account can otherwise touch.

**2. Anthropic's own "Claude" GitHub App**
A completely separate app, installed on `verdigado/rallly` for a different
reason: it's what lets a **Claude Code cloud routine** (a scheduled agent
running in Anthropic's own cloud sandbox, rather than on a local machine or
VM) clone/check out this repo at all. It has no involvement in the actual
git/API writes the runbook makes — those always go through the
`rallly-fork-bot` token above, regardless of *where* the runbook is running.

**Current status:** cloud-routine execution was evaluated and deliberately
deferred (see "Execution host" below), so the Claude GitHub App is currently
installed but unused by anything in this workflow. It would only start
mattering again if this automation moves to a Claude Code scheduled routine
instead of running interactively / via a VM.

## Credentials this needs

Three environment variables, none of which are secrets except the last:

- `GITHUB_APP_ID` — the `rallly-fork-bot` App's numeric App ID (not its name/slug)
- `GITHUB_APP_INSTALLATION_ID` — the numeric ID of its installation on verdigado/rallly
- `GITHUB_APP_PRIVATE_KEY_PATH` — path to its private key `.pem` file (the actual secret)

In the devcontainer used for interactive runs, these are wired through
`.devcontainer/devcontainer.json` (`containerEnv` + a bind mount for the key),
sourced from the *host* machine's own environment via `${localEnv:...}` —
never hardcoded into a file that could end up committed.

## Execution host: interactive for now, unattended later

Two ways to actually run this on a schedule were considered:

- A dedicated VM with OS-level cron calling `claude -p` with the runbook prompt.
- A Claude Code scheduled cloud routine (no VM to maintain, but needs the
  Claude GitHub App above, plus a claude.ai account GitHub connection that
  wasn't fully resolved during setup).

Neither is wired up yet — every real run so far has been triggered
interactively (`/sync-fork-release`, human watching). This is intentional:
the runbook has already needed real fixes discovered only by running it for
real (see "Lessons from the first real run" below), so it's being run
supervised for now, with automation of the trigger itself coming once the
logic has proven reliable.

## Self-review and merge policy

Every branch is rebased onto the new release branch and, if that succeeds
cleanly, pushed and opened as a PR against it. The runbook then self-reviews
(lint, type-check, unit tests, and actually reading the diff) and — if that
passes — merges the PR itself via the GitHub API, **without waiting for a
human to approve it**. This was a deliberate choice, not an oversight: this
repo's actual safety net is running the resulting release locally and on
staging before anything reaches production (the Salt pillar bump below), not
PR review on the release branch. A branch that fails to rebase cleanly, or
fails self-review, becomes a **draft** PR instead and is left for a human.

Note: merging a PR from Claude Code's own sandbox requires an explicit
`autoMode.allow` entry in `.claude/settings.local.json` (personal,
gitignored) — Claude Code's own safety classifier blocks PR-merge API calls
by default, separately from whatever GitHub itself permits. See that file's
`autoMode.allow` entry for the exact scope of what's been allowed and why.

## The one human-only step

The runbook never touches the Salt pillar or the infra repo
(`pillars/latest-version/rallly.sls`) — it has no access there at all. Bumping
that file to point at the new `<semver>-fork.<n>` tag is what actually
triggers a deploy, and stays a manual, deliberate action every time.

## Lessons from the first real run (kept here so they aren't relearned)

- **Git push auth needs Basic, not Bearer.** `Authorization: Bearer <token>`
  works for the REST/GraphQL APIs but GitHub's git-over-HTTPS smart protocol
  needs `Authorization: Basic <base64(x-access-token:token)>` via
  `http.extraheader`.
- **Issue→branch resolution can't rely on issue text.** None of the
  `Maintained Customization` issues mention their branch in the body, and
  none have GitHub's native linked-branch relationship set. Matching the
  issue number as a token inside any branch name (regardless of `feature/`,
  `feat/`, `bug/` prefix drift) is what actually works.
- **Marking a PR "ready for review" isn't a REST operation.** `PATCH
  /pulls/{n}` silently ignores a `draft` field change; converting a draft PR
  needs the `markPullRequestReadyForReview` GraphQL mutation.
- **The devcontainer's `node_modules`/Prisma client can be stale** relative to
  whatever branch is currently checked out, several upstream versions later.
  Run `pnpm install --frozen-lockfile` (with `CI=true` to skip the
  interactive prompt) and `pnpm db:generate` before trusting a type-check or
  test result — otherwise unrelated "cannot find module" / stale-generated-
  types errors will look like real regressions.
- **Some `apps/web` unit test flakiness is pre-existing**, reproducible on a
  clean, unmodified release branch with no fork changes at all. Before
  blaming a branch's rebase for a failing test, reproduce the same failure
  on the base release branch first.

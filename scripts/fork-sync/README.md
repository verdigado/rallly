# Fork-sync automation

Automates the recurring process of keeping this fork in sync with
upstream [`lukevella/rallly`](https://github.com/lukevella/rallly): cutting a
new `release/<semver>-fork` branch, rebasing and merging every
`Maintained Customization` branch onto it, tagging it, and flagging
customizations upstream may have since absorbed. Runs on whatever cadence
it's scheduled at — not a fixed cycle. Tracked in issue #64.

The actual step-by-step logic lives in
[`.claude/commands/sync-fork-release.md`](../../.claude/commands/sync-fork-release.md)
(invoked as `/sync-fork-release`, or by a scheduled Claude Code process). This
file explains the *system* around that runbook: why there are two separate
GitHub Apps involved, how credentials flow, and how to run it.

## Two GitHub Apps — different jobs, don't confuse them

**1. The `rallly-fork-bot` GitHub App** (custom, owned by verdigado)
Installed on `verdigado/rallly` only, scoped narrowly to just what the
runbook needs (repo contents, issues, and pull requests, read+write) — check
the App's actual configured permissions on GitHub rather than trusting a
list here, since App permissions can change without this file being updated.
This is the credential the *runbook itself* uses for every git push and every
GitHub API call it makes (creating branches, opening/merging PRs, commenting
on issues, tagging). `get-installation-token.mjs` in this directory mints a
fresh ~1-hour installation token from it on every run by signing a JWT with
its private key and exchanging that for a token via
`POST /app/installations/<id>/access_tokens`.

Deliberately **not** the `gh` CLI, and not a personal access token: `gh` only
supports classic PATs, whose scope is tied to the whole GitHub account (a
fine-grained PAT *can* be scoped to a single repo, but `gh` doesn't support
those). A dedicated single-repo App install is structurally incapable of
reaching anything else, no matter what else that GitHub account can
otherwise touch, regardless of token type.

**2. Anthropic's own "Claude" GitHub App**
A completely separate app, installed on `verdigado/rallly` for a different
reason: it's what lets a **Claude Code cloud routine** (a scheduled agent
running in Anthropic's own cloud sandbox, rather than on a local machine or
VM) clone/check out this repo at all. It has no involvement in the actual
git/API writes the runbook makes — those always go through the
`rallly-fork-bot` token above, regardless of *where* the runbook is running.

## Credentials this needs

Three environment variables, none of which are secrets except the last:

- `GITHUB_APP_ID` — the `rallly-fork-bot` App's numeric App ID (not its name/slug)
- `GITHUB_APP_INSTALLATION_ID` — the numeric ID of its installation on verdigado/rallly
- `GITHUB_APP_PRIVATE_KEY_PATH` — path to its private key `.pem` file (the actual secret)

Setting these up is the responsibility of whatever environment runs the
runbook — never hardcode them into a file that could end up committed. For a
Claude Code scheduled routine, this means configuring them as the routine's
own environment/secrets.

## Execution host

The runbook can run either interactively or unattended — it makes no
assumption either way about whether a human is watching (see its own file
for that note).

- **Interactively**: run `/sync-fork-release` from a Claude Code session with
  the credentials above set in its environment.
- **Unattended**: schedule it — e.g. a Claude Code scheduled cloud routine
  (needs the Claude GitHub App above, plus a claude.ai account GitHub
  connection), or a dedicated VM with OS-level cron calling `claude -p` with
  the runbook prompt — with the same credentials configured wherever that
  scheduler's environment/secrets live.

## Self-review and merge policy

Every branch is rebased onto the new release branch and, if that succeeds
cleanly, pushed and opened as a PR against it. The runbook then self-reviews
(lint, type-check, unit tests, and actually reading the diff), waits for CI
on the PR to report green, and — if all of that passes — merges the PR
itself via the GitHub API, **without waiting for a human to approve it**.
This was a deliberate choice, not an oversight: releases must be tested
before reaching production, and that's this repo's actual safety net, not PR
review on the release branch. A branch that fails to rebase cleanly, fails
self-review, or fails CI becomes a **draft** PR instead and is left for a
human.

A draft PR *is* the escalation channel, not an internal detail — it's how a
blocked branch surfaces for a human to see. Once a PR is draft, the runbook
leaves it alone on every future run: it will not keep retrying to resolve it
on its own initiative. It stays untouched until a human either resolves it
directly (push a fix and mark it ready for review) or explicitly instructs a
future run how to resolve it. A PR no longer being a draft is itself the
signal that hands control back to the runbook — from that point it treats
the branch like any other: check CI, merge once green. The runbook never
flips a PR's draft status itself in either direction.

Note: merging a PR from Claude Code's own sandbox requires an explicit
`autoMode.allow` entry in `.claude/settings.local.json` (personal,
gitignored) — Claude Code's own safety classifier blocks PR-merge API calls
by default, separately from whatever GitHub itself permits. See that file's
`autoMode.allow` entry for the exact scope of what's been allowed and why.

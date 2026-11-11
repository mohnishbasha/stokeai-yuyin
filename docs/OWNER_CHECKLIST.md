# Owner Checklist

Actions only the owner can take. The agent prepares each one, records it here, and stops. Nothing in this list is ever done by the agent.

Last updated: 2026-11-11

## Blocking now

These stop the build today. Sprint 0 cannot reach its gate until they are cleared.

Rechecked 2026-11-10 on a second run: `gh pr merge 139` was again refused by the auto mode check (Merge Without Review), and the GitHub CLI token still has only `gist`, `read:org`, `repo`, `workflow` scopes. B1 and B2 are still open. The build stopped again at Sprint 0.

Rechecked 2026-11-10 on a third run: PRs #139 and #140 are still open and unmerged, no Claude Code permission rule allows `gh pr merge`, and the GitHub CLI token scopes are unchanged (no `project`). The merge was not retried because the earlier refusal still applies. B1 and B2 are still open. The build stopped again at Sprint 0.

Rechecked 2026-11-11 on a fourth run: PRs #139 and #140 are still open and unmerged, no Claude Code permission rule allows `gh pr merge`, and the GitHub CLI token scopes are unchanged (`gist`, `read:org`, `repo`, `workflow`, no `project`). The merge was not retried. B1 and B2 are still open. The build stopped again at Sprint 0. Further runs of `run-yuyin.sh` will stop at the same point until the owner clears B1 and B2.

Rechecked 2026-11-11 on a fifth run: no change. PRs #139 and #140 are still open, there is still no `gh pr merge` permission rule, and the token scopes still have no `project` (`gh project list` fails with missing `read:project`). The merge was not retried. The build stopped again at Sprint 0.

Rechecked 2026-11-11 on a sixth run: no change. PRs #139 and #140 are still open, there is still no `gh pr merge` permission rule, and the token scopes are still `gist`, `read:org`, `repo`, `workflow` with no `project`. The merge was not retried. The build stopped again at Sprint 0.

| # | Action | Why it blocks | How to clear it | Needed by |
|---|---|---|---|---|
| B1 | Allow the agent to merge its own pull requests into `develop`, or review and merge them yourself | The Claude Code auto mode permission check refuses `gh pr merge` (merge without review). The build prompt closes every issue only through a merged PR, so no Sprint 0 issue can close. PR #139 (issue numbers written back into the sprint plan) and the PR adding this file are waiting | Either add a Claude Code permission rule that allows `gh pr merge` for `mohnishbasha/stokeai-yuyin` into `develop`, or merge each PR after review | Now |
| B2 | Grant the GitHub CLI the `project` scope | The Yuyin project board (Step 2.6) cannot be created and the 138 issues cannot be added to it. The Sprint 0 gate item "Every sprint issue exists on the board" depends on it | Run `gh auth refresh -s project,read:project` in an interactive terminal | Now |
| B3 | Decide how `develop` reaches `staging` | `staging` requires 1 approving review and admins are not exempt. GitHub does not let a PR author approve their own PR, and the agent works under the owner's account, so the Sprint End Protocol step "merge `develop` into `staging` via PR" needs a human approval every sprint | Approve the staging PR yourself from a second account, add a second reviewer, or change the staging rule and record the change in ARCHITECTURE as an ADR | End of every sprint, first at Sprint 0 |
| B4 | Confirm repository location and visibility | The prompt specifies a private repository `serverless-ventures/yuyin-tts`. The build runs in the public repository `mohnishbasha/stokeai-yuyin` (ADR-016). Proprietary source is being pushed to a public repository | Make the repository private, or transfer it to the `serverless-ventures` organisation, or confirm public is intended. Note that GitHub Free private repositories lose branch protection and free arm64 runners | Before Sprint 1 code lands |

## Before named sprints

| # | Action | Needed by sprint | Notes |
|---|---|---|---|
| O1 | Name and trademark check for "Yuyin" | 0 | The prompt requires this before Sprint 0 ends. The word is a generic Chinese term, so it may be hard to protect and to rank for. The name lives only in `PRODUCT_NAME`, `PRODUCT_SLUG`, `KEY_PREFIX` |
| O2 | Domain registration (`getyuyin.com`, fallback `yuyintts.com`) and DNS for `api.`, `console.`, `docs.`, `status.` | 3 (staging hostnames) | Never registered by the agent |
| O3 | npm scope `@yuyin-tts` and PyPI package `yuyin` availability and organisation | 5 | Publishing is owner only |
| O4 | AWS account, `ap-south-1` region, billing, and IAM for CI (GitHub OIDC role) | 3 | Staging smoke runs every sprint end from Sprint 3 |
| O5 | Clerk application (development instance, organisations enabled) | 2 | Console shell uses it from Sprint 2, accounts in Sprint 4 |
| O6 | Nile database (staging and production) | 4 | |
| O7 | Stripe account, test mode keys, products and prices | 4 | Live keys only at release, created by the owner |
| O8 | Vercel project for the console and docs | 2 | Encrypted environment variables set by the owner |
| O9 | GHCR access for `ghcr.io/serverless-ventures` and a package write token for CI | 3 | Version tags are pushed only by `release.yml` |
| O10 | Pricing decision: price per 1,000 characters (Opus and PCM, WAV), minimum top-up, launch grant | 4 | Placeholders: 2,000 and 2,400 micro-USD, $5.00, 1,000,000 characters for the first 1,000 signups |
| O11 | Voice name approval from the generated list in `config/voices.toml` | 3 | |
| O12 | Attorney review of `EULA.md`, Terms, Privacy, Acceptable use, Refunds | 6 | The legal draft banner stays on until the owner sets `LEGAL_DRAFT_BANNER=off` |
| O13 | Register the `yy_live_` and `yy_test_` key patterns with GitHub secret scanning | 4 | Custom patterns need GitHub Advanced Security or a partner programme |
| O14 | Production promotion and signed release tags | 6 | Production deploys are owner only |
| O15 | Self-host licence signing key in AWS Secrets Manager | 7 | The private key never enters the repository |

# Owner Checklist

Actions only the owner can take. The agent prepares each one, records it here, and stops. Nothing in this list is ever done by the agent.

Last updated: 2026-11-14

## Blocking now

These stop the build today. Sprint 0 cannot reach its gate until they are cleared.

Recheck history: B1 and B2 were rechecked on seven runs between 2026-11-10 and 2026-11-11 with no change. On the eighth recheck (2026-11-11) the owner had merged PRs #139 and #140 by hand, so the work waiting at that point reached `develop`. No Claude Code permission rule allowing `gh pr merge` was added, so every new PR still needs the owner to merge it. The GitHub CLI token scopes were still `gist`, `read:org`, `repo`, `workflow` with no `project`. On the ninth recheck (2026-11-11) the token scopes were unchanged (no `project`), no `gh pr merge` permission rule had been added, PR #141 was still waiting for the owner, and api.github.com could not be reached from the build machine (TLS handshake timeouts), so the default branch (B5) could not be rechecked. On the tenth recheck (2026-11-11) the owner had merged PR #141, but it was squash-merged before the ninth recheck commit was pushed, so that note is carried forward in this PR. The token scopes were still unchanged (no `project`), no `gh pr merge` permission rule had been added, and the default branch was still `main` (B5 open). On the eleventh recheck (2026-11-12) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #142 was still waiting for the owner. On the twelfth recheck (2026-11-12) the owner had merged PR #142, which carried the eleventh recheck note. Nothing else had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, and the default branch was still `main` (B5 open). On the thirteenth recheck (2026-11-12) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #143 was still waiting for the owner. On the fourteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the fifteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the sixteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the seventeenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the eighteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the nineteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the twentieth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the twenty-first recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #143 was still waiting for the owner. B4 is resolved (see below). On the twenty-second recheck (2026-11-13) the owner had merged PR #143, granted the GitHub CLI the `project` scope (B2 resolved), and made `develop` the default branch (B5 resolved). The agent then added the remaining 32 issues to the Yuyin board, so all 138 issues are on it, moved the 13 Sprint 0 issues to In Progress, and assigned them. B3 remains open. B1 was resolved on 2026-11-13 (see Resolved).

| # | Action | Why it blocks | How to clear it | Needed by |
|---|---|---|---|---|
| B3 | Decide how `develop` reaches `staging` | `staging` requires 1 approving review and admins are not exempt. GitHub does not let a PR author approve their own PR, and the agent works under the owner's account, so the Sprint End Protocol step "merge `develop` into `staging` via PR" needs a human approval every sprint | Approve the staging PR yourself from a second account, add a second reviewer, or change the staging rule and record the change in ARCHITECTURE as an ADR | End of every sprint, first at Sprint 0. Waiting now: PR #168 (`develop` into `staging`, Sprint 0). The Sprint 0 work is otherwise complete. After #168 is approved and merged, the agent tags the `staging` merge commit `sprint-0-complete` |

## Before named sprints

| # | Action | Needed by sprint | Notes |
|---|---|---|---|
| O2 | DNS for the `yuyin.openstoke.com` subdomains: `api`, `console`, `docs`, `status`, plus `api-stage` and `console-stage` (the owner controls `openstoke.com`) | 3 (staging hostnames) | Never changed by the agent. `getyuyin.com` and `yuyintts.com` are dropped |
| O3 | npm scope `@yuyin-tts` and PyPI package `yuyin` availability and organisation | 5 | Publishing is owner only |
| O7 | Stripe account, test mode keys, products and prices | 4 | Live keys only at release, created by the owner |
| O9 | GHCR access for `ghcr.io/mohnishbasha` (the `REGISTRY` variable default) and a package write token for CI | 3 | Version tags are pushed only by `release.yml`. Images must be linux/arm64 capable |
| O10 | Pricing decision: price per 1,000 characters (Opus and PCM, WAV), minimum top-up, launch grant | 4 | Placeholders: 2,000 and 2,400 micro-USD, $5.00, 1,000,000 characters for the first 1,000 signups |
| O11 | Voice name approval from the generated list in `config/voices.toml` | 3 | |
| O12 | Attorney review of `EULA.md`, Terms, Privacy, Acceptable use, Refunds | 6 | The legal draft banner stays on until the owner sets `LEGAL_DRAFT_BANNER=off` |
| O13 | Register the `yy_live_` and `yy_test_` key patterns with GitHub secret scanning | 4 | Custom patterns need GitHub Advanced Security or a partner programme |
| O14 | Production promotion and signed release tags | 6 | Production deploys are owner only |
| O15 | Add the `YUYIN_LICENCE_SIGNING_KEY` GitHub Actions secret (Ed25519 private key) in a protected `licensing` environment | 7 | Licences are signed by a manual `workflow_dispatch` workflow. The private key never enters the repository |
| O16 | Stoke cluster access: GitHub Actions secret `STOKE_KUBECONFIG`, target namespace, storage class for CloudNativePG, ingress controller, and a TLS certificate for `*.yuyin.openstoke.com` | 3 | CI runs `helm upgrade` against the Stoke ARM64 cluster (DGX Spark bundles). Staging smoke runs every sprint end from Sprint 3 |
| O17 | Make the `ci`, `security`, and `licence-check` jobs required status checks on `develop` (branch protection) | 1 | In Sprint 0, Dependabot PR #165 merged while CI was red and broke `develop` (fixed in #166). This is a repository governance setting, so the owner changes it |

## Next phase

Deferred by the owner decisions of 2026-11-13. None blocks a sprint gate.

| # | Action | Notes |
|---|---|---|
| O4 | AWS account, `ap-south-1` region, billing, and IAM for CI (GitHub OIDC role) | Replaced for now by O16 |
| O5 | Clerk application (development instance, organisations enabled) | Built-in console auth is used until then (ADR-025) |
| O6 | Choose NileDB or Neon and create the account (staging and production) | In-cluster PostgreSQL 16 is used until then (ADR-024) |
| O8 | Vercel project for the console and docs | The console runs on the Stoke cluster until then |

## Pending TODO (end of plan)

Blocks no gate.

| # | Action | Status | Notes |
|---|---|---|---|
| O1 | Name and trademark check for "Yuyin" | Pending | The word is a generic Chinese term, so it may be hard to protect and to rank for. The name lives only in `PRODUCT_NAME`, `PRODUCT_SLUG`, `KEY_PREFIX` |

## Resolved

| # | Action | Resolution |
|---|---|---|
| B4 | Confirm repository location and visibility | 2026-11-13: the owner confirmed the repository stays public at `mohnishbasha/stokeai-yuyin`. No visibility change or org transfer is planned. ADR-016 updated. The rule that no secrets, model weights, or customer data are committed stays in force |
| B2 | Grant the GitHub CLI the `project` scope | 2026-11-13: the owner granted the `project` scope. The agent completed the Yuyin board (Step 2.6): all 138 issues are on it, Sprint 0 issues are In Progress |
| B5 | Decide how issues close when PRs merge into `develop` | 2026-11-13: the owner made `develop` the default branch, so `Closes #n` in a PR into `develop` closes the issue as the closing protocol requires |
| B1 | Allow the agent to merge its own pull requests into `develop` | 2026-11-13: owner allowed the agent to run `gh pr merge` via a local Claude Code permission rule |

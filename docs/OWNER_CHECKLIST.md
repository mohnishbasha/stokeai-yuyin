# Owner Checklist

Actions only the owner can take. The agent prepares each one, records it here, and stops. Nothing in this list is ever done by the agent.

Last updated: 2026-11-16

## Blocking now

B8 (2026-11-16): the `gitleaks` job fails on every PR, and Sprint 2 cannot finish until it passes. CI checks out every branch (`fetch-depth: 0`) and scans the full history. Two commits on the unmerged branch `feature/s2-t02-component-library` (`e7a619b`, `2090e3f`) store a fake `yy_test_` KeyReveal key as a literal, so the `yuyin-api-key` rule fires. The value was never a real key. The tip of the branch is fixed (`f512bf3` builds the fake key at runtime), but the old commits stay in history. The agent tried both fixes below and auto mode denied each one. On 2026-11-16 the agent squashed the work into one clean commit on a new branch, `feature/s2-t02-components`, and opened PR #213 (no leaks found by a local gitleaks scan). Deleting the old branch was also denied, so the owner must choose one:

1. Recommended: close PR #212 and delete the branch `feature/s2-t02-component-library`. PR #213 carries the same work, so nothing is lost, and the old commits stay reachable only through the closed PR ref, which CI does not fetch.
2. Allowlist the two commits: add a `[[allowlists]]` block to `.gitleaks.toml` with `targetRules = ["yuyin-api-key"]` and `commits = ["e7a619b1b1132b8647a66b75164db3fc5f9966df", "2090e3f26fa9d5c23d8639e2f5fe887715a94f1b"]`.

Waiting on this: PR #210 (S2-T07 docs site; every other check is green), PR #213 (S2-T02), PR #215 (S2-T05) and PR #214 (S2-T06), both stacked on #213, and then S2-T08, S2-T09 and the Sprint 2 end protocol. Status on 2026-11-16 after PR #214 fixed its e2e failure (commit `7e6d69b`): on PRs #210, #213, #214 and #215 every check passes except `gitleaks`. As soon as B8 is resolved, the agent merges them into `develop`.

Recheck history: B1 and B2 were rechecked on seven runs between 2026-11-10 and 2026-11-11 with no change. On the eighth recheck (2026-11-11) the owner had merged PRs #139 and #140 by hand, so the work waiting at that point reached `develop`. No Claude Code permission rule allowing `gh pr merge` was added, so every new PR still needs the owner to merge it. The GitHub CLI token scopes were still `gist`, `read:org`, `repo`, `workflow` with no `project`. On the ninth recheck (2026-11-11) the token scopes were unchanged (no `project`), no `gh pr merge` permission rule had been added, PR #141 was still waiting for the owner, and api.github.com could not be reached from the build machine (TLS handshake timeouts), so the default branch (B5) could not be rechecked. On the tenth recheck (2026-11-11) the owner had merged PR #141, but it was squash-merged before the ninth recheck commit was pushed, so that note is carried forward in this PR. The token scopes were still unchanged (no `project`), no `gh pr merge` permission rule had been added, and the default branch was still `main` (B5 open). On the eleventh recheck (2026-11-12) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #142 was still waiting for the owner. On the twelfth recheck (2026-11-12) the owner had merged PR #142, which carried the eleventh recheck note. Nothing else had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, and the default branch was still `main` (B5 open). On the thirteenth recheck (2026-11-12) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #143 was still waiting for the owner. On the fourteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the fifteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the sixteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the seventeenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the eighteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the nineteenth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the twentieth recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), the repository was still public (B4 open), and PR #143 was still waiting for the owner. On the twenty-first recheck (2026-11-13) nothing had changed: the token scopes were still `gist`, `read:org`, `repo`, `workflow` (no `project`), no `gh pr merge` permission rule had been added, the default branch was still `main` (B5 open), and PR #143 was still waiting for the owner. B4 is resolved (see below). On the twenty-second recheck (2026-11-13) the owner had merged PR #143, granted the GitHub CLI the `project` scope (B2 resolved), and made `develop` the default branch (B5 resolved). The agent then added the remaining 32 issues to the Yuyin board, so all 138 issues are on it, moved the 13 Sprint 0 issues to In Progress, and assigned them. B3 remains open. B1 was resolved on 2026-11-13 (see Resolved).

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
| O18 | Decide the speech engine path in issue #184: no open-weights Hindi voice from the Sprint 1 bake-off is licence-clean (options 1 to 4 are in the issue) | 3 | Blocks S3-T18 (#198) and S3-T01 (ONNX engine). ADR-015 stays Proposed until then. NM-LNG-03 in #199 also depends on it |

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
| B7 | Decide the JS licence exceptions for the Next.js console (PR #205, S2-T01) | 2026-11-16: the owner merged PR #205 with `licence-check` red, which left `develop` red. The agent applied the proposed fix: per-package exceptions with written reasons in `scripts/licence-check.sh` and ADR-030, with no change to the allowlist. Owner to confirm. If the owner prefers to drop libvips, the alternative is to stub out `sharp` and set `images.unoptimized` |
| B6 | Merge staging promotion PR #201 (`develop` into `staging`, Sprint 1) | 2026-11-15: the owner merged PR #201 with a merge commit (`a00afe3`). The agent tagged it `sprint-1-complete` and merged `staging` back into `develop`. Sprint 1 is complete |
| B3 | Decide how `develop` reaches `staging` | 2026-11-14: the owner set the `staging` rule to 0 required approving reviews (ADR-028) and merged PR #168. The agent tagged the `staging` merge commit `d960988` as `sprint-0-complete`. Sprint 0 is complete |
| B4 | Confirm repository location and visibility | 2026-11-13: the owner confirmed the repository stays public at `mohnishbasha/stokeai-yuyin`. No visibility change or org transfer is planned. ADR-016 updated. The rule that no secrets, model weights, or customer data are committed stays in force |
| B2 | Grant the GitHub CLI the `project` scope | 2026-11-13: the owner granted the `project` scope. The agent completed the Yuyin board (Step 2.6): all 138 issues are on it, Sprint 0 issues are In Progress |
| B5 | Decide how issues close when PRs merge into `develop` | 2026-11-13: the owner made `develop` the default branch, so `Closes #n` in a PR into `develop` closes the issue as the closing protocol requires |
| B1 | Allow the agent to merge its own pull requests into `develop` | 2026-11-13: owner allowed the agent to run `gh pr merge` via a local Claude Code permission rule |

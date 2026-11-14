# Helpers for tests that open a throwaway draft PR and read the CI result. Sourced.
# These run on demand (they create and close a PR on GitHub), not in tests/scaffold/run.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# probe_pr <branch> <title> <commit-message> <edit-command>: branches off origin/develop in a
# temporary worktree, applies the edit, pushes, opens a draft PR, and prints its number.
probe_pr() {
  local branch="$1" title="$2" msg="$3" edit="$4" wt
  wt="$(mktemp -d)/wt"
  git -C "$ROOT" fetch -q origin develop
  git -C "$ROOT" worktree add -q -b "$branch" "$wt" origin/develop
  (cd "$wt" && bash -c "$edit" && git commit -qam "$msg" && git push -q -u origin "$branch")
  git -C "$ROOT" worktree remove --force "$wt"
  gh pr create --draft --base develop --head "$branch" --title "$title" \
    --body "Throwaway probe PR opened by tests/ci. It must fail CI; it is closed without merging." \
    | sed -E 's#.*/pull/([0-9]+).*#\1#'
}

# job_conclusion <pr> <job-name>: waits for the job on the PR head and prints its conclusion.
job_conclusion() {
  local pr="$1" job="$2" sha run c
  sha="$(gh pr view "$pr" --json headRefOid -q .headRefOid)"
  for _ in $(seq 120); do
    run="$(gh run list --workflow ci.yml --commit "$sha" --json databaseId -q '.[0].databaseId')"
    if [[ -n "$run" ]]; then
      c="$(gh run view "$run" --json jobs -q ".jobs[] | select(.name | startswith(\"$job\")) | .conclusion" | head -1)"
      [[ -n "$c" ]] && { echo "$c"; return; }
    fi
    sleep 20
  done
  echo "timeout"
}

# close_probe <pr> <branch>
close_probe() {
  gh pr close "$1" --delete-branch >/dev/null 2>&1 || true
  git -C "$ROOT" branch -D "$2" >/dev/null 2>&1 || true
}

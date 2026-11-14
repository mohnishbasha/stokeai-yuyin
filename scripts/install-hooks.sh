#!/usr/bin/env bash
# Points git at the tracked hooks in .githooks.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "git hooks installed (core.hooksPath=.githooks)"

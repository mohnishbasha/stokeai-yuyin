#!/usr/bin/env bash
# SC-24: every file from S0-T06 exists and carries the content Appendix J requires.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

fail() { echo "FAIL: $1"; exit 1; }

for f in .gitignore AGENTS.md CLAUDE.md SKILLS.md SOUL.md \
  .agent/skills/run-tests/SKILL.md .agent/skills/run-tests/run.sh \
  .agent/skills/check-types/SKILL.md .agent/skills/check-types/run.sh \
  .agent/skills/run-golden/SKILL.md .agent/skills/run-golden/run.sh \
  .agent/skills/run-bench/SKILL.md .agent/skills/run-bench/run.sh; do
  [ -f "$f" ] || fail "missing $f"
done

[ "$(head -n 1 CLAUDE.md)" = "@import AGENTS.md" ] || fail "CLAUDE.md first line is not '@import AGENTS.md'"

while IFS= read -r rule; do
  grep -qF -- "- $rule" AGENTS.md || fail "AGENTS.md missing rule: $rule"
done <<'EOF'
ALWAYS add golden rows before changing the normaliser.
ALWAYS update the spec doc in the same PR as a behaviour change.
ALWAYS use `MicroUsd` and `Chars` newtypes in billing code.
ALWAYS run synthesis on the worker pool.
NEVER log or store request text or audio.
NEVER hand-edit `config/capacity.toml` or any published benchmark number.
NEVER add a model, voice, or dataset without a recorded licence.
NEVER commit model weights, secrets, or licence files.
NEVER weaken the capacity, drain, or isolation tests.
NEVER perform owner-only actions
EOF

# SOUL.md holds values, not commands or paths.
if grep -qE '`[^`]*/[^`]*`|`[^`]*\.(md|toml|rs|sh|ts|yml|yaml)`' SOUL.md; then
  fail "SOUL.md contains a backtick-quoted path"
fi
if grep -qE '`(make|cargo|bun) ' SOUL.md; then
  fail "SOUL.md contains a build command"
fi

for p in 'target/' 'node_modules/' '.env' 'models/' '*.onnx'; do
  grep -qxF -- "$p" .gitignore || fail ".gitignore missing $p"
done

echo "ok: smoke_agent_files_required_present_allexist"

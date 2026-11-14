# SKILLS

Agent skills are small, runnable procedures that wrap a project check. Each lives in its own directory under `.agent/skills/`.

## Skills index

| Name | Directory | When to use |
|---|---|---|
| run-tests | `.agent/skills/run-tests/` | Before opening a PR, or after any code change: runs the Rust, TypeScript, and Python suites and prints a summary |
| check-types | `.agent/skills/check-types/` | After changing signatures or types: clippy with `-D warnings`, `bun run type-check`, `mypy --strict` |
| run-golden | `.agent/skills/run-golden/` | Before and after any change to the normaliser: runs the golden corpus, prints per-class pass counts |
| run-bench | `.agent/skills/run-bench/` | When measuring latency or capacity against the local gateway with `FakeEngine` or the real engine |

## Skill format

A skill is a directory with two files:

- `SKILL.md`: YAML front matter with `name` and `description`, then sections "When to use", "What it runs", "Output", and "Exit codes".
- `run.sh`: an executable bash script. It starts with `#!/usr/bin/env bash` and `set -euo pipefail`, changes to the repository root from its own path, and exits 0 on success and non-zero on failure.

The `description` says when to use the skill, in one sentence. Pi and other loaders match on it.

## How to add a new skill

1. Create `.agent/skills/<name>/` with a lowercase, hyphenated name.
2. Write `SKILL.md` and `run.sh` in the format above.
3. Make the script executable: `chmod +x .agent/skills/<name>/run.sh`.
4. Add a row to the index table in this file.
5. Add the skill to the check in `tests/scaffold/smoke_agent_skills_run_sh_exit_0.sh`.
6. Run `bash .agent/skills/<name>/run.sh` and `bash tests/scaffold/run.sh`.

## Pi skill loading notes

- Pi discovers skills by scanning `.agent/skills/*/SKILL.md` and reading the front matter.
- Pi runs `run.sh` with the repository root or any subdirectory as the working directory. Scripts must not rely on the caller's directory, which is why each one changes to the root itself.
- Session state goes to `.agent/sessions/`, which is ignored by git.
- Skills print a short summary to stdout. Pi shows that summary to the agent, so keep it brief and specific.

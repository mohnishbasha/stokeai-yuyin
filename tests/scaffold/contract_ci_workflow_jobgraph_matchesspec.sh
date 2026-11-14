#!/usr/bin/env bash
# SC-40: the job graph in .github/workflows/ci.yml matches SPRINT_PLAN S0-T04.
source "$(dirname "$0")/lib.sh"
cd "$ROOT"
bun -e '
const y = Bun.YAML.parse(await Bun.file(".github/workflows/ci.yml").text());
const j = y.jobs;
const fail = (m) => { console.log("FAIL: " + m); process.exit(1); };
const needs = (k) => [j[k]?.needs ?? []].flat();
const want = {
  "lint-and-typecheck": [], "unit-tests": ["lint-and-typecheck"], "coverage": ["unit-tests"],
  "integration-tests": ["unit-tests"], "contract-tests": ["unit-tests"], "e2e-tests": ["integration-tests"],
  "version-check": [], "cli-matrix": [], "harness-smoke-tests": [],
};
for (const [k, n] of Object.entries(want)) {
  if (!j[k]) fail(`job ${k} missing`);
  if (JSON.stringify(needs(k)) !== JSON.stringify(n)) fail(`${k} needs ${JSON.stringify(needs(k))}, want ${JSON.stringify(n)}`);
}
const extra = Object.keys(j).filter((k) => !(k in want));
if (extra.length) fail(`unexpected jobs ${extra}`);
const runners = j["lint-and-typecheck"].strategy?.matrix?.runner ?? [];
if (!runners.includes("ubuntu-24.04") || !runners.includes("ubuntu-24.04-arm")) fail("lint-and-typecheck must run on amd64 and arm64");
const vc = String(j["version-check"].if);
if (!vc.includes("staging") || !vc.includes("main")) fail("version-check must be limited to PRs to staging and main");
for (const [k, sprint] of [["cli-matrix", "Sprint 8"], ["harness-smoke-tests", "Sprint 10"]]) {
  if (!String(j[k].if).includes("false")) fail(`${k} must be skipped until ${sprint}`);
  if (!String(j[k].name).includes(sprint)) fail(`${k} name must say ${sprint}`);
}
'
echo "ok: contract_ci_workflow_jobgraph_matchesspec"

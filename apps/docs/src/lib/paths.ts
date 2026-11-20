// Build-time file locations. The docs build runs with apps/docs or the repository root as the
// working directory, so paths are found by walking up to a marker file instead of by depth.
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";

function findUp(relative: string, from: string = process.cwd()): string {
  let dir = from;
  for (;;) {
    const candidate = join(dir, relative);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir || dir === parse(dir).root) {
      throw new Error(`${relative} not found above ${from}`);
    }
    dir = parent;
  }
}

export const openApiPath = (): string => findUp("api/openapi.yaml");
export const changelogPath = (): string => findUp("CHANGELOG.md");
export const versionPath = (): string => findUp("VERSION");
export const contentDir = (): string => dirname(findUp("apps/docs/src/content/index.mdx"));

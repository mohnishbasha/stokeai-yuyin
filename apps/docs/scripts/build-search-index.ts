// Writes public/search-index.json, the static index the search field loads (FR-024).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { contentDir } from "../src/lib/paths";
import { buildSearchIndex } from "../src/lib/search-index";

const out = join(contentDir(), "../../public/search-index.json");
const index = buildSearchIndex();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(index));
process.stdout.write(`docs search: ${String(index.length)} entries\n`);

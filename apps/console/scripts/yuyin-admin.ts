// Entry point for `bun run yuyin-admin ...` (ADR-025, decision recorded in ARCHITECTURE).
import { PgAuthStore } from "../src/server/pg-store";
import { USAGE, runAdmin } from "../src/server/admin-cli";

const url = process.env.DATABASE_URL;
const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (url === undefined || url.length === 0) {
  process.stderr.write("yuyin-admin: DATABASE_URL is not set\n");
  process.exit(2);
}
const store = PgAuthStore.fromUrl(url);
try {
  process.stdout.write(await runAdmin(store, argv, process.env));
} catch (error) {
  process.stderr.write(`yuyin-admin: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await store.close();
}

// Seeds the database for the Playwright suite (S2-T09). Applies the auth migration when the
// schema is empty, replaces any previous e2e data, creates one organization with one owner who
// is also the operator, and writes a live session as a Playwright storage state plus one
// unused login token. Prints only the user id (the server's operator allowlist) on stdout.
// Refuses to run unless YUYIN_E2E=1, because it truncates the auth tables.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import { createOrganization, createUser, issueLoginToken } from "../src/lib/auth/admin";
import { SESSION_COOKIE } from "../src/lib/auth/cookies";
import { createSession } from "../src/lib/auth/sessions";
import { PgAuthStore } from "../src/server/pg-store";

const AUTH_DIR = ".auth";
const MIGRATION = new URL("../../../migrations/0001_auth_subset.sql", import.meta.url);
const COOKIE_HOST = process.env.E2E_COOKIE_HOST ?? "localhost";

const url = process.env.DATABASE_URL;
if (process.env.YUYIN_E2E !== "1" || url === undefined || url.length === 0) {
  process.stderr.write("e2e-seed: set YUYIN_E2E=1 and DATABASE_URL\n");
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
const schema = await client.query<{ present: string | null }>(
  "select to_regclass('public.organizations') as present",
);
if (schema.rows[0]?.present === null) {
  await client.query(await readFile(MIGRATION, "utf8"));
}
await client.query("truncate organizations, users, memberships, login_tokens, sessions cascade");
await client.end();

const store = PgAuthStore.fromUrl(url);
try {
  const org = await createOrganization(store, { name: "Acme Voice" });
  const user = await createUser(store, {
    email: "asha@example.test",
    name: "Asha Rao",
    orgId: org.id,
    role: "owner",
  });
  const session = await createSession(store, { userId: user.id, tenantId: org.id });
  const login = await issueLoginToken(store, { userId: user.id, issuedBy: "e2e-seed" });

  await mkdir(AUTH_DIR, { recursive: true });
  const state = {
    cookies: [
      {
        name: SESSION_COOKIE,
        value: session.token,
        domain: COOKIE_HOST,
        path: "/",
        expires: Math.floor(session.record.expiresAt.getTime() / 1000),
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
  await writeFile(`${AUTH_DIR}/state.json`, JSON.stringify(state));
  await writeFile(`${AUTH_DIR}/login.json`, JSON.stringify({ token: login.token }));
  process.stdout.write(`${user.id}\n`);
} finally {
  await store.close();
}

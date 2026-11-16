// CN-49 unit_console_migrations_authsubset_matchesarchitecture
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryAuthStore } from "../../src/lib/auth/memory-store";
import { PgAuthStore } from "../../src/server/pg-store";
import { storeContract } from "../support/store-contract";

const MIGRATIONS = join(import.meta.dirname, "../../../../migrations");
const sqlFiles = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const sql = sqlFiles.map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");

describe("migrations (static)", () => {
  it("test_migrations_authsubset_fivetablesexist", () => {
    for (const table of ["organizations", "users", "memberships", "login_tokens", "sessions"]) {
      expect(sql).toMatch(new RegExp(`create table ${table} \\(`));
    }
  });

  it("test_migrations_hashes_bytea_unique", () => {
    expect(sql).toMatch(/login_tokens[\s\S]*token_hash bytea not null unique/);
    expect(sql).toMatch(/sessions[\s\S]*token_hash\s+bytea not null unique/);
  });

  it("test_migrations_checks_rolesandstatuses", () => {
    expect(sql).toContain("role in ('owner', 'admin', 'developer', 'billing')");
    expect(sql).toContain("status in ('active', 'suspended')");
    expect(sql).toContain("status in ('active', 'disabled')");
    expect(sql).toContain("external_auth_id");
    expect(sql).not.toContain("clerk_org_id");
  });

  it("test_migrations_noproviderspecificfeatures", () => {
    expect(sql.toLowerCase()).not.toMatch(/nile|tenant_id uuid default|extension/);
  });

  it("test_migrations_numbered_sequentially", () => {
    expect(sqlFiles[0]).toMatch(/^0001_/);
  });
});

describe("MemoryAuthStore contract", () => {
  storeContract(() => Promise.resolve(new MemoryAuthStore()));
});

const url = process.env.DATABASE_URL;

describe.skipIf(url === undefined || url === "")("PgAuthStore contract (DATABASE_URL)", () => {
  const schema = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let admin: pg.Pool;

  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url, max: 1 });
    await admin.query(`create schema ${schema}`);
    const scoped = new pg.Pool({
      connectionString: url,
      max: 1,
      options: `-c search_path=${schema}`,
    });
    await scoped.query(sql);
    await scoped.end();
  });

  afterAll(async () => {
    await admin.query(`drop schema ${schema} cascade`);
    await admin.end();
  });

  // Each test gets a clean slate in the same schema.
  storeContract(async () => {
    await admin.query(
      `truncate ${schema}.sessions, ${schema}.login_tokens, ${schema}.memberships, ${schema}.users, ${schema}.organizations cascade`,
    );
    return PgAuthStore.fromUrl(url ?? "", { options: `-c search_path=${schema}` });
  });
});

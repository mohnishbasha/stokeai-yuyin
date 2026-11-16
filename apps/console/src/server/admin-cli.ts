// Command parsing for `yuyin-admin` (ADR-025). Pure over an AuthStore so it is unit tested;
// scripts/yuyin-admin.ts wires it to Postgres.
import { createOrganization, createUser, issueLoginToken, loginLink } from "../lib/auth/admin";
import { isRole } from "../lib/auth/types";
import type { AuthStore } from "../lib/auth/types";

export const USAGE = `yuyin-admin: operator commands for the Yuyin console

  org create --name <name>
  user create --email <email> --name <name> --org <org-id> --role <owner|admin|developer|billing>
  login-token issue --email <email> [--issued-by <who>] [--console-url <url>]

Reads DATABASE_URL. Prints the one-time token and sign-in link once; only a hash is stored.
`;

function flags(args: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (key === undefined || !key.startsWith("--") || value === undefined) {
      throw new Error(`expected --flag value pairs, got "${key ?? ""}"`);
    }
    out.set(key.slice(2), value);
  }
  return out;
}

function need(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (value === undefined || value.length === 0) {
    throw new Error(`missing --${key}`);
  }
  return value;
}

/** Runs one command and returns the text to print. Throws an Error with a usable message. */
export async function runAdmin(
  store: AuthStore,
  argv: readonly string[],
  env: Record<string, string | undefined>,
  now: Date = new Date(),
): Promise<string> {
  const [group, verb, ...rest] = argv;
  const f = flags(rest);
  if (group === "org" && verb === "create") {
    const org = await createOrganization(store, { name: need(f, "name") }, now);
    return `organization ${org.id} ${org.name}\n`;
  }
  if (group === "user" && verb === "create") {
    const role = need(f, "role");
    if (!isRole(role)) {
      throw new Error("--role must be owner, admin, developer, or billing");
    }
    const user = await createUser(
      store,
      { email: need(f, "email"), name: need(f, "name"), orgId: need(f, "org"), role },
      now,
    );
    return `user ${user.id} ${user.email} ${role}\n`;
  }
  if (group === "login-token" && verb === "issue") {
    const email = need(f, "email").trim().toLowerCase();
    const user = await store.findUserByEmail(email);
    if (user === null) {
      throw new Error(`no user with email ${email}`);
    }
    const issued = await issueLoginToken(
      store,
      { userId: user.id, issuedBy: f.get("issued-by") ?? env.USER ?? "operator" },
      now,
    );
    const origin = f.get("console-url") ?? env.YUYIN_CONSOLE_URL ?? "http://localhost:3000";
    return (
      `token ${issued.token}\nlink ${loginLink(origin, issued.token)}\n` +
      `expires ${issued.expiresAt.toISOString()} (single use)\n`
    );
  }
  throw new Error(USAGE);
}

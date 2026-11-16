// CN-50 at the command layer: yuyin-admin org create, user create, login-token issue.
import { describe, expect, it } from "vitest";
import { MemoryAuthStore } from "../../src/lib/auth/memory-store";
import { sha256 } from "../../src/lib/auth/secrets";
import { runAdmin } from "../../src/server/admin-cli";
import { T0 } from "../support/auth-fixture";

const ENV = { YUYIN_CONSOLE_URL: "https://console.example.test", USER: "ops" };

describe("yuyin-admin", () => {
  it("test_cli_org_user_logintoken_flow_printsonetimetoken", async () => {
    const store = new MemoryAuthStore();
    const orgOut = await runAdmin(store, ["org", "create", "--name", "Acme"], ENV, T0);
    const orgId = /^organization (\S+) Acme$/m.exec(orgOut)?.[1] ?? "";
    expect(orgId).not.toBe("");
    const userOut = await runAdmin(
      store,
      [
        "user",
        "create",
        "--email",
        "A@Example.test",
        "--name",
        "Asha",
        "--org",
        orgId,
        "--role",
        "owner",
      ],
      ENV,
      T0,
    );
    expect(userOut).toContain("a@example.test owner");
    const out = await runAdmin(
      store,
      ["login-token", "issue", "--email", "a@example.test"],
      ENV,
      T0,
    );
    const token = /^token (\S+)$/m.exec(out)?.[1] ?? "";
    expect(out).toContain(`link https://console.example.test/sign-in?token=${token}`);
    expect(out).toContain("2026-11-15T10:15:00.000Z");
    expect(store.loginTokens[0]?.tokenHash.equals(sha256(token))).toBe(true);
    expect(store.loginTokens[0]?.issuedBy).toBe("ops");
  });

  it.each([
    [["org", "create"], /--name/],
    [["org", "create", "--name"], /flag value/],
    [
      ["user", "create", "--email", "a@b.co", "--name", "A", "--org", "x", "--role", "root"],
      /--role/,
    ],
    [["login-token", "issue", "--email", "nobody@example.test"], /no user/],
    [["frobnicate"], /yuyin-admin/],
  ])("test_cli_%j_failswithmessage", async (argv, message) => {
    await expect(runAdmin(new MemoryAuthStore(), argv, ENV, T0)).rejects.toThrow(message);
  });
});

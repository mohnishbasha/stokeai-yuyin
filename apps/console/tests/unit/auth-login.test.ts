// CN-47 security_console_logintoken_reused_rejected, CN-53 unit_console_adminlib_*
import { describe, expect, it } from "vitest";
import { createOrganization, createUser, issueLoginToken } from "../../src/lib/auth/admin";
import { redeemLoginToken } from "../../src/lib/auth/login";
import { MemoryAuthStore } from "../../src/lib/auth/memory-store";
import { sha256 } from "../../src/lib/auth/secrets";
import { seed, T0 } from "../support/auth-fixture";

const MIN = 60 * 1000;

describe("admin library (CN-53)", () => {
  it("test_adminlib_orguserlogintoken_createsrecords", async () => {
    const store = new MemoryAuthStore();
    const org = await createOrganization(store, { name: "  Acme  " }, T0);
    expect(org.name).toBe("Acme");
    expect(org.externalAuthId).toBeNull();
    expect(org.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const user = await createUser(
      store,
      { email: "Asha@Example.test", name: "Asha", orgId: org.id, role: "admin" },
      T0,
    );
    expect(user.email).toBe("asha@example.test");
    expect(store.memberships).toEqual([{ tenantId: org.id, userId: user.id, role: "admin" }]);
    const issued = await issueLoginToken(store, { userId: user.id, issuedBy: "ops" }, T0);
    expect(issued.expiresAt.getTime()).toBe(T0.getTime() + 15 * MIN);
    expect(issued.token).toMatch(/^yylt_[A-Za-z0-9_-]{43}$/);
  });

  it("test_adminlib_invalidinput_rejected", async () => {
    const store = new MemoryAuthStore();
    await expect(createOrganization(store, { name: "  " }, T0)).rejects.toThrow(/name/);
    const org = await createOrganization(store, { name: "Acme" }, T0);
    await expect(
      createUser(store, { email: "not-an-email", name: "A", orgId: org.id, role: "owner" }, T0),
    ).rejects.toThrow(/email/);
    await expect(
      createUser(
        store,
        { email: "a@example.test", name: "A", orgId: org.id, role: "root" as never },
        T0,
      ),
    ).rejects.toThrow(/role/);
    await expect(
      createUser(
        store,
        {
          email: "a@example.test",
          name: "A",
          orgId: "11111111-1111-7111-8111-111111111111",
          role: "owner",
        },
        T0,
      ),
    ).rejects.toThrow(/organization/);
    await expect(
      issueLoginToken(store, { userId: "11111111-1111-7111-8111-111111111111", issuedBy: "x" }, T0),
    ).rejects.toThrow(/user/);
  });

  it("test_adminlib_secondorg_existinguserjoinsbyemail", async () => {
    const { store, user } = await seed("owner");
    const other = await createOrganization(store, { name: "Beta" }, T0);
    const again = await createUser(
      store,
      { email: user.email, name: "Asha", orgId: other.id, role: "billing" },
      T0,
    );
    expect(again.id).toBe(user.id);
    expect(store.memberships).toHaveLength(2);
  });
});

describe("login token (CN-47)", () => {
  it("test_logintoken_storedonlyashash", async () => {
    const { store, token } = await seed();
    expect(store.loginTokens).toHaveLength(1);
    const record = store.loginTokens[0];
    expect(record?.tokenHash.equals(sha256(token))).toBe(true);
    expect(JSON.stringify([...store.loginTokens])).not.toContain(token);
    expect(record?.tokenHash).toHaveLength(32);
  });

  it("test_logintoken_valid_redeemsonce", async () => {
    const { store, user, token } = await seed();
    const redeemed = await redeemLoginToken(store, token, new Date(T0.getTime() + MIN));
    expect(redeemed?.id).toBe(user.id);
  });

  it("test_logintoken_reused_rejected", async () => {
    const { store, token } = await seed();
    expect(await redeemLoginToken(store, token, new Date(T0.getTime() + MIN))).not.toBeNull();
    expect(await redeemLoginToken(store, token, new Date(T0.getTime() + 2 * MIN))).toBeNull();
  });

  it("test_logintoken_concurrentredeem_onlyonewins", async () => {
    const { store, token } = await seed();
    const now = new Date(T0.getTime() + MIN);
    const results = await Promise.all([
      redeemLoginToken(store, token, now),
      redeemLoginToken(store, token, now),
      redeemLoginToken(store, token, now),
    ]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it("test_logintoken_expiredafter15minutes_rejected", async () => {
    const { store, token } = await seed();
    expect(await redeemLoginToken(store, token, new Date(T0.getTime() + 15 * MIN))).toBeNull();
  });

  it("test_logintoken_justbeforeexpiry_accepted", async () => {
    const { store, token } = await seed();
    expect(
      await redeemLoginToken(store, token, new Date(T0.getTime() + 15 * MIN - 1)),
    ).not.toBeNull();
  });

  it.each([
    ["empty", ""],
    ["random", "yylt_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["no prefix", "x"],
    ["sql", "' or 1=1 --"],
  ])("test_logintoken_forged_%s_rejected", async (_name, forged) => {
    const { store } = await seed();
    expect(await redeemLoginToken(store, forged, new Date(T0.getTime() + MIN))).toBeNull();
  });

  it("test_logintoken_alteredcharacter_rejected", async () => {
    const { store, token } = await seed();
    const last = token.endsWith("A") ? "B" : "A";
    const altered = token.slice(0, -1) + last;
    expect(await redeemLoginToken(store, altered, new Date(T0.getTime() + MIN))).toBeNull();
  });

  it("test_logintoken_disableduser_rejected", async () => {
    const { store, user, token } = await seed();
    store.users.set(user.id, { ...user, status: "disabled" });
    expect(await redeemLoginToken(store, token, new Date(T0.getTime() + MIN))).toBeNull();
  });
});

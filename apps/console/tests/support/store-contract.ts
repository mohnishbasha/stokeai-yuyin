// Behaviour every AuthStore must have. Run against the in-memory store always and against
// Postgres when DATABASE_URL is set (CN-49).
import { expect, it } from "vitest";
import { createOrganization, createUser, issueLoginToken } from "../../src/lib/auth/admin";
import { redeemLoginToken } from "../../src/lib/auth/login";
import { createSession, resolveSession } from "../../src/lib/auth/sessions";
import { sha256 } from "../../src/lib/auth/secrets";
import type { AuthStore } from "../../src/lib/auth/types";

const T0 = new Date("2026-11-15T10:00:00.000Z");

export function storeContract(make: () => Promise<AuthStore>): void {
  it("test_store_orguser_membership_roundtrip", async () => {
    const store = await make();
    const b = await createOrganization(store, { name: "Beta" }, T0);
    const a = await createOrganization(store, { name: "Acme" }, T0);
    const user = await createUser(
      store,
      { email: "a@example.test", name: "A", orgId: a.id, role: "owner" },
      T0,
    );
    await createUser(
      store,
      { email: "a@example.test", name: "A", orgId: b.id, role: "billing" },
      T0,
    );
    expect((await store.findUserByEmail("a@example.test"))?.id).toBe(user.id);
    expect((await store.findOrganization(a.id))?.externalAuthId).toBeNull();
    const memberships = await store.membershipsForUser(user.id);
    expect(memberships.map((m) => [m.orgName, m.role])).toEqual([
      ["Acme", "owner"],
      ["Beta", "billing"],
    ]);
  });

  it("test_store_duplicateemail_rejected", async () => {
    const store = await make();
    const org = await createOrganization(store, { name: "Acme" }, T0);
    const user = await createUser(
      store,
      { email: "dup@example.test", name: "A", orgId: org.id, role: "owner" },
      T0,
    );
    await expect(
      store.createUser({ ...user, id: "11111111-1111-7111-8111-111111111111" }),
    ).rejects.toThrow();
  });

  it("test_store_logintoken_singleuse_expiry_hashonly", async () => {
    const store = await make();
    const org = await createOrganization(store, { name: "Acme" }, T0);
    const user = await createUser(
      store,
      { email: "t@example.test", name: "T", orgId: org.id, role: "developer" },
      T0,
    );
    const { token } = await issueLoginToken(store, { userId: user.id, issuedBy: "test" }, T0);
    const now = new Date(T0.getTime() + 60_000);
    const racers = await Promise.all([
      redeemLoginToken(store, token, now),
      redeemLoginToken(store, token, now),
    ]);
    expect(racers.filter((r) => r !== null)).toHaveLength(1);
    expect(await redeemLoginToken(store, token, now)).toBeNull();
    const second = await issueLoginToken(store, { userId: user.id, issuedBy: "test" }, T0);
    expect(
      await redeemLoginToken(store, second.token, new Date(T0.getTime() + 15 * 60_000)),
    ).toBeNull();
  });

  it("test_store_session_lookupbyhash_switch_revoke", async () => {
    const store = await make();
    const a = await createOrganization(store, { name: "Acme" }, T0);
    const b = await createOrganization(store, { name: "Beta" }, T0);
    const user = await createUser(
      store,
      { email: "s@example.test", name: "S", orgId: a.id, role: "owner" },
      T0,
    );
    await createUser(store, { email: "s@example.test", name: "S", orgId: b.id, role: "admin" }, T0);
    const { token, record } = await createSession(store, { userId: user.id, tenantId: a.id }, T0);
    expect((await store.findSessionByHash(sha256(token)))?.id).toBe(record.id);
    expect(await store.findSessionByHash(sha256("other"))).toBeNull();
    await store.setSessionTenant(record.id, b.id);
    expect((await resolveSession(store, token, T0))?.membership.role).toBe("admin");
    await store.revokeSession(record.id, T0);
    expect(await resolveSession(store, token, T0)).toBeNull();
  });
}

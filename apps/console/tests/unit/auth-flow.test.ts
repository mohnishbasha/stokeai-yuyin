// CN-43 e2e_console_loginlink_firstconsoleview_succeeds (integration over route handlers),
// CN-44 and CN-45 at the HTTP layer.
import { describe, expect, it } from "vitest";
import { createOrganization, createUser, loginLink } from "../../src/lib/auth/admin";
import { decideAccess } from "../../src/lib/auth/access";
import { SESSION_COOKIE } from "../../src/lib/auth/cookies";
import { handleSignIn, handleSignOut, handleSwitchOrg } from "../../src/lib/auth/handlers";
import { sha256 } from "../../src/lib/auth/secrets";
import { csrfTokenFor, createSession, resolveSession } from "../../src/lib/auth/sessions";
import { resolveView } from "../../src/lib/auth/view";
import { ORIGIN, T0, cookieFrom, formRequest, seed, testConfig } from "../support/auth-fixture";

const MIN = 60 * 1000;
const config = testConfig();

function deps(store: Awaited<ReturnType<typeof seed>>["store"], at: Date = T0) {
  return { store, config, now: () => at };
}

describe("e2e_console_loginlink_firstconsoleview_succeeds (CN-43)", () => {
  it("test_e2e_loginlink_to_firstconsoleview", async () => {
    const { store, org, user, token } = await seed("developer");
    const link = loginLink(ORIGIN, token);
    expect(link).toBe(`${ORIGIN}/sign-in?token=${token}`);

    // 1. Unauthenticated visit to the console is redirected to sign-in.
    expect(decideAccess("/dashboard", false)).toEqual({ action: "redirect", to: "/sign-in" });

    // 2. The operator-issued token is redeemed through the sign-in handler.
    const at = new Date(T0.getTime() + 5 * MIN);
    const response = await handleSignIn(
      formRequest("/api/auth/sign-in", { token }),
      deps(store, at),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toMatch(/Max-Age=28800/);
    expect(setCookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);

    // 3. With the cookie, the proxy passes and the first console view resolves.
    const cookie = cookieFrom(response);
    expect(decideAccess("/dashboard", true)).toEqual({ action: "next" });
    const view = await resolveView(store, config, cookie, at);
    expect(view?.user.id).toBe(user.id);
    expect(view?.org.id).toBe(org.id);
    expect(view?.role).toBe("developer");
    expect(view?.memberships.map((m) => m.orgName)).toEqual(["Acme"]);

    // Session token is stored only as a hash.
    const raw = cookie.slice(SESSION_COOKIE.length + 1);
    expect([...store.sessions.values()][0]?.tokenHash.equals(sha256(raw))).toBe(true);
  });

  it("test_signin_userwithoutactivemembership_rejected", async () => {
    const store = (await seed()).store;
    const orphanOrg = await createOrganization(store, { name: "Zed" }, T0);
    const user = await createUser(
      store,
      { email: "z@example.test", name: "Z", orgId: orphanOrg.id, role: "owner" },
      T0,
    );
    store.organizations.set(orphanOrg.id, { ...orphanOrg, status: "suspended" });
    const { issueLoginToken } = await import("../../src/lib/auth/admin");
    const { token } = await issueLoginToken(store, { userId: user.id, issuedBy: "t" }, T0);
    const response = await handleSignIn(formRequest("/api/auth/sign-in", { token }), deps(store));
    expect(response.headers.get("location")).toBe("/sign-in?error=invalid");
    expect(store.sessions.size).toBe(0);
  });
});

describe("security_console_logintoken_reused_rejected (CN-44, HTTP)", () => {
  it("test_signin_tokenreused_rejectedwithgenericerror_nosession", async () => {
    const { store, token } = await seed();
    const first = await handleSignIn(formRequest("/api/auth/sign-in", { token }), deps(store));
    expect(first.headers.get("set-cookie")).not.toBeNull();
    const second = await handleSignIn(formRequest("/api/auth/sign-in", { token }), deps(store));
    expect(second.status).toBe(303);
    expect(second.headers.get("location")).toBe("/sign-in?error=invalid");
    expect(second.headers.get("set-cookie")).toBeNull();
    expect(store.sessions.size).toBe(1);
  });

  it("test_signin_tokenexpired_rejected", async () => {
    const { store, token } = await seed();
    const late = new Date(T0.getTime() + 16 * MIN);
    const response = await handleSignIn(
      formRequest("/api/auth/sign-in", { token }),
      deps(store, late),
    );
    expect(response.headers.get("location")).toBe("/sign-in?error=invalid");
    expect(store.sessions.size).toBe(0);
  });

  it("test_signin_tokenforged_rejected_sameerrorasexpired", async () => {
    const { store } = await seed();
    const response = await handleSignIn(
      formRequest("/api/auth/sign-in", { token: "yylt_forged" }),
      deps(store),
    );
    expect(response.headers.get("location")).toBe("/sign-in?error=invalid");
    expect(store.sessions.size).toBe(0);
  });

  it("test_signin_missingtoken_rejected", async () => {
    const { store } = await seed();
    const response = await handleSignIn(formRequest("/api/auth/sign-in", {}), deps(store));
    expect(response.headers.get("location")).toBe("/sign-in?error=invalid");
  });

  it("test_signin_crossoriginpost_rejected_tokennotburned", async () => {
    const { store, token } = await seed();
    const evil = formRequest(
      "/api/auth/sign-in",
      { token },
      { origin: "https://evil.example.test" },
    );
    expect((await handleSignIn(evil, deps(store))).status).toBe(403);
    const noOrigin = new Request(`${ORIGIN}/api/auth/sign-in`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `token=${token}`,
    });
    expect((await handleSignIn(noOrigin, deps(store))).status).toBe(403);
    const ok = await handleSignIn(formRequest("/api/auth/sign-in", { token }), deps(store));
    expect(ok.status).toBe(303);
    expect(ok.headers.get("set-cookie")).not.toBeNull();
  });
});

async function signedIn() {
  const ctx = await seed("owner");
  const response = await handleSignIn(
    formRequest("/api/auth/sign-in", { token: ctx.token }),
    deps(ctx.store),
  );
  const cookie = cookieFrom(response);
  const view = await resolveView(ctx.store, config, cookie, T0);
  if (view === null) {
    throw new Error("expected a view");
  }
  return { ...ctx, cookie, view };
}

describe("security_console_mutation_missingcsrf_rejected (CN-45)", () => {
  it("test_switchorg_missingcsrf_rejected_noeffect", async () => {
    const { store, user, cookie, view } = await signedIn();
    const other = await createOrganization(store, { name: "Beta" }, T0);
    await store.addMembership({ tenantId: other.id, userId: user.id, role: "billing" });
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: other.id }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(403);
    expect((await resolveView(store, config, cookie, T0))?.org.id).toBe(view.org.id);
  });

  it("test_switchorg_wrongcsrf_rejected", async () => {
    const { store, user, cookie } = await signedIn();
    const other = await createOrganization(store, { name: "Beta" }, T0);
    await store.addMembership({ tenantId: other.id, userId: user.id, role: "billing" });
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: other.id, csrf: "nope" }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(403);
  });

  it("test_switchorg_csrfofanothersession_rejected", async () => {
    const { store, user, org, cookie } = await signedIn();
    const other = await createOrganization(store, { name: "Beta" }, T0);
    await store.addMembership({ tenantId: other.id, userId: user.id, role: "billing" });
    const second = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    const foreign = csrfTokenFor(second.record, config);
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: other.id, csrf: foreign }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(403);
  });

  it("test_switchorg_crossorigin_rejectedeveniftokenvalid", async () => {
    const { store, user, cookie, view } = await signedIn();
    const other = await createOrganization(store, { name: "Beta" }, T0);
    await store.addMembership({ tenantId: other.id, userId: user.id, role: "billing" });
    const response = await handleSwitchOrg(
      formRequest(
        "/api/org/switch",
        { tenant_id: other.id, csrf: view.csrf },
        { cookie, origin: "https://evil.example.test" },
      ),
      deps(store),
    );
    expect(response.status).toBe(403);
  });

  it("test_switchorg_withoutsession_unauthorized", async () => {
    const { store } = await seed();
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: "x", csrf: "y" }),
      deps(store),
    );
    expect(response.status).toBe(401);
  });

  it("test_switchorg_headertoken_accepted_andswitches", async () => {
    const { store, user, cookie, view } = await signedIn();
    const other = await createOrganization(store, { name: "Beta" }, T0);
    await store.addMembership({ tenantId: other.id, userId: user.id, role: "billing" });
    const response = await handleSwitchOrg(
      formRequest(
        "/api/org/switch",
        { tenant_id: other.id },
        { cookie, "x-csrf-token": view.csrf },
      ),
      deps(store),
    );
    expect(response.status).toBe(303);
    const after = await resolveView(store, config, cookie, T0);
    expect(after?.org.id).toBe(other.id);
    expect(after?.role).toBe("billing");
    expect(after?.csrf).toBe(view.csrf);
  });

  it("test_switchorg_notamember_forbidden_nochange", async () => {
    const { store, cookie, view } = await signedIn();
    const stranger = await createOrganization(store, { name: "Stranger" }, T0);
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: stranger.id, csrf: view.csrf }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(403);
    expect((await resolveView(store, config, cookie, T0))?.org.id).toBe(view.org.id);
  });

  it("test_switchorg_invalidtenantid_badrequest", async () => {
    const { store, cookie, view } = await signedIn();
    const response = await handleSwitchOrg(
      formRequest("/api/org/switch", { tenant_id: "not-a-uuid", csrf: view.csrf }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(400);
  });

  it("test_signout_missingcsrf_rejected_sessionsurvives", async () => {
    const { store, cookie } = await signedIn();
    const response = await handleSignOut(
      formRequest("/api/auth/sign-out", {}, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(403);
    expect(await resolveView(store, config, cookie, T0)).not.toBeNull();
  });

  it("test_signout_validcsrf_revokesandclearscookie", async () => {
    const { store, cookie, view } = await signedIn();
    const response = await handleSignOut(
      formRequest("/api/auth/sign-out", { csrf: view.csrf }, { cookie }),
      deps(store),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/sign-in");
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect(await resolveView(store, config, cookie, T0)).toBeNull();
  });
});

describe("session resolution", () => {
  it("test_session_expired_notresolved", async () => {
    const { store, org, user } = await seed();
    const { token } = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    const late = new Date(T0.getTime() + 8 * 60 * MIN + 1);
    expect(await resolveSession(store, token, late)).toBeNull();
  });

  it("test_session_unknownorempty_notresolved", async () => {
    const { store } = await seed();
    expect(await resolveSession(store, "nope", T0)).toBeNull();
    expect(await resolveSession(store, "", T0)).toBeNull();
  });

  it("test_session_membershipremoved_notresolved", async () => {
    const { store, org, user } = await seed();
    const { token } = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    store.memberships.length = 0;
    expect(await resolveSession(store, token, T0)).toBeNull();
  });

  it("test_session_disableduser_notresolved", async () => {
    const { store, org, user } = await seed();
    const { token } = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    store.users.set(user.id, { ...user, status: "disabled" });
    expect(await resolveSession(store, token, T0)).toBeNull();
  });

  it("test_session_view_nocookie_null", async () => {
    const { store } = await seed();
    expect(await resolveView(store, config, null, T0)).toBeNull();
  });
});

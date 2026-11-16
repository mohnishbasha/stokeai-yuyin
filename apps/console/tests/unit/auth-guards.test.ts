// CN-46 security_console_operatorroute_nonallowlisted_denied, CN-47
// security_console_middleware_unauthenticated_redirects, CN-48 unit_console_roles_matrix_*
import { describe, expect, it } from "vitest";
import { decideAccess } from "../../src/lib/auth/access";
import { readAuthConfig } from "../../src/lib/auth/config";
import { SESSION_COOKIE, parseCookies } from "../../src/lib/auth/cookies";
import { isOperator, parseOperatorIds } from "../../src/lib/auth/operator";
import { can } from "../../src/lib/auth/roles";
import { ROLES } from "../../src/lib/auth/types";
import { authorizeOperator, resolveView } from "../../src/lib/auth/view";
import { createSession } from "../../src/lib/auth/sessions";
import { seed, testConfig, T0 } from "../support/auth-fixture";

describe("proxy rules (CN-47)", () => {
  it.each(["/dashboard", "/dashboard/keys", "/operator", "/operator/orgs/1"])(
    "test_proxy_%s_withoutsession_redirectstosignin",
    (path) => {
      expect(decideAccess(path, false)).toEqual({ action: "redirect", to: "/sign-in" });
    },
  );

  it.each(["/dashboard", "/operator"])("test_proxy_%s_withsession_passes", (path) => {
    expect(decideAccess(path, true)).toEqual({ action: "next" });
  });

  it.each(["/", "/sign-in", "/healthz", "/api/auth/sign-in", "/dashboardx", "/operators"])(
    "test_proxy_%s_public_passes",
    (path) => {
      expect(decideAccess(path, false)).toEqual({ action: "next" });
    },
  );

  it("test_proxy_encodedtraversal_stillprotected", () => {
    expect(decideAccess("/Dashboard", false).action).toBe("redirect");
    expect(decideAccess("//operator", false).action).toBe("redirect");
    expect(decideAccess("/dashboard/", false).action).toBe("redirect");
  });
});

describe("operator allowlist (CN-46)", () => {
  it("test_operator_unsetallowlist_deniesall", () => {
    expect(isOperator("abc", parseOperatorIds(undefined))).toBe(false);
    expect(isOperator("abc", parseOperatorIds(" , ,"))).toBe(false);
  });

  it("test_operator_listed_allowed_caseinsensitive", () => {
    const list = parseOperatorIds("AAA, bbb  ccc");
    expect(isOperator("aaa", list)).toBe(true);
    expect(isOperator("BBB", list)).toBe(true);
    expect(isOperator("ddd", list)).toBe(false);
  });

  it("test_operator_nonallowlisteduser_denied", async () => {
    const { store, org, user } = await seed("owner");
    const { token } = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    const config = testConfig(["22222222-2222-7222-8222-222222222222"]);
    const view = await resolveView(store, config, `${SESSION_COOKIE}=${token}`, T0);
    expect(view).not.toBeNull();
    expect(authorizeOperator(view, config)).toBe("denied");
  });

  it("test_operator_allowlisteduser_allowed", async () => {
    const { store, org, user } = await seed("owner");
    const { token } = await createSession(store, { userId: user.id, tenantId: org.id }, T0);
    const config = testConfig([user.id]);
    const view = await resolveView(store, config, `${SESSION_COOKIE}=${token}`, T0);
    expect(authorizeOperator(view, config)).toBe("allowed");
  });

  it("test_operator_anonymous_unauthenticated", () => {
    expect(authorizeOperator(null, testConfig(["x"]))).toBe("unauthenticated");
  });
});

describe("roles (CN-48)", () => {
  it("test_roles_four_exactly", () => {
    expect([...ROLES]).toEqual(["owner", "admin", "developer", "billing"]);
  });

  it("test_roles_billing_cannotcreatekeys", () => {
    expect(can("billing", "keys.manage")).toBe(false);
    expect(can("billing", "billing.topup")).toBe(true);
  });

  it("test_roles_developer_cannottopup", () => {
    expect(can("developer", "billing.topup")).toBe(false);
    expect(can("developer", "keys.manage")).toBe(true);
  });

  it("test_roles_ownerandadmin_canmanagemembers_othersnot", () => {
    expect(can("owner", "members.manage")).toBe(true);
    expect(can("admin", "members.manage")).toBe(true);
    expect(can("developer", "members.manage")).toBe(false);
    expect(can("billing", "members.manage")).toBe(false);
  });
});

describe("config and cookies", () => {
  it("test_config_missingsecret_refusedinprod", () => {
    expect(() => readAuthConfig({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
    expect(() => readAuthConfig({ NODE_ENV: "production", SESSION_SECRET: "short" })).toThrow();
  });

  it("test_config_dev_usesdevsecret_andparsesenv", () => {
    const config = readAuthConfig({
      YUYIN_ENV: "dev",
      OPERATOR_USER_IDS: "a,b",
      YUYIN_CONSOLE_URL: "http://localhost:3000/x",
    });
    expect(config.operatorIds.has("a")).toBe(true);
    expect(config.consoleOrigin).toBe("http://localhost:3000");
    expect(config.sessionSecret.length).toBeGreaterThanOrEqual(32);
    const prod = readAuthConfig({ NODE_ENV: "production", SESSION_SECRET: "s".repeat(40) });
    expect(prod.sessionSecret).toBe("s".repeat(40));
    expect(prod.consoleOrigin).toBeNull();
  });

  it("test_cookies_parse_handlesspacesandmissing", () => {
    expect(parseCookies("a=1; b=2;c=3")).toEqual({ a: "1", b: "2", c: "3" });
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies("junk")).toEqual({});
  });
});

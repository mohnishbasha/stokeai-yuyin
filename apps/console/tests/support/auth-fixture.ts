// Shared fixture for the auth tests: an in-memory store with one organization per role.
import { createOrganization, createUser, issueLoginToken } from "../../src/lib/auth/admin";
import type { AuthConfig } from "../../src/lib/auth/config";
import { MemoryAuthStore } from "../../src/lib/auth/memory-store";
import type { Role } from "../../src/lib/auth/types";

export const ORIGIN = "https://console.example.test";
export const T0 = new Date("2026-11-15T10:00:00.000Z");

export function testConfig(operatorIds: string[] = []): AuthConfig {
  return {
    sessionSecret: "test-session-secret-0123456789abcdef0123",
    operatorIds: new Set(operatorIds),
    consoleOrigin: ORIGIN,
  };
}

export async function seed(role: Role = "owner", email = "asha@example.test") {
  const store = new MemoryAuthStore();
  const org = await createOrganization(store, { name: "Acme" }, T0);
  const user = await createUser(store, { email, name: "Asha", orgId: org.id, role }, T0);
  const { token } = await issueLoginToken(store, { userId: user.id, issuedBy: "test" }, T0);
  return { store, org, user, token };
}

export function formRequest(
  path: string,
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}

/** Extracts `name=value` of the session cookie from a Set-Cookie header for reuse as Cookie. */
export function cookieFrom(response: Response): string {
  const raw = response.headers.get("set-cookie") ?? "";
  return raw.split(";")[0] ?? "";
}

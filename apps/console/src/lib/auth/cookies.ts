import { SESSION_TTL_SECONDS } from "./config";

/** The `__Host-` prefix forces Secure, Path=/ and no Domain, so the cookie cannot be shadowed. */
export const SESSION_COOKIE = "__Host-yuyin-session";

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      out[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    }
  }
  return out;
}

const ATTRIBUTES = "Path=/; HttpOnly; Secure; SameSite=Lax";

export function sessionSetCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${ATTRIBUTES}; Max-Age=${String(SESSION_TTL_SECONDS)}`;
}

export function sessionClearCookie(): string {
  return `${SESSION_COOKIE}=; ${ATTRIBUTES}; Max-Age=0`;
}

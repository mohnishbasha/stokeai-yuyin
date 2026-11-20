import { randomBytes } from "node:crypto";
import { FRESH_SESSION_SECONDS, SESSION_TTL_SECONDS } from "./config";
import type { AuthConfig } from "./config";
import { uuidv7 } from "./ids";
import { generateSecret, hmacSha256, safeEqual, sha256 } from "./secrets";
import type { AuthStore, MembershipWithOrg, SessionRecord, User } from "./types";

export interface CreatedSession {
  /** The raw cookie value. Only its SHA-256 hash is stored. */
  readonly token: string;
  readonly record: SessionRecord;
}

export async function createSession(
  store: AuthStore,
  input: { userId: string; tenantId: string },
  now: Date = new Date(),
): Promise<CreatedSession> {
  const token = generateSecret("yyss");
  const record: SessionRecord = {
    id: uuidv7(now),
    userId: input.userId,
    tenantId: input.tenantId,
    tokenHash: sha256(token),
    csrfSecret: randomBytes(32),
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
    revokedAt: null,
    createdAt: now,
  };
  await store.insertSession(record);
  return { token, record };
}

export interface ResolvedSession {
  readonly session: SessionRecord;
  readonly user: User;
  /** The membership for the session's current organization. */
  readonly membership: MembershipWithOrg;
}

/**
 * Resolves a cookie value to a live session. Null when the cookie is unknown, expired, revoked,
 * the user is disabled, or the user no longer has an active membership in the session's
 * organization.
 */
export async function resolveSession(
  store: AuthStore,
  rawToken: string,
  now: Date,
): Promise<ResolvedSession | null> {
  if (rawToken.length === 0 || rawToken.length > 256) {
    return null;
  }
  const session = await store.findSessionByHash(sha256(rawToken));
  if (session === null || session.revokedAt !== null || session.expiresAt <= now) {
    return null;
  }
  const user = await store.findUserById(session.userId);
  if (user === null || user.status !== "active") {
    return null;
  }
  const memberships = await store.membershipsForUser(user.id);
  const membership = memberships.find(
    (m) => m.tenantId === session.tenantId && m.orgStatus === "active",
  );
  return membership === undefined ? null : { session, user, membership };
}

/** The CSRF token for a session: an HMAC of its per-session secret under SESSION_SECRET. */
export function csrfTokenFor(session: SessionRecord, config: AuthConfig): string {
  return hmacSha256(config.sessionSecret, session.csrfSecret).toString("base64url");
}

export function verifyCsrf(session: SessionRecord, config: AuthConfig, presented: string): boolean {
  return presented.length > 0 && safeEqual(csrfTokenFor(session, config), presented);
}

/** Operator credit and suspension actions need a session created in the last 15 minutes. */
export function isFreshSession(session: SessionRecord, now: Date): boolean {
  return now.getTime() - session.createdAt.getTime() <= FRESH_SESSION_SECONDS * 1000;
}

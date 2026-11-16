import { LOGIN_TOKEN_TTL_SECONDS } from "./config";
import { uuidv7 } from "./ids";
import { generateSecret, sha256 } from "./secrets";
import type { AuthStore, User } from "./types";

export interface IssuedLoginToken {
  /** The raw token. Shown once to the operator; only its SHA-256 hash is stored. */
  readonly token: string;
  readonly expiresAt: Date;
}

/** Issues a single-use login token for a user, valid for 15 minutes (ADR-025). */
export async function issueLoginToken(
  store: AuthStore,
  input: { userId: string; issuedBy: string },
  now: Date = new Date(),
): Promise<IssuedLoginToken> {
  const user = await store.findUserById(input.userId);
  if (user === null) {
    throw new Error("user not found");
  }
  const token = generateSecret("yylt");
  const expiresAt = new Date(now.getTime() + LOGIN_TOKEN_TTL_SECONDS * 1000);
  await store.insertLoginToken({
    id: uuidv7(now),
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt,
    usedAt: null,
    issuedBy: input.issuedBy,
  });
  return { token, expiresAt };
}

/**
 * Redeems a login token. Returns the user, or null for a reused, expired, forged, or unknown
 * token, or a disabled user. The caller must not reveal which of those it was.
 */
export async function redeemLoginToken(
  store: AuthStore,
  rawToken: string,
  now: Date,
): Promise<User | null> {
  if (rawToken.length === 0 || rawToken.length > 256) {
    return null;
  }
  const record = await store.consumeLoginToken(sha256(rawToken), now);
  if (record === null) {
    return null;
  }
  const user = await store.findUserById(record.userId);
  return user !== null && user.status === "active" ? user : null;
}

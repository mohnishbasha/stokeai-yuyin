import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** A random URL-safe secret with a readable prefix. 256 bits of entropy. */
export function generateSecret(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

/** SHA-256 of a secret. Login tokens and session tokens are stored only in this form. */
export function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function hmacSha256(key: string, data: Buffer): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/** Constant-time string comparison that tolerates different lengths. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

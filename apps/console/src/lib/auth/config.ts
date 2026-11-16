import { parseOperatorIds } from "./operator";

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const LOGIN_TOKEN_TTL_SECONDS = 15 * 60;
/** Operator credit and suspension actions need a session no older than this. */
export const FRESH_SESSION_SECONDS = 15 * 60;

export interface AuthConfig {
  readonly sessionSecret: string;
  readonly operatorIds: ReadonlySet<string>;
  /** Public origin of the console, used for the Origin check and for login links. */
  readonly consoleOrigin: string | null;
}

const DEV_SECRET = "yuyin-dev-session-secret-not-for-production";

/** Reads auth settings. A missing SESSION_SECRET is refused outside development and test. */
export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const secret = env.SESSION_SECRET;
  const isDev =
    env.YUYIN_ENV === "dev" || env.NODE_ENV === "development" || env.NODE_ENV === "test";
  const valid = secret !== undefined && secret.length >= 32;
  if (!valid && !isDev) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  const origin = env.YUYIN_CONSOLE_URL;
  return {
    sessionSecret: valid ? secret : DEV_SECRET,
    operatorIds: parseOperatorIds(env.OPERATOR_USER_IDS),
    consoleOrigin: origin !== undefined && origin.length > 0 ? new URL(origin).origin : null,
  };
}

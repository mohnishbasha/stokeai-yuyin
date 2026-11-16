// Process-wide wiring for the Next server: the store, the config, and the signed-in view.
import { cookies } from "next/headers";
import { readAuthConfig } from "../lib/auth/config";
import type { AuthConfig } from "../lib/auth/config";
import { SESSION_COOKIE } from "../lib/auth/cookies";
import type { HandlerDeps } from "../lib/auth/handlers";
import { resolveView } from "../lib/auth/view";
import type { ConsoleView } from "../lib/auth/view";
import type { AuthStore } from "../lib/auth/types";
import { PgAuthStore } from "./pg-store";

let store: AuthStore | null = null;
let config: AuthConfig | null = null;

/** Tests replace the store; production uses DATABASE_URL (ADR-024). */
export function setAuthStoreForTests(replacement: AuthStore | null): void {
  store = replacement;
}

export function authStore(): AuthStore {
  if (store === null) {
    const url = process.env.DATABASE_URL;
    if (url === undefined || url.length === 0) {
      throw new Error("DATABASE_URL is not set");
    }
    store = PgAuthStore.fromUrl(url);
  }
  return store;
}

export function authConfig(): AuthConfig {
  config ??= readAuthConfig(process.env);
  return config;
}

export function handlerDeps(): HandlerDeps {
  return { store: authStore(), config: authConfig(), now: () => new Date() };
}

/** The signed-in view for the current request, or null. Used by the protected layouts. */
export async function currentView(): Promise<ConsoleView | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (value === undefined) {
    return null;
  }
  return resolveView(authStore(), authConfig(), `${SESSION_COOKIE}=${value}`, new Date());
}

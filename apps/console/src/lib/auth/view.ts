import type { AuthConfig } from "./config";
import { SESSION_COOKIE, parseCookies } from "./cookies";
import { isOperator } from "./operator";
import { csrfTokenFor, resolveSession } from "./sessions";
import type { AuthStore, MembershipWithOrg, Role, SessionRecord, User } from "./types";

/** What a signed-in page needs: who, which organization, which role, and the CSRF token. */
export interface ConsoleView {
  readonly session: SessionRecord;
  readonly user: User;
  readonly org: { readonly id: string; readonly name: string };
  readonly role: Role;
  readonly memberships: readonly MembershipWithOrg[];
  readonly csrf: string;
}

/** Resolves the first console view from a Cookie header, or null when not signed in. */
export async function resolveView(
  store: AuthStore,
  config: AuthConfig,
  cookieHeader: string | null,
  now: Date,
): Promise<ConsoleView | null> {
  const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (raw === undefined) {
    return null;
  }
  const resolved = await resolveSession(store, raw, now);
  if (resolved === null) {
    return null;
  }
  return {
    session: resolved.session,
    user: resolved.user,
    org: { id: resolved.membership.tenantId, name: resolved.membership.orgName },
    role: resolved.membership.role,
    memberships: (await store.membershipsForUser(resolved.user.id)).filter(
      (m) => m.orgStatus === "active",
    ),
    csrf: csrfTokenFor(resolved.session, config),
  };
}

export type OperatorDecision = "allowed" | "denied" | "unauthenticated";

/** Guard for the `(operator)` routes: signed in and on the OPERATOR_USER_IDS allowlist. */
export function authorizeOperator(view: ConsoleView | null, config: AuthConfig): OperatorDecision {
  if (view === null) {
    return "unauthenticated";
  }
  return isOperator(view.user.id, config.operatorIds) ? "allowed" : "denied";
}

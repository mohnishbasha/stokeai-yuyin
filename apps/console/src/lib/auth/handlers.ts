// Mutating auth endpoints as plain Request -> Response functions, so tests drive them without a
// server and the Next route files stay thin. Every mutation checks the Origin header; every
// mutation after sign-in also needs the session's CSRF token (form field `csrf` or the
// `x-csrf-token` header). Sign-in has no session yet, so its guard is the Origin check plus the
// unguessable token itself.
import type { AuthConfig } from "./config";
import { SESSION_COOKIE, parseCookies, sessionClearCookie, sessionSetCookie } from "./cookies";
import { isUuid } from "./ids";
import { redeemLoginToken } from "./login";
import { createSession, resolveSession, verifyCsrf } from "./sessions";
import type { ResolvedSession } from "./sessions";
import type { AuthStore } from "./types";

export interface HandlerDeps {
  readonly store: AuthStore;
  readonly config: AuthConfig;
  readonly now: () => Date;
}

function redirect(location: string, setCookie?: string): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (setCookie !== undefined) {
    headers.append("set-cookie", setCookie);
  }
  return new Response(null, { status: 303, headers });
}

function problem(status: number, code: string): Response {
  return Response.json({ error: { code } }, { status, headers: { "cache-control": "no-store" } });
}

/** True when the Origin header names this console. A missing Origin fails: browsers send it on POST. */
function sameOrigin(request: Request, config: AuthConfig): boolean {
  const expected = config.consoleOrigin ?? new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}

async function readForm(request: Request): Promise<URLSearchParams> {
  try {
    return new URLSearchParams(await request.text());
  } catch {
    return new URLSearchParams();
  }
}

type Authed =
  | { readonly ok: true; readonly resolved: ResolvedSession; readonly form: URLSearchParams }
  | { readonly ok: false; readonly response: Response };

/** Common gate for mutations after sign-in: Origin, live session, CSRF token. */
async function authenticateMutation(request: Request, deps: HandlerDeps): Promise<Authed> {
  if (!sameOrigin(request, deps.config)) {
    return { ok: false, response: problem(403, "csrf_invalid") };
  }
  const raw = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  const resolved = raw === undefined ? null : await resolveSession(deps.store, raw, deps.now());
  if (resolved === null) {
    return { ok: false, response: problem(401, "unauthenticated") };
  }
  const form = await readForm(request);
  const presented = request.headers.get("x-csrf-token") ?? form.get("csrf") ?? "";
  if (!verifyCsrf(resolved.session, deps.config, presented)) {
    return { ok: false, response: problem(403, "csrf_invalid") };
  }
  return { ok: true, resolved, form };
}

const SIGN_IN_FAILED = "/sign-in?error=invalid";

/** POST /api/auth/sign-in: redeem a login token and start a session. */
export async function handleSignIn(request: Request, deps: HandlerDeps): Promise<Response> {
  if (!sameOrigin(request, deps.config)) {
    return problem(403, "csrf_invalid");
  }
  const form = await readForm(request);
  const now = deps.now();
  const user = await redeemLoginToken(deps.store, form.get("token") ?? "", now);
  if (user === null) {
    return redirect(SIGN_IN_FAILED);
  }
  const memberships = await deps.store.membershipsForUser(user.id);
  const first = memberships.find((m) => m.orgStatus === "active");
  if (first === undefined) {
    return redirect(SIGN_IN_FAILED);
  }
  const { token } = await createSession(
    deps.store,
    { userId: user.id, tenantId: first.tenantId },
    now,
  );
  return redirect("/dashboard", sessionSetCookie(token));
}

/** POST /api/auth/sign-out: revoke the session and clear the cookie. */
export async function handleSignOut(request: Request, deps: HandlerDeps): Promise<Response> {
  const authed = await authenticateMutation(request, deps);
  if (!authed.ok) {
    return authed.response;
  }
  await deps.store.revokeSession(authed.resolved.session.id, deps.now());
  return redirect("/sign-in", sessionClearCookie());
}

/** POST /api/org/switch: move the session to another organization the user belongs to. */
export async function handleSwitchOrg(request: Request, deps: HandlerDeps): Promise<Response> {
  const authed = await authenticateMutation(request, deps);
  if (!authed.ok) {
    return authed.response;
  }
  const tenantId = authed.form.get("tenant_id");
  if (!isUuid(tenantId)) {
    return problem(400, "invalid_request");
  }
  const memberships = await deps.store.membershipsForUser(authed.resolved.user.id);
  const target = memberships.find((m) => m.tenantId === tenantId && m.orgStatus === "active");
  if (target === undefined) {
    return problem(403, "forbidden");
  }
  await deps.store.setSessionTenant(authed.resolved.session.id, tenantId);
  return redirect("/dashboard");
}

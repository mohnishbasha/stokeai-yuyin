export type AccessDecision =
  { readonly action: "next" } | { readonly action: "redirect"; readonly to: string };

const PROTECTED_PREFIXES = ["/dashboard", "/operator"] as const;

/** True for the paths served by the `(console)` and `(operator)` route groups. */
export function isProtectedPath(pathname: string): boolean {
  const path = pathname
    .replace(/\/{2,}/g, "/")
    .toLowerCase()
    .replace(/\/+$/, "");
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Optimistic gate used by the Next.js proxy (the Next 16 name for middleware): a protected path
 * without a session cookie goes to sign-in. The cookie is only checked for presence here. Every
 * protected layout validates the session on the server, so a forged cookie gets no content.
 */
export function decideAccess(pathname: string, hasSessionCookie: boolean): AccessDecision {
  if (isProtectedPath(pathname) && !hasSessionCookie) {
    return { action: "redirect", to: "/sign-in" };
  }
  return { action: "next" };
}

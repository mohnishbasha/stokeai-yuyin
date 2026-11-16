// Next 16 renamed middleware to proxy. Redirects unauthenticated requests for the (console) and
// (operator) route groups to /sign-in. Presence check only; the layouts validate the session.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decideAccess } from "./lib/auth/access";
import { SESSION_COOKIE } from "./lib/auth/cookies";

export function proxy(request: NextRequest): NextResponse {
  const decision = decideAccess(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE));
  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/operator/:path*"],
};

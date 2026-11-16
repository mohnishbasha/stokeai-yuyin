import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OrgSwitcher } from "../../components/OrgSwitcher";
import { authorizeOperator } from "../../lib/auth/view";
import { authConfig, currentView } from "../../server/runtime";

// Operator frame. Access is the OPERATOR_USER_IDS allowlist, checked on the server. A signed-in
// user who is not on the list gets a 404, so the operator surface is not advertised.
export const dynamic = "force-dynamic";

export default async function OperatorLayout({ children }: { children: ReactNode }) {
  const view = await currentView();
  const decision = authorizeOperator(view, authConfig());
  if (decision === "unauthenticated" || view === null) {
    redirect("/sign-in");
  }
  if (decision === "denied") {
    notFound();
  }
  return (
    <div className="min-h-screen bg-bg-0">
      <OrgSwitcher view={view} />
      {children}
    </div>
  );
}

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OrgSwitcher } from "../../components/OrgSwitcher";
import { currentView } from "../../server/runtime";

// Console frame. The proxy only checks that a cookie exists; this layout validates the session
// on the server for every request. The sidebar and banner slot arrive with S2-T02 and S2-T05.
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const view = await currentView();
  if (view === null) {
    redirect("/sign-in");
  }
  return (
    <div className="min-h-screen bg-bg-0">
      <OrgSwitcher view={view} />
      {children}
    </div>
  );
}

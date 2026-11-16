import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ConsoleNav } from "../../components/ConsoleNav";
import { OrgSwitcher } from "../../components/OrgSwitcher";
import { ToastProvider } from "../../components/ui/Toast";
import { currentView } from "../../server/runtime";

// Console frame. The proxy only checks that a cookie exists; this layout validates the session
// on the server for every request, then renders the account bar, the navigation, and the screen.
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const view = await currentView();
  if (view === null) {
    redirect("/sign-in");
  }
  return (
    <div className="min-h-screen bg-bg-0">
      <OrgSwitcher view={view} />
      <ConsoleNav />
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}

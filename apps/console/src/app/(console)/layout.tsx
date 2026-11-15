import type { ReactNode } from "react";

// Console frame. The sidebar, banner slot, and sign-in guard arrive with S2-T02, S2-T04, S2-T05.
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-bg-0">{children}</div>;
}

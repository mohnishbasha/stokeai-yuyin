import type { ReactNode } from "react";

// Operator frame. The allowlist and fresh-session checks arrive with S2-T04.
export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-bg-0">{children}</div>;
}

"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

/** Binds the sidebar to the current route. */
export function SidebarNav() {
  return <Sidebar currentPath={usePathname()} />;
}

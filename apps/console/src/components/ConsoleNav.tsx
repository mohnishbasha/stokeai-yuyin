"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CONSOLE_NAV_ITEMS } from "../lib/screens";
import { t } from "../lib/messages";
import { AppNav } from "./ui/AppNav";

/** The console navigation: every screen in the registry, with the current one marked. */
export function ConsoleNav({ orgSwitcher }: { readonly orgSwitcher?: ReactNode }) {
  const pathname = usePathname();
  return (
    <AppNav
      label={t("nav.console")}
      items={CONSOLE_NAV_ITEMS.map((item) => ({ href: item.href, label: t(item.labelKey) }))}
      currentHref={pathname}
      {...(orgSwitcher !== undefined ? { orgSwitcher } : {})}
    />
  );
}

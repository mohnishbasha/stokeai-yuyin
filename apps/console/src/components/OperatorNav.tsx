"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { OPERATOR_NAV_ITEMS } from "../lib/screens";
import { t } from "../lib/messages";
import { AppNav } from "./ui/AppNav";

/**
 * The operator frame: a top bar that says "Operator" in text, so the frame is not told apart by
 * colour alone, then the navigation (DESIGN 6.3).
 */
export function OperatorNav({ orgSwitcher }: { readonly orgSwitcher?: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <div className="border-b border-line bg-bg-2 px-4 py-2 text-small font-medium text-text-0">
        {t("op.bar.label")}
      </div>
      <AppNav
        label={t("op.nav.label")}
        items={OPERATOR_NAV_ITEMS.map((item) => ({ href: item.href, label: t(item.labelKey) }))}
        currentHref={pathname}
        {...(orgSwitcher !== undefined ? { orgSwitcher } : {})}
      />
    </>
  );
}

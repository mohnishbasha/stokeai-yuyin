"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";

export interface AppNavItem {
  readonly href: string;
  readonly label: string;
}

export interface AppNavProps {
  readonly label: string;
  readonly items: readonly AppNavItem[];
  readonly currentHref: string;
  readonly orgSwitcher?: ReactNode;
  readonly themeSwitch?: ReactNode;
}

/** The console navigation landmark; a menu button below the lg breakpoint (DESIGN 5.16). */
export function AppNav({ label, items, currentHref, orgSwitcher, themeSwitch }: AppNavProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      button.current?.focus();
    }
  }

  return (
    <nav
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3 border-b border-line bg-bg-1 p-3 lg:flex-row lg:items-center"
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="app-nav-list"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="min-h-(--control-height-touch) rounded-control border border-line-strong px-3 text-body lg:hidden"
      >
        {t("nav.menu")}
      </button>
      <ul
        id="app-nav-list"
        className={cx("flex-col gap-1 lg:flex lg:flex-row", open ? "flex" : "hidden")}
      >
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              {...(item.href === currentHref ? { "aria-current": "page" as const } : {})}
              className={cx(
                "inline-flex min-h-(--control-height) items-center rounded-control px-3 text-body",
                item.href === currentHref ? "bg-bg-3 text-text-0" : "text-text-1 hover:bg-bg-3",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 lg:ml-auto">
        {orgSwitcher}
        {themeSwitch}
      </div>
    </nav>
  );
}

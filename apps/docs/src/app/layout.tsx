import { readFileSync } from "node:fs";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { fontVariables } from "./fonts";
import { Search } from "../components/Search";
import { SidebarNav } from "../components/SidebarNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { t } from "../lib/messages";
import { versionPath } from "../lib/paths";
import { CONSOLE_URL } from "../lib/site";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: { default: t("brand.name"), template: `%s | ${t("brand.name")}` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const version = readFileSync(versionPath(), "utf8").trim();
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a
          href="#main"
          className="absolute -top-9 left-4 z-10 rounded-control bg-accent px-3 py-2 text-accent-ink focus:top-2"
        >
          {t("nav.skip")}
        </a>
        <header className="border-b border-line bg-bg-1">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
            <Link
              href="/"
              aria-label={t("brand.home")}
              className="text-h3 font-semibold text-text-0 no-underline"
            >
              {t("brand.name")}
            </Link>
            <div className="min-w-0 flex-1">
              <Search />
            </div>
            <span className="text-small text-text-2">
              {t("version.label").replace("{version}", version)}
            </span>
            <ThemeToggle />
            <a href={CONSOLE_URL} className="text-small">
              {t("nav.console")}
            </a>
          </div>
        </header>
        <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-5 lg:flex-row lg:px-6">
          <aside className="lg:w-[calc(var(--space-9)*2)] lg:shrink-0">
            <SidebarNav />
          </aside>
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

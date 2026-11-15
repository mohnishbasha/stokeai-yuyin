import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "../../components/ThemeToggle";
import { t } from "../../lib/messages";
import { THEME_COOKIE, parseTheme } from "../../lib/theme";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <>
      <header className="border-b border-line bg-bg-1">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link
            href="/"
            aria-label={t("brand.home")}
            className="text-h3 font-semibold text-text-0 no-underline"
          >
            {t("brand.name")}
          </Link>
          <nav aria-label={t("nav.primary")} className="flex items-center gap-4">
            <Link href="/dashboard" className="text-small">
              {t("nav.console")}
            </Link>
            <ThemeToggle initial={theme} />
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-line">
        <p className="mx-auto max-w-content px-4 py-5 text-small text-text-1 lg:px-6">
          {t("footer.owner")}
        </p>
      </footer>
    </>
  );
}

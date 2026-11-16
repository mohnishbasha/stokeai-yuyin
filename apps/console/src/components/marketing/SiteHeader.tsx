import Link from "next/link";
import { t } from "../../lib/messages";
import type { Theme } from "../../lib/theme";
import { ThemeToggle } from "../ThemeToggle";
import { LinkButton } from "./LinkButton";

const LINKS = [
  { href: "/", label: "site.nav.product" },
  { href: "/pricing", label: "site.nav.pricing" },
  { href: "/benchmarks", label: "site.nav.benchmarks" },
  { href: "/docs", label: "site.nav.docs" },
] as const;

/** The marketing top bar (DESIGN 6.1): mark, product links, theme switch, sign in, and key. */
export function SiteHeader({ theme }: { readonly theme?: Theme | undefined }) {
  return (
    <header className="border-b border-line bg-bg-1">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link
          href="/"
          aria-label={t("brand.home")}
          className="text-h3 font-semibold text-text-0 no-underline"
        >
          {t("brand.name")}
        </Link>
        <nav aria-label={t("nav.primary")} className="flex flex-wrap items-center gap-4">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-small">
              {t(link.label)}
            </Link>
          ))}
          <ThemeToggle initial={theme} />
          <Link href="/dashboard" className="text-small">
            {t("site.nav.signIn")}
          </Link>
          <LinkButton href="/dashboard" variant="primary">
            {t("site.nav.getKey")}
          </LinkButton>
        </nav>
      </div>
    </header>
  );
}

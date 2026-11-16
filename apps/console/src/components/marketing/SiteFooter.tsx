import Link from "next/link";
import { t, type MessageKey } from "../../lib/messages";

interface FooterLink {
  readonly href: string;
  readonly label: MessageKey;
}

const COLUMNS: readonly {
  readonly heading: MessageKey;
  readonly links: readonly FooterLink[];
}[] = [
  {
    heading: "site.footer.product",
    links: [
      { href: "/", label: "site.nav.home" },
      { href: "/pricing", label: "site.nav.pricing" },
      { href: "/benchmarks", label: "site.nav.benchmarks" },
      { href: "/custom-voice", label: "site.nav.customVoice" },
    ],
  },
  {
    heading: "site.footer.resources",
    links: [
      { href: "/docs", label: "site.nav.docs" },
      { href: "/faq", label: "site.nav.faq" },
      { href: "/status", label: "site.nav.status" },
    ],
  },
  {
    heading: "site.footer.company",
    links: [
      { href: "/about", label: "site.nav.about" },
      { href: "/contact", label: "site.nav.contact" },
    ],
  },
  {
    heading: "site.footer.legal",
    links: [
      { href: "/terms", label: "site.nav.terms" },
      { href: "/privacy", label: "site.nav.privacy" },
      { href: "/acceptable-use", label: "site.nav.acceptableUse" },
      { href: "/refunds", label: "site.nav.refunds" },
    ],
  },
];

/** The marketing footer (DESIGN 6.1): product, docs, legal, status, and the font licence note. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-5 px-4 py-6 lg:px-6">
        <nav aria-label={t("site.footer.nav")} className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.heading} className="flex flex-col gap-2">
              <h2 className="text-small font-medium text-text-0">{t(column.heading)}</h2>
              <ul className="flex flex-col gap-1 text-small">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{t(link.label)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="max-w-prose text-small text-text-1">{t("site.footer.fonts")}</p>
        <p className="text-small text-text-1">{t("footer.owner")}</p>
      </div>
    </footer>
  );
}

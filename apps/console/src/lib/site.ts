// The marketing site map (DESIGN 6.1). Header, footer, and the tests read it, so a page
// cannot be listed in one place and missing from another.
import type { MessageKey } from "./messages";

export interface MarketingPage {
  readonly path: string;
  readonly titleKey: MessageKey;
}

export const MARKETING_PAGES: readonly MarketingPage[] = [
  { path: "/", titleKey: "site.nav.home" },
  { path: "/pricing", titleKey: "site.nav.pricing" },
  { path: "/benchmarks", titleKey: "site.nav.benchmarks" },
  { path: "/custom-voice", titleKey: "site.nav.customVoice" },
  { path: "/faq", titleKey: "site.nav.faq" },
  { path: "/about", titleKey: "site.nav.about" },
  { path: "/contact", titleKey: "site.nav.contact" },
  { path: "/terms", titleKey: "site.nav.terms" },
  { path: "/privacy", titleKey: "site.nav.privacy" },
  { path: "/acceptable-use", titleKey: "site.nav.acceptableUse" },
  { path: "/refunds", titleKey: "site.nav.refunds" },
];

/** The one public address known so far; sales, support, and security aliases are an owner item. */
export const CONTACT_EMAIL = "legal@serverlessvc.com";

/** Legal pages show a draft banner unless the owner sets LEGAL_DRAFT_BANNER=off (OWNER O12). */
export function legalDraftBannerOn(): boolean {
  return process.env["LEGAL_DRAFT_BANNER"] !== "off";
}

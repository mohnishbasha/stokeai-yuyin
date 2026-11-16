// Renders each marketing page to static markup for the site tests (MK-01, MK-03).
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AboutPage from "../../src/app/(marketing)/about/page";
import AcceptableUsePage from "../../src/app/(marketing)/acceptable-use/page";
import BenchmarksPage from "../../src/app/(marketing)/benchmarks/page";
import ContactPage from "../../src/app/(marketing)/contact/page";
import CustomVoicePage from "../../src/app/(marketing)/custom-voice/page";
import FaqPage from "../../src/app/(marketing)/faq/page";
import HomePage from "../../src/app/(marketing)/page";
import PricingPage from "../../src/app/(marketing)/pricing/page";
import PrivacyPage from "../../src/app/(marketing)/privacy/page";
import RefundsPage from "../../src/app/(marketing)/refunds/page";
import TermsPage from "../../src/app/(marketing)/terms/page";

export const PAGES: Readonly<Record<string, () => ReactElement>> = {
  "/": HomePage,
  "/pricing": PricingPage,
  "/benchmarks": BenchmarksPage,
  "/custom-voice": CustomVoicePage,
  "/faq": FaqPage,
  "/about": AboutPage,
  "/contact": ContactPage,
  "/terms": TermsPage,
  "/privacy": PrivacyPage,
  "/acceptable-use": AcceptableUsePage,
  "/refunds": RefundsPage,
};

export function renderPage(path: string): string {
  const page = PAGES[path];
  if (page === undefined) throw new Error(`No marketing page for ${path}`);
  return renderToStaticMarkup(page());
}

/** Visible text of a markup string: tags removed, entities decoded, whitespace collapsed. */
export function visibleText(markup: string): string {
  return markup
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every href in a markup string. */
export function hrefs(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]*)"/g)].map((m) => m[1] ?? "");
}

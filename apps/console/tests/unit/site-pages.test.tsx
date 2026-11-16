// MK-01 unit_site_pages_allpublic_noperformancenumbers
// MK-03 e2e_site_pages_alllisted_navigable (a Vitest integration test until Playwright, S2-T09)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "../../src/components/marketing/SiteFooter";
import { SiteHeader } from "../../src/components/marketing/SiteHeader";
import { MARKETING_PAGES } from "../../src/lib/site";
import { findPerformanceNumbers } from "../support/perfnumbers";
import { PAGES, hrefs, renderPage, visibleText } from "../support/pages";

const APP = join(import.meta.dirname, "../../src/app/(marketing)");
const DESIGN_6_1 = [
  "/",
  "/pricing",
  "/benchmarks",
  "/custom-voice",
  "/faq",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/refunds",
];

describe("performance number scanner", () => {
  it.each([
    "first audio in 80 ms",
    "p95 under load",
    "RTF 0.25",
    "supports 500 concurrent streams",
    "handles 10 simultaneous connections",
    "2 seconds to start",
    "99.9% uptime",
    "ten times faster: 10x real-time",
  ])("test_perfnumbers_scan_%s_isreported", (text) => {
    expect(findPerformanceNumbers(text).length).toBeGreaterThan(0);
  });

  it.each([
    "Minimum top-up $5.00",
    "Demo text is limited to 200 characters",
    "5 steps from request to delivery",
    "Effective 2026-11-15",
  ])("test_perfnumbers_scan_%s_isclean", (text) => {
    expect(findPerformanceNumbers(text)).toEqual([]);
  });
});

describe("marketing pages", () => {
  it("test_site_pages_registry_matchesdesign61", () => {
    expect(MARKETING_PAGES.map((page) => page.path).sort()).toEqual([...DESIGN_6_1].sort());
    expect(Object.keys(PAGES).sort()).toEqual([...DESIGN_6_1].sort());
  });

  it.each(DESIGN_6_1)("test_site_pages_%s_hasapagefile", (path) => {
    const file = path === "/" ? "page.tsx" : `${path.slice(1)}/page.tsx`;
    expect(existsSync(join(APP, file))).toBe(true);
  });

  it.each(DESIGN_6_1)("test_site_pages_%s_hasoneh1andmain", (path) => {
    const markup = renderPage(path);
    expect(markup.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(markup).toContain('id="main"');
  });

  it.each(DESIGN_6_1)("test_site_pages_%s_hasnoperformancenumbers", (path) => {
    expect(findPerformanceNumbers(visibleText(renderPage(path)))).toEqual([]);
  });

  it("test_site_pages_messages_havenoperformancenumbers", () => {
    const messages = readFileSync(join(import.meta.dirname, "../../src/messages/en.json"), "utf8");
    const siteStrings = Object.entries(JSON.parse(messages) as Record<string, string>)
      .filter(([key]) => /^(site|home|pricing|bench|voicepage|faq|about|contact|legal)/.test(key))
      .map(([, value]) => value);
    expect(siteStrings.length).toBeGreaterThan(20);
    expect(findPerformanceNumbers(siteStrings.join(" \n "))).toEqual([]);
  });

  it("test_site_benchmarks_page_statesnumberswillbepublishedfromharness", () => {
    const text = visibleText(renderPage("/benchmarks"));
    expect(text).toMatch(/published from the benchmark harness/i);
    expect(text).toMatch(/no numbers/i);
  });
});

describe("navigation", () => {
  const chrome = renderToStaticMarkup(
    <>
      <SiteHeader />
      <SiteFooter />
    </>,
  );
  const OUTSIDE_MARKETING = new Set(["/dashboard", "/docs", "/status"]);

  it("test_site_nav_chrome_linkstoeverymarketingpage", () => {
    const links = new Set(hrefs(chrome));
    for (const path of DESIGN_6_1) expect(links).toContain(path);
  });

  it("test_site_nav_everyheaderfooterlink_resolves", () => {
    for (const href of hrefs(chrome)) {
      expect(DESIGN_6_1.includes(href) || OUTSIDE_MARKETING.has(href), `dead link ${href}`).toBe(
        true,
      );
    }
  });

  it("test_site_nav_everypagelink_resolves_andgraphreachesall", () => {
    const seen = new Set<string>(["/"]);
    const queue = ["/"];
    while (queue.length > 0) {
      const path = queue.shift() as string;
      for (const href of [...hrefs(renderPage(path)), ...hrefs(chrome)]) {
        const target = href.split("#")[0] ?? "";
        if (!target.startsWith("/") || OUTSIDE_MARKETING.has(target)) continue;
        expect(DESIGN_6_1, `dead link ${href} on ${path}`).toContain(target);
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    expect([...seen].sort()).toEqual([...DESIGN_6_1].sort());
  });

  it("test_site_nav_footer_linksfontlicences", () => {
    expect(visibleText(chrome)).toMatch(/font licen[cs]es/i);
  });
});

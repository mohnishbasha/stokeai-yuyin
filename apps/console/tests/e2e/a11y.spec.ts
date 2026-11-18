// Accessibility checks on every route (S2-T08, CN-26, DESIGN 9.1).
// Scenario: e2e_a11y_allroutes_axe_zeroseriousviolations.
// axe runs with the WCAG 2.0, 2.1 and 2.2 level A and AA rule tags in both themes. A route
// passes with zero violations of impact serious or critical. No rule is disabled.
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { MARKETING_PAGES } from "../../src/lib/site";
import { ANONYMOUS_STATE, THEMES, expect, settle, test } from "./fixtures";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);
// Rules disabled in this suite, each with a written reason. Empty on purpose: real violations
// are fixed in the app, not excluded.
const DISABLED_RULES: readonly string[] = [];

const APP_DIR = join(import.meta.dirname, "../../src/app");

// Public pages are checked as a visitor sees them; everything else uses the seeded session.
const PUBLIC_PATHS = [...MARKETING_PAGES.map((p) => p.path), "/sign-in"];
const SIGNED_IN_PATHS = [
  "/dashboard",
  "/dashboard/billing",
  "/dashboard/keys",
  "/dashboard/lexicon",
  "/dashboard/onboarding",
  "/dashboard/playground",
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/usage",
  "/dashboard/voices",
  "/dashboard/voices/request",
  "/operator",
];
// The preview routes are enabled in the harness by YUYIN_PREVIEW_ROUTES=1. The component
// pages under /preview/components/<name> are discovered from the index page.
const PREVIEW_PATHS = ["/preview/components", "/preview/devanagari"];
const PREVIEW_INDEX = "/preview/components";
const COMPONENT_PREFIX = "/preview/components/";

/** Page routes found on disk, as URL paths. Dynamic segments are skipped (covered by the index). */
function pageRoutesOnDisk(dir: string): string[] {
  const routes: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") routes.push(full);
    }
  };
  walk(dir);
  return routes
    .map((file) => relative(APP_DIR, join(file, "..")).split(sep))
    .filter((parts) => !parts.some((part) => part.startsWith("[")))
    .map((parts) => `/${parts.filter((part) => !part.startsWith("(")).join("/")}`);
}

async function seriousViolations(page: import("@playwright/test").Page) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules([...DISABLED_RULES]);
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact !== null && v.impact !== undefined && BLOCKING_IMPACTS.has(v.impact))
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(" ")),
    }));
}

test.describe("e2e_a11y_allroutes_axe_zeroseriousviolations", () => {
  test("the route lists cover every page on disk", () => {
    const listed = new Set([...PUBLIC_PATHS, ...SIGNED_IN_PATHS, ...PREVIEW_PATHS]);
    const onDisk = pageRoutesOnDisk(APP_DIR).map((p) => (p === "/" ? "/" : p.replace(/\/$/, "")));
    // The pulse-line demo page is a component page, discovered from the index.
    const expected = onDisk.filter((p) => p !== `${COMPONENT_PREFIX}pulse-line`);
    expect([...listed].sort()).toEqual([...new Set(expected)].sort());
  });

  for (const theme of THEMES) {
    test.describe(`${theme} theme`, () => {
      test.use({ theme });

      test.describe("public routes", () => {
        test.use({ storageState: ANONYMOUS_STATE });
        for (const path of PUBLIC_PATHS) {
          test(path, async ({ page }) => {
            await page.goto(path);
            await settle(page);
            expect(await seriousViolations(page)).toEqual([]);
          });
        }
      });

      test.describe("signed-in routes", () => {
        for (const path of SIGNED_IN_PATHS) {
          test(path, async ({ page }) => {
            await page.goto(path);
            await settle(page);
            expect(await seriousViolations(page)).toEqual([]);
          });
        }
      });

      test.describe("preview routes", () => {
        for (const path of PREVIEW_PATHS) {
          test(path, async ({ page }) => {
            await page.goto(path);
            await settle(page);
            expect(await seriousViolations(page)).toEqual([]);
          });
        }

        test("every component preview", async ({ page }) => {
          await page.goto(PREVIEW_INDEX);
          const hrefs = await page
            .locator(`main a[href^="${COMPONENT_PREFIX}"]`)
            .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
          expect(hrefs.length).toBeGreaterThan(0);
          const failures: Record<string, unknown> = {};
          for (const href of hrefs) {
            await page.goto(href);
            await settle(page);
            const found = await seriousViolations(page);
            if (found.length > 0) failures[href] = found;
          }
          expect(failures).toEqual({});
        });
      });
    });
  }
});

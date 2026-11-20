// Browser version of MK-03: the 11 marketing pages exist, each has one h1, and the link graph
// reaches every page from Home by following header and footer links.
import { MARKETING_PAGES } from "../../src/lib/site";
import { ANONYMOUS_STATE, expect, test } from "./fixtures";

test.use({ storageState: ANONYMOUS_STATE });

test.describe("e2e_site_pages_alllisted_navigable", () => {
  for (const { path } of MARKETING_PAGES) {
    test(`${path} renders with one h1`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });
  }

  test("every page is reachable from Home through site links", async ({ page }) => {
    const wanted = new Set(MARKETING_PAGES.map((p) => p.path));
    const seen = new Set<string>();
    const queue = ["/"];
    while (queue.length > 0) {
      const path = queue.shift();
      if (path === undefined || seen.has(path)) continue;
      seen.add(path);
      await page.goto(path);
      const hrefs = await page
        .locator("header a[href], footer a[href]")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
      for (const href of hrefs) {
        if (wanted.has(href) && !seen.has(href)) queue.push(href);
      }
    }
    expect([...seen].sort()).toEqual([...wanted].sort());
  });
});

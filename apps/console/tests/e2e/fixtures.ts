// Shared Playwright fixtures (S2-T09). `.auth/state.json` holds the session cookie that
// scripts/e2e-seed.ts created through the real session code and stored in Postgres, so every
// test is signed in by the built-in auth path (a seeded session, ADR-025). `ANONYMOUS_STATE`
// drops it; `theme` selects the stored theme cookie the server renders (DESIGN 2).
import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { THEME_COOKIE, THEMES } from "../../src/lib/theme";
import type { Theme } from "../../src/lib/theme";

export { THEMES, expect };
export type { Theme };

export const ANONYMOUS_STATE = { cookies: [], origins: [] };

interface Options {
  theme: Theme;
}

export const test = base.extend<Options>({
  theme: ["dark", { option: true }],
  page: async ({ page, context, baseURL, theme }, use) => {
    await context.addCookies([{ name: THEME_COOKIE, value: theme, url: baseURL ?? "" }]);
    await use(page);
  },
});

/**
 * Waits for the load event and the web fonts, so text metrics are final before a screenshot.
 * It does not wait for network idle: the marketing pages keep a connection open.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
}

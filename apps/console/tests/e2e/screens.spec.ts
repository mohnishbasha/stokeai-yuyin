// Browser versions of CN-65, CN-66, CN-67 (operator screens) and of CN-54, CN-55, CN-56 (screens reachable, empty state, error state) and of
// CN-46 (login link to first console view), against the production build and a seeded session.
import { readFile } from "node:fs/promises";
import { MOCK_ERROR_CODE, MOCK_TRACE_ID } from "../../src/lib/data/mock";
import { t } from "./messages";
import {
  CONSOLE_HOME_HREF,
  CONSOLE_NAV_ITEMS,
  CONSOLE_SCREENS,
  OPERATOR_HOME_HREF,
  OPERATOR_NAV_ITEMS,
  OPERATOR_SCREENS,
} from "../../src/lib/screens";
import { ANONYMOUS_STATE, expect, test } from "./fixtures";

test.describe("e2e_console_screens_all_reachable", () => {
  for (const item of CONSOLE_NAV_ITEMS) {
    test(`${item.href} is linked from the navigation and renders its title`, async ({ page }) => {
      await page.goto(CONSOLE_HOME_HREF);
      const nav = page.getByRole("navigation", { name: t("nav.console") });
      await nav.locator(`a[href="${item.href}"]`).click();
      await expect(page).toHaveURL(item.href);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t(item.labelKey));
    });
  }
});

test.describe("e2e_console_screens_emptystateflag_renders", () => {
  for (const screen of CONSOLE_SCREENS) {
    if (screen.emptyTitleKey === undefined) continue;
    const emptyTitle = t(screen.emptyTitleKey);
    test(`${screen.href}?state=empty shows its empty state`, async ({ page }) => {
      await page.goto(`${screen.href}?state=empty`);
      await expect(page.getByRole("heading", { name: emptyTitle })).toBeVisible();
    });
  }
});

test.describe("e2e_console_screens_errorstateflag_renders", () => {
  for (const screen of CONSOLE_SCREENS) {
    test(`${screen.href}?state=error shows the error code and trace id`, async ({ page }) => {
      await page.goto(`${screen.href}?state=error`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t(screen.titleKey));
      await expect(page.getByText(MOCK_ERROR_CODE).first()).toBeVisible();
      await expect(page.getByText(MOCK_TRACE_ID).first()).toBeVisible();
    });
  }
});

test.describe("e2e_operator_screens_all_reachable", () => {
  for (const item of OPERATOR_NAV_ITEMS) {
    test(`${item.href} is linked from the operator navigation`, async ({ page }) => {
      await page.goto(OPERATOR_HOME_HREF);
      const nav = page.getByRole("navigation", { name: t("op.nav.label") });
      await nav.locator(`a[href="${item.href}"]`).click();
      await expect(page).toHaveURL(item.href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }

  for (const screen of OPERATOR_SCREENS) {
    test(`${screen.href} is linked from the operator overview`, async ({ page }) => {
      await page.goto(OPERATOR_HOME_HREF);
      await page.getByRole("main").locator(`a[href="${screen.href}"]`).click();
      await expect(page).toHaveURL(screen.href);
    });
  }
});

test.describe("e2e_operator_screens_emptystateflag_renders", () => {
  for (const screen of OPERATOR_SCREENS) {
    if (screen.emptyTitleKey === undefined) continue;
    const state = screen.id === "organization" ? "not-found" : "empty";
    const emptyTitle = t(screen.emptyTitleKey);
    test(`${screen.href}?state=${state} shows its empty state`, async ({ page }) => {
      await page.goto(`${screen.href}?state=${state}`);
      await expect(page.getByRole("heading", { name: emptyTitle })).toBeVisible();
    });
  }
});

test.describe("e2e_operator_screens_errorstateflag_renders", () => {
  for (const screen of OPERATOR_SCREENS) {
    test(`${screen.href}?state=error shows the error code and trace id`, async ({ page }) => {
      await page.goto(`${screen.href}?state=error`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t(screen.titleKey));
      await expect(page.getByText(MOCK_ERROR_CODE).first()).toBeVisible();
      await expect(page.getByText(MOCK_TRACE_ID).first()).toBeVisible();
    });
  }
});

test.describe("e2e_console_loginlink_firstconsoleview_succeeds", () => {
  test.use({ storageState: ANONYMOUS_STATE });

  test("an issued login link opens the first console view and sets a session", async ({
    page,
    context,
  }) => {
    const { token } = JSON.parse(await readFile(".auth/login.json", "utf8")) as { token: string };
    await page.goto(`/sign-in?token=${token}`);
    await page.getByRole("button", { name: t("auth.signin.continue") }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#org-switcher option:checked")).toHaveText("Acme Voice");
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name.endsWith("yuyin-session"));
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
  });

  test("a console route without a session redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard/keys");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

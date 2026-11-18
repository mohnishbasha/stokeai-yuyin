// Visual snapshots of 12 key screens in both themes (S2-T09, CN-29).
// Scenarios: e2e_visual_keyscreens_darktheme_matchessnapshots,
//            e2e_visual_keyscreens_lighttheme_matchessnapshots.
import { ANONYMOUS_STATE, THEMES, expect, settle, test } from "./fixtures";

interface KeyScreen {
  readonly name: string;
  readonly path: string;
}

// Public pages are captured without a session, as a visitor sees them.
const PUBLIC_SCREENS: readonly KeyScreen[] = [
  { name: "home", path: "/" },
  { name: "pricing", path: "/pricing" },
  { name: "sign-in", path: "/sign-in" },
];

// Console and operator screens are captured with the seeded session.
const SIGNED_IN_SCREENS: readonly KeyScreen[] = [
  { name: "dashboard", path: "/dashboard" },
  { name: "playground", path: "/dashboard/playground" },
  { name: "keys", path: "/dashboard/keys" },
  { name: "usage", path: "/dashboard/usage" },
  { name: "billing", path: "/dashboard/billing" },
  { name: "voices", path: "/dashboard/voices" },
  { name: "team", path: "/dashboard/team" },
  { name: "settings", path: "/dashboard/settings" },
  { name: "operator", path: "/operator" },
];

const KEY_SCREEN_COUNT = 12;

for (const theme of THEMES) {
  test.describe(`e2e_visual_keyscreens_${theme}theme_matchessnapshots`, () => {
    test.use({ theme });

    test("there are twelve key screens", () => {
      expect(PUBLIC_SCREENS.length + SIGNED_IN_SCREENS.length).toBe(KEY_SCREEN_COUNT);
    });

    test.describe("public", () => {
      test.use({ storageState: ANONYMOUS_STATE });
      for (const screen of PUBLIC_SCREENS) {
        test(screen.name, async ({ page }) => {
          await page.goto(screen.path);
          await settle(page);
          await expect(page).toHaveScreenshot(`${screen.name}-${theme}.png`, { fullPage: true });
        });
      }
    });

    test.describe("signed in", () => {
      for (const screen of SIGNED_IN_SCREENS) {
        test(screen.name, async ({ page }) => {
          await page.goto(screen.path);
          await settle(page);
          await expect(page).toHaveScreenshot(`${screen.name}-${theme}.png`, { fullPage: true });
        });
      }
    });
  });
}

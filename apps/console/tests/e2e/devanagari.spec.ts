// Devanagari rendering fixture (S2-T08, CN-27, DESIGN 9.5).
// Scenario: e2e_render_devanagarifixture_conjunctsmatras_matchessnapshot.
// The page lists 50 Hindi lines with conjuncts and matras; the snapshot shows whether upper
// matras, lower matras, or conjuncts are clipped or mis-shaped. Baselines are Linux only.
import { ANONYMOUS_STATE, THEMES, expect, settle, test } from "./fixtures";

const FIXTURE_PATH = "/preview/devanagari";
const FIXTURE_SIZE = 50;

test.use({ storageState: ANONYMOUS_STATE });

for (const theme of THEMES) {
  test.describe(`e2e_render_devanagarifixture_conjunctsmatras_matchessnapshot (${theme})`, () => {
    test.use({ theme });

    test("renders 50 Hindi strings and matches the snapshot", async ({ page }) => {
      await page.goto(FIXTURE_PATH);
      await settle(page);
      const items = page.getByTestId("devanagari-fixture").locator("li");
      await expect(items).toHaveCount(FIXTURE_SIZE);
      expect(
        await items.evaluateAll((els) => els.every((el) => el.getAttribute("lang") === "hi")),
      ).toBe(true);
      await expect(page).toHaveScreenshot(`devanagari-fixture-${theme}.png`, { fullPage: true });
    });
  });
}

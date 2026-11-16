// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible
// CN-50 unit_console_components_previewroutes_allexist
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PREVIEWS } from "../../../src/app/preview/registry";
import { previewEnabled } from "../../../src/lib/preview";

afterEach(cleanup);

const SRC = join(import.meta.dirname, "../../../src");
const UI = join(SRC, "components/ui");
const EXPECTED = [
  "app-nav",
  "badge",
  "balance-meter",
  "banner",
  "button",
  "code-block",
  "dialog",
  "empty-state",
  "error-state",
  "input",
  "key-reveal",
  "select",
  "table",
  "tabs",
  "textarea",
  "toast",
  "toggle",
  "usage-chart",
  "voice-picker",
];

describe("preview routes", () => {
  it("test_previews_registry_hasanentryforeverycomponent", () => {
    expect(PREVIEWS.map((p) => p.slug).sort()).toEqual(EXPECTED);
  });

  it("test_previews_routefiles_indexanddynamicpageexist", () => {
    expect(existsSync(join(SRC, "app/preview/components/page.tsx"))).toBe(true);
    expect(existsSync(join(SRC, "app/preview/components/[name]/page.tsx"))).toBe(true);
  });

  it("test_previews_slugs_areuniquewithtitlesandcomponentfiles", () => {
    expect(new Set(PREVIEWS.map((p) => p.slug)).size).toBe(PREVIEWS.length);
    for (const preview of PREVIEWS) {
      expect(preview.title.length).toBeGreaterThan(0);
      expect(existsSync(join(UI, `${preview.component}.tsx`))).toBe(true);
    }
  });

  it.each(PREVIEWS.map((p) => [p.slug, p] as const))("test_previews_render_%s_mountswithoutthrowing", (_slug, p) => {
    const Demo = p.Demo;
    const { container } = render(<Demo />);
    expect(container.textContent?.length).toBeGreaterThan(0);
  });

  it("test_previews_production_isoffunlessenabled", () => {
    expect(previewEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(previewEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(previewEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(previewEnabled({ NODE_ENV: "production", YUYIN_PREVIEW_ROUTES: "1" })).toBe(true);
  });
});

describe("keyboard and focus ring", () => {
  it.each(PREVIEWS.map((p) => [p.slug, p] as const))("test_a11y_%s_hasnopositivetabindex", (_slug, p) => {
    const Demo = p.Demo;
    const { container } = render(<Demo />);
    for (const el of container.querySelectorAll("[tabindex]")) {
      expect(Number(el.getAttribute("tabindex"))).toBeLessThanOrEqual(0);
    }
  });

  it.each(PREVIEWS.filter((p) => p.interactive).map((p) => [p.slug, p] as const))(
    "test_a11y_%s_hasatleastonefocusablecontrol",
    (_slug, p) => {
      const Demo = p.Demo;
      const { container } = render(<Demo />);
      const focusable = container.querySelectorAll(
        'button, a[href], input, textarea, [tabindex="0"], [role="combobox"]',
      );
      expect(focusable.length).toBeGreaterThan(0);
    },
  );

  it("test_a11y_globalfocusring_usesaccenttokenandisneverremoved", () => {
    const css = readFileSync(join(SRC, "styles/globals.css"), "utf8");
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring-width\)\s+solid\s+var\(--accent\)/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline-offset:\s*var\(--focus-ring-offset\)/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*box-shadow:[^;]*var\(--accent-dim\)/);
  });

  it("test_a11y_componentsources_neverremovetheoutline", () => {
    const files = readdirSync(UI).filter((name) => name.endsWith(".tsx"));
    expect(files.length).toBeGreaterThanOrEqual(19);
    for (const file of files) {
      const source = readFileSync(join(UI, file), "utf8");
      expect(source, file).not.toMatch(/outline-none|outline-0|outline-hidden|focus:outline|ring-0/);
    }
  });
});

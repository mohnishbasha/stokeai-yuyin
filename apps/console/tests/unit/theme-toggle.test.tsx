// @vitest-environment jsdom
// CN-41 unit_console_themetoggle_click_switchesandpersists
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "../../src/components/ThemeToggle";

function stubMatchMedia(light: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: light && query.includes("light"),
    media: query,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  stubMatchMedia(false);
  document.documentElement.removeAttribute("data-theme");
  document.cookie = "yuyin-theme=; max-age=0; path=/";
});
afterEach(cleanup);

describe("ThemeToggle", () => {
  it("test_themetoggle_render_defaultdark_isnotpressedandnamed", () => {
    render(<ThemeToggle initial={undefined} />);
    const button = screen.getByRole("button", { name: "Light theme" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("test_themetoggle_render_storedlight_ispressed", () => {
    render(<ThemeToggle initial="light" />);
    expect(screen.getByRole("button", { name: "Light theme" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("test_themetoggle_click_flipsattributeandpersistscookie", () => {
    render(<ThemeToggle initial={undefined} />);
    const button = screen.getByRole("button", { name: "Light theme" });
    fireEvent.click(button);
    expect(document.documentElement.dataset["theme"]).toBe("light");
    expect(document.cookie).toContain("yuyin-theme=light");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(document.cookie).toContain("yuyin-theme=dark");
  });

  it("test_themetoggle_osprefersLight_unchosen_startspressed", () => {
    stubMatchMedia(true);
    render(<ThemeToggle initial={undefined} />);
    expect(screen.getByRole("button", { name: "Light theme" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});

// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible (UsageChart, AppNav)
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "../../../src/components/ui/AppNav";
import { UsageChart } from "../../../src/components/ui/UsageChart";

afterEach(cleanup);

const POINTS = [
  { label: "2026-11-01", value: 1200 },
  { label: "2026-11-02", value: 3400 },
  { label: "2026-11-03", value: 0 },
];
const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

describe("UsageChart", () => {
  function setup(props: Partial<React.ComponentProps<typeof UsageChart>> = {}) {
    render(
      <UsageChart
        title="Characters per day"
        unit="characters"
        points={POINTS}
        ranges={RANGES}
        range="7d"
        onRangeChange={() => undefined}
        {...props}
      />,
    );
    return screen.getByRole("group", { name: /Characters per day/ });
  }

  it("test_usagechart_render_hasonetabstopaxislabelsstartingatzero", () => {
    const plot = setup();
    expect(plot.getAttribute("tabindex")).toBe("0");
    expect(screen.getByText("0 characters")).toBeTruthy();
    expect(screen.getByText("3,400 characters")).toBeTruthy();
    expect(document.querySelectorAll("svg rect")).toHaveLength(3);
  });

  it("test_usagechart_arrowshomeend_moveandannounceeachpoint", () => {
    const plot = setup();
    const live = () => screen.getByRole("status").textContent;
    expect(live()).toContain("2026-11-01");
    fireEvent.keyDown(plot, { key: "ArrowRight" });
    expect(live()).toBe("2026-11-02: 3,400 characters");
    fireEvent.keyDown(plot, { key: "End" });
    expect(live()).toContain("2026-11-03");
    fireEvent.keyDown(plot, { key: "ArrowRight" });
    expect(live()).toContain("2026-11-03");
    fireEvent.keyDown(plot, { key: "Home" });
    expect(live()).toContain("2026-11-01");
    fireEvent.keyDown(plot, { key: "ArrowLeft" });
    expect(live()).toContain("2026-11-01");
  });

  it("test_usagechart_enter_pinsthetooltip", () => {
    const plot = setup();
    fireEvent.keyDown(plot, { key: "ArrowRight" });
    fireEvent.keyDown(plot, { key: "Enter" });
    expect(plot.getAttribute("data-pinned")).toBe("1");
    fireEvent.keyDown(plot, { key: "Enter" });
    expect(plot.getAttribute("data-pinned")).toBe("");
  });

  it("test_usagechart_viewastable_exposesthesamedata", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("3,400")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View as chart" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("test_usagechart_rangetabs_reportchange", () => {
    const onRangeChange = vi.fn();
    setup({ onRangeChange });
    fireEvent.click(screen.getByRole("tab", { name: "30 days" }));
    expect(onRangeChange).toHaveBeenCalledWith("30d");
  });

  it("test_usagechart_loadingerrorandempty_haveplaceholders", () => {
    cleanup();
    const { rerender } = render(<UsageChart title="T" unit="characters" points={[]} loading />);
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    rerender(<UsageChart title="T" unit="characters" points={[]} error={<p>Failed</p>} />);
    expect(screen.getByText("Failed")).toBeTruthy();
    rerender(<UsageChart title="T" unit="characters" points={[]} />);
    expect(screen.getByText("No usage in this range")).toBeTruthy();
  });
});

describe("AppNav", () => {
  const ITEMS = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/keys", label: "API keys" },
  ];

  it("test_appnav_render_marksthecurrentpageandlabelsthelandmark", () => {
    render(<AppNav label="Console" items={ITEMS} currentHref="/dashboard/keys" />);
    expect(screen.getByRole("navigation", { name: "Console" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "API keys" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" }).hasAttribute("aria-current")).toBe(
      false,
    );
  });

  it("test_appnav_menubutton_opensandescapecloses", () => {
    render(<AppNav label="Console" items={ITEMS} currentHref="/dashboard" />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(screen.getByRole("navigation"), { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("test_appnav_slots_renderorgswitcherandthemeswitch", () => {
    render(
      <AppNav
        label="Console"
        items={ITEMS}
        currentHref="/dashboard"
        orgSwitcher={<span>Acme</span>}
        themeSwitch={<span>Theme</span>}
      />,
    );
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.getByText("Theme")).toBeTruthy();
  });
});

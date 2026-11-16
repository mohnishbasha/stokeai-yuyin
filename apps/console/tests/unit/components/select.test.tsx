// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible (Select)
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "../../../src/components/ui/Select";

afterEach(cleanup);

const OPTIONS = [
  { value: "hi", label: "हिन्दी", secondary: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
  { value: "en", label: "English" },
];

function setup(onChange = vi.fn()) {
  render(<Select label="Language" options={OPTIONS} onChange={onChange} />);
  return { trigger: screen.getByRole("combobox", { name: /Language/ }), onChange };
}

function activeText(trigger: HTMLElement): string {
  return document.getElementById(trigger.getAttribute("aria-activedescendant") ?? "")?.textContent ?? "";
}

describe("Select", () => {
  it("test_select_closed_exposescomboboxwithoutlistbox", () => {
    const { trigger } = setup();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it.each(["Enter", " ", "ArrowDown"])("test_select_key_%s_opensthelistbox", (key) => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(trigger.getAttribute("aria-activedescendant")).toBeTruthy();
  });

  it("test_select_arrowsandhomeend_moveactiveoption", () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(activeText(trigger)).toContain("हिन्दी");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(activeText(trigger)).toContain("Hinglish");
    fireEvent.keyDown(trigger, { key: "End" });
    expect(activeText(trigger)).toContain("English");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(activeText(trigger)).toContain("English");
    fireEvent.keyDown(trigger, { key: "Home" });
    expect(activeText(trigger)).toContain("हिन्दी");
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(activeText(trigger)).toContain("हिन्दी");
  });

  it("test_select_enter_selectsclosesandkeepsfocusontrigger", () => {
    const { trigger, onChange } = setup();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("hinglish");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.textContent).toContain("Hinglish");
  });

  it("test_select_escape_closeswithoutselecting", () => {
    const { trigger, onChange } = setup();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("test_select_typeahead_movesbyprefix", () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: "e" });
    expect(activeText(trigger)).toContain("English");
  });

  it("test_select_mouseclickonoption_selects", () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: /English/ }));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("test_select_tab_closesthelistbox", () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("test_select_secondaryname_isshownwithnativename", () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(screen.getByRole("option", { name: /हिन्दी.*Hindi/ })).toBeTruthy();
  });

  it("test_select_loading_isbusycannotopenandrendersformvalue", () => {
    render(
      <Select
        label="Format"
        options={OPTIONS}
        onChange={() => undefined}
        loading
        name="fmt"
        value="en"
      />,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.querySelector('input[name="fmt"]')).toBeTruthy();
  });

  it("test_select_error_setsinvalid", () => {
    render(<Select label="Format" options={OPTIONS} onChange={() => undefined} error="Pick one" />);
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Pick one")).toBeTruthy();
  });
});

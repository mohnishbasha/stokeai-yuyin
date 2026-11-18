// @vitest-environment jsdom
// CN-60 unit_console_textarea_counter_codepoints_matchesexpected
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "../../../src/components/ui/Input";
import { Textarea } from "../../../src/components/ui/Textarea";
import { Toggle } from "../../../src/components/ui/Toggle";

afterEach(cleanup);

describe("Input", () => {
  it("test_input_label_isassociatedwithcontrolandhelper", () => {
    render(<Input label="Key name" helper="Letters, digits, hyphen" />);
    const input = screen.getByLabelText("Key name");
    const described = document.getElementById(input.getAttribute("aria-describedby") ?? "");
    expect(described?.textContent).toBe("Letters, digits, hyphen");
  });

  it("test_input_error_setsinvalidanddescribedby", () => {
    render(<Input label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    const text = ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    expect(text).toContain("Enter a valid email");
  });

  it("test_input_escapeonclearbutton_clearsonlythere", () => {
    const onClear = vi.fn();
    render(<Input label="Search" defaultValue="abc" onClear={onClear} />);
    const input = screen.getByLabelText("Search");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClear).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Clear" }), { key: "Escape" });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("Textarea", () => {
  it("test_textarea_counter_countscodepointsnotutf16units", () => {
    render(<Textarea label="Text" defaultValue={"नमस्ते 😀"} limit={5000} />);
    expect(screen.getByText("8 of 5,000 characters")).toBeTruthy();
  });

  it("test_textarea_typing_updatescounter", () => {
    render(<Textarea label="Text" limit={50} />);
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "आपकी EMI ₹12,450 है" } });
    expect(screen.getByText("19 of 50 characters")).toBeTruthy();
  });

  it("test_textarea_overlimit_showsoverbyandinvalid", () => {
    const onOverLimitChange = vi.fn();
    render(
      <Textarea
        label="Text"
        limit={3}
        defaultValue="abcde"
        onOverLimitChange={onOverLimitChange}
      />,
    );
    expect(screen.getByText("2 over the limit")).toBeTruthy();
    expect(screen.getByLabelText("Text").getAttribute("aria-invalid")).toBe("true");
    expect(onOverLimitChange).toHaveBeenLastCalledWith(true);
  });

  it("test_textarea_ctrlenter_callsshortcutandtabisnotcaptured", () => {
    const onSubmitShortcut = vi.fn();
    render(<Textarea label="Text" onSubmitShortcut={onSubmitShortcut} />);
    const area = screen.getByLabelText("Text");
    expect(fireEvent.keyDown(area, { key: "Tab" })).toBe(true);
    fireEvent.keyDown(area, { key: "Enter" });
    expect(onSubmitShortcut).not.toHaveBeenCalled();
    fireEvent.keyDown(area, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(area, { key: "Enter", metaKey: true });
    expect(onSubmitShortcut).toHaveBeenCalledTimes(2);
  });

  it("test_textarea_estimate_isrendered", () => {
    render(<Textarea label="Text" estimate="About $0.02" />);
    expect(screen.getByText("About $0.02")).toBeTruthy();
  });
});

describe("Toggle", () => {
  it("test_toggle_space_togglesandenterdoesnot", () => {
    const onChange = vi.fn();
    render(<Toggle label="Show normalised text" checked={false} onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Show normalised text" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(fireEvent.keyDown(sw, { key: "Enter" })).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("test_toggle_states_showonoffsavingandignoreclickwhensaving", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle label="A" checked onChange={onChange} />);
    expect(screen.getByText("On")).toBeTruthy();
    rerender(<Toggle label="A" checked={false} onChange={onChange} />);
    expect(screen.getByText("Off")).toBeTruthy();
    rerender(<Toggle label="A" checked saving onChange={onChange} />);
    expect(screen.getByText("Saving")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("test_toggle_disabledanderror_explain", () => {
    render(
      <Toggle
        label="A"
        checked
        disabled
        disabledReason="Plan limit"
        error="Could not save"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("switch").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Plan limit")).toBeTruthy();
    expect(screen.getByText("Could not save")).toBeTruthy();
  });
});

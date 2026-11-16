// @vitest-environment jsdom
// CN-48 unit_console_components_keyboardnav_focusringvisible (VoicePicker)
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoicePicker, type VoiceOption } from "../../../src/components/ui/VoicePicker";

afterEach(cleanup);

const VOICES: VoiceOption[] = [
  { id: "asha", name: "Asha", languages: ["hi", "hinglish"], description: "Warm, even pace" },
  { id: "dev", name: "Dev", languages: ["en"], description: "Clear and brisk" },
  {
    id: "mira",
    name: "Mira",
    languages: ["hi"],
    description: "Soft",
    unavailableReason: "Not on your plan",
  },
];

function setup(props: Partial<ComponentProps<typeof VoicePicker>> = {}) {
  const onSelect = vi.fn();
  const onPlay = vi.fn();
  const onStop = vi.fn();
  render(
    <VoicePicker voices={VOICES} onSelect={onSelect} onPlay={onPlay} onStop={onStop} {...props} />,
  );
  return { list: screen.getByRole("listbox"), onSelect, onPlay, onStop };
}

describe("VoicePicker", () => {
  it("test_voicepicker_render_showslanguagetagsandnoautoplay", () => {
    const { onPlay } = setup();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getAllByText("hinglish").length).toBeGreaterThan(0);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("test_voicepicker_arrows_moveactiveandenterselects", () => {
    const { list, onSelect } = setup();
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("dev");
  });

  it("test_voicepicker_selected_hasariaselectedandsummary", () => {
    setup({ selectedId: "asha" });
    expect(screen.getByRole("option", { name: /Asha/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/Selected: Asha/)).toBeTruthy();
  });

  it("test_voicepicker_spaceandescape_playandstop", () => {
    const { list, onPlay, onStop } = setup();
    fireEvent.keyDown(list, { key: " " });
    expect(onPlay).toHaveBeenCalledWith("asha");
    fireEvent.keyDown(list, { key: "Escape" });
    expect(onStop).toHaveBeenCalled();
  });

  it("test_voicepicker_playing_spacepauses", () => {
    const { list, onStop } = setup({ playingId: "asha" });
    fireEvent.keyDown(list, { key: " " });
    expect(onStop).toHaveBeenCalled();
  });

  it("test_voicepicker_filter_narrowsbylanguage", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "en" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("test_voicepicker_unavailable_cannotbeselectedandexplains", () => {
    const { list, onSelect } = setup();
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Not on your plan")).toBeTruthy();
  });

  it("test_voicepicker_clickoption_selectsandclickplaymarkerplays", () => {
    const { onSelect, onPlay } = setup();
    fireEvent.click(screen.getByRole("option", { name: /Dev/ }));
    expect(onSelect).toHaveBeenCalledWith("dev");
    fireEvent.click(screen.getAllByText("Play sample")[0] as HTMLElement);
    expect(onPlay).toHaveBeenCalledWith("asha");
  });

  it("test_voicepicker_sampleerror_showsmessageandretry", () => {
    const onRetry = vi.fn();
    setup({ sampleError: { id: "asha", onRetry } });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
// CN-45 support: the animated frame loop, driven by hand with a recording canvas context.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PulseLine } from "../../src/components/PulseLine";

function install() {
  const calls = { stroke: 0 };
  const ctx = {
    strokeStyle: "",
    lineWidth: 1,
    clearRect: () => undefined,
    beginPath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    stroke: () => {
      calls.stroke += 1;
    },
  };
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
  let pending: FrameRequestCallback | undefined;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    pending = cb;
    return 1;
  };
  window.cancelAnimationFrame = () => undefined;
  const frame = (now: number) => {
    const cb = pending;
    pending = undefined;
    cb?.(now);
  };
  return { calls, frame, isScheduled: () => pending !== undefined };
}

function setHidden(value: boolean): void {
  Object.defineProperty(document, "hidden", { value, configurable: true });
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  setHidden(false);
});

describe("PulseLine animated loop", () => {
  it("test_pulseline_streaming_drawsonepathperframeandkeepsscheduling", () => {
    const { calls, frame, isScheduled } = install();
    render(<PulseLine state="streaming" ttfaMs={480} />);
    frame(16);
    frame(33);
    expect(calls.stroke).toBe(2);
    expect(isScheduled()).toBe(true);
  });

  it("test_pulseline_idle_drawsflatlineandstopsloop", () => {
    const { calls, frame, isScheduled } = install();
    render(<PulseLine state="idle" />);
    frame(16);
    expect(calls.stroke).toBe(1);
    expect(isScheduled()).toBe(false);
  });

  it("test_pulseline_requesting_readoutcountsupinwholems", () => {
    const { frame } = install();
    const start = performance.now();
    render(<PulseLine state="requesting" requestStartedAt={start} />);
    frame(start + 250.4);
    expect(screen.getByTestId("pulseline-readout").textContent).toBe("250 ms");
  });

  it("test_pulseline_ended_settlesbacktoflat", () => {
    const { frame, isScheduled } = install();
    const { rerender } = render(<PulseLine state="streaming" ttfaMs={1} />);
    let now = performance.now();
    frame(now + 100);
    rerender(<PulseLine state="ended" ttfaMs={1} />);
    for (let i = 0; i < 300 && isScheduled(); i += 1) {
      now += 16;
      frame(now);
    }
    expect(isScheduled()).toBe(false);
  });

  it("test_pulseline_hiddentab_skipsdrawing", () => {
    const { calls, frame } = install();
    setHidden(true);
    render(<PulseLine state="streaming" ttfaMs={1} />);
    frame(16);
    expect(calls.stroke).toBe(0);
  });

  it("test_pulseline_unmount_cancelsframe", () => {
    install();
    const cancel = vi.fn();
    window.cancelAnimationFrame = cancel;
    const { unmount } = render(<PulseLine state="streaming" ttfaMs={1} />);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("test_pulseline_errorstate_flatwithfailedreadout", () => {
    const { calls, frame } = install();
    render(<PulseLine state="error" errorCode="x" />);
    frame(16);
    expect(calls.stroke).toBe(1);
    expect(screen.getByTestId("pulseline-readout").textContent).toBe("Failed");
  });
});

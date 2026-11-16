// @vitest-environment jsdom
// CN-43 unit_console_pulseline_reducedmotion_staticrender
// CN-44 unit_console_pulseline_render_hasaccessibletextalternative
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PulseLine, type PulseState } from "../../src/components/PulseLine";
import { createMockAudioStream, formatTtfa, quantiseLevel } from "../../src/lib/pulseline";

function stubMatchMedia(reduce: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

let rafSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  rafSpy = vi.fn(() => 1);
  window.requestAnimationFrame = rafSpy as unknown as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = () => undefined;
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PulseLine reduced motion", () => {
  it("test_pulseline_reducedmotion_streaming_rendersmeterwithoutcanvasorraf", () => {
    stubMatchMedia(true);
    const { container } = render(
      <PulseLine state="streaming" ttfaMs={480} source={createMockAudioStream()} />,
    );
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getByTestId("pulseline-meter")).toBeTruthy();
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it("test_pulseline_reducedmotion_requesting_readoutshowswaiting", () => {
    stubMatchMedia(true);
    render(<PulseLine state="requesting" requestStartedAt={0} />);
    expect(screen.getByTestId("pulseline-readout").textContent).toBe("waiting");
  });

  it("test_pulseline_reducedmotion_meter_stepsatmostfourtimespersecond", () => {
    stubMatchMedia(true);
    let reads = 0;
    const source = (t: number) => {
      reads += 1;
      return (t % 1000) / 1000;
    };
    render(<PulseLine state="streaming" ttfaMs={10} source={source} />);
    const before = reads;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(reads - before).toBeLessThanOrEqual(4);
    expect(reads - before).toBeGreaterThan(0);
  });

  it("test_pulseline_quantiselevel_bucketsandclamps", () => {
    expect(quantiseLevel(-1)).toBe(0);
    expect(quantiseLevel(2)).toBe(1);
    expect(quantiseLevel(0.51)).toBeCloseTo(0.5, 5);
  });
});

describe("PulseLine accessible text alternative", () => {
  const cases: [PulseState, string][] = [
    ["idle", "Idle"],
    ["requesting", "Waiting for audio"],
    ["streaming", "Audio playing"],
    ["ended", "Finished"],
    ["cancelled", "Cancelled"],
  ];
  for (const [state, text] of cases) {
    it(`test_pulseline_render_${state}_hasstatustext`, () => {
      stubMatchMedia(false);
      const { container } = render(<PulseLine state={state} />);
      expect(screen.getByRole("status").textContent).toBe(text);
      expect(container.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    });
  }

  it("test_pulseline_render_error_statusincludescode", () => {
    stubMatchMedia(false);
    render(<PulseLine state="error" errorCode="rate_limited" />);
    expect(screen.getByRole("status").textContent).toBe("Failed, code rate_limited");
    expect(screen.getByTestId("pulseline-readout").textContent).toBe("Failed");
  });

  it("test_pulseline_render_disabled_statusexplainsreason", () => {
    stubMatchMedia(false);
    render(<PulseLine state="disabled" />);
    expect(screen.getByRole("status").textContent).toBe("Unavailable");
  });

  it("test_pulseline_render_statusonlychangesonstatechange", () => {
    stubMatchMedia(false);
    const { rerender } = render(<PulseLine state="streaming" ttfaMs={100} />);
    const node = screen.getByRole("status");
    rerender(<PulseLine state="streaming" ttfaMs={100} />);
    expect(screen.getByRole("status")).toBe(node);
    expect(node.textContent).toBe("Audio playing");
  });

  it("test_pulseline_render_ttfa_readoutandlabel", () => {
    stubMatchMedia(false);
    render(<PulseLine state="streaming" ttfaMs={480} />);
    expect(screen.getByTestId("pulseline-readout").textContent).toBe("480 ms");
    expect(screen.getByText("measured in this browser, including network")).toBeTruthy();
  });

  it("test_pulseline_formatttfa_idleandwhole", () => {
    expect(formatTtfa(undefined)).toBe("-- ms");
    expect(formatTtfa(479.6)).toBe("480 ms");
  });
});

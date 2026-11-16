"use client";

import { useEffect, useRef, useState } from "react";
import {
  METER_STEP_MS,
  SETTLE_MS,
  createMockAudioStream,
  createWaveform,
  drawWaveform,
  errorStatus,
  formatTtfa,
  pushSample,
  quantiseLevel,
  resetWaveform,
  ttfaAnnouncement,
  type AmplitudeSource,
  type Palette,
  type Waveform,
} from "../lib/pulseline";
import { t, type MessageKey } from "../lib/messages";

export type PulseState =
  "idle" | "requesting" | "streaming" | "ended" | "cancelled" | "error" | "disabled";

export interface PulseLineProps {
  readonly state: PulseState;
  /** Measured time to first audio in ms. Frozen readout once first audio has arrived. */
  readonly ttfaMs?: number;
  /** `performance.now()` value taken when the request was sent; drives the counting readout. */
  readonly requestStartedAt?: number | undefined;
  /** Audio level source. The mock stream in Sprint 2, the decoded stream later. */
  readonly source?: AmplitudeSource;
  readonly errorCode?: string;
  /** Forces the static meter (the in-app "Reduce motion" setting). */
  readonly reduceMotion?: boolean;
}

const STATUS_KEYS: Record<Exclude<PulseState, "error">, MessageKey> = {
  idle: "pulse.status.idle",
  requesting: "pulse.status.requesting",
  streaming: "pulse.status.streaming",
  ended: "pulse.status.ended",
  cancelled: "pulse.status.cancelled",
  disabled: "pulse.status.disabled",
};

const PALETTE_REFRESH_FRAMES = 30;
const CARRIER_STEP = 1.7;
const FLAT_EPSILON = 0.001;

function usePrefersReducedMotion(override: boolean | undefined): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches);
    };
    query.addEventListener("change", onChange);
    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);
  return override === true || reduced;
}

/** Colours come from the design tokens at runtime; forced-colours uses CanvasText. */
function readPalette(canvas: HTMLCanvasElement, flat: boolean, dpr: number): Palette {
  const style = getComputedStyle(canvas);
  const forced = window.matchMedia("(forced-colors: active)").matches;
  const token = flat ? "--text-2" : "--accent";
  const width = parseFloat(style.getPropertyValue("--focus-ring-width")) || 1;
  return {
    line: forced ? "CanvasText" : style.getPropertyValue(token).trim() || "CanvasText",
    width: width * dpr,
  };
}

function readoutText(props: PulseLineProps, reduced: boolean): string {
  const { state, ttfaMs } = props;
  if (state === "error") return t("pulse.readout.failed");
  if (state === "requesting") {
    return reduced ? t("pulse.readout.waiting") : formatTtfa(0);
  }
  return formatTtfa(ttfaMs);
}

export function PulseLine(props: PulseLineProps) {
  const { state, ttfaMs, requestStartedAt, errorCode, reduceMotion } = props;
  const reduced = usePrefersReducedMotion(reduceMotion);
  const [fallbackSource] = useState(createMockAudioStream);
  const source = props.source ?? fallbackSource;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<Waveform | null>(null);
  const levelRef = useRef(0);
  const [meterLevel, setMeterLevel] = useState(0);

  // Animated line: one rAF loop, fixed buffer, nothing allocated per frame.
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    waveRef.current ??= createWaveform();
    const wave = waveRef.current;
    const flatColour = state === "error" || state === "disabled";
    const streamStart = performance.now();
    const dpr = window.devicePixelRatio || 1;
    let palette = readPalette(canvas, flatColour, dpr);
    let frame = 0;
    let phase = 0;
    let last = streamStart;
    let raf = 0;
    let lastReadout = "";

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (document.hidden) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      if (frame % PALETTE_REFRESH_FRAMES === 0) {
        palette = readPalette(canvas, flatColour, dpr);
      }
      frame += 1;

      if (state === "streaming") {
        levelRef.current = source(now - streamStart);
      } else if (state === "ended") {
        levelRef.current *= Math.exp((-3 * dt) / SETTLE_MS);
      } else {
        levelRef.current = 0;
        resetWaveform(wave);
      }
      phase += CARRIER_STEP;
      pushSample(wave, levelRef.current * Math.sin(phase));
      drawWaveform(ctx, wave, w, h, palette);

      const counting = state === "requesting" && requestStartedAt !== undefined;
      if (counting) {
        const text = formatTtfa(now - requestStartedAt);
        const node = readoutRef.current?.firstChild;
        if (node && text !== lastReadout) {
          node.nodeValue = text;
          lastReadout = text;
        }
      }
      const settled = state !== "streaming" && !counting && levelRef.current < FLAT_EPSILON;
      if (!settled) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reduced, state, source, requestStartedAt]);

  // Reduced motion: a level meter that steps at most four times per second.
  useEffect(() => {
    if (!reduced) return;
    const start = performance.now();
    const read = () => {
      setMeterLevel(state === "streaming" ? quantiseLevel(source(performance.now() - start)) : 0);
    };
    read();
    const id = setInterval(read, METER_STEP_MS);
    return () => {
      clearInterval(id);
    };
  }, [reduced, state, source]);

  const status = state === "error" ? errorStatus(errorCode) : t(STATUS_KEYS[state]);
  const frozen = ttfaMs !== undefined && state !== "idle" && state !== "requesting";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span
          ref={readoutRef}
          data-testid="pulseline-readout"
          className="min-w-(--space-8) font-mono text-mono tabular-nums text-text-1"
        >
          {readoutText(props, reduced)}
        </span>
        {reduced ? (
          <div aria-hidden="true" className="h-(--focus-ring-width) w-(--space-9) bg-bg-3">
            <div
              data-testid="pulseline-meter"
              className={`h-full ${state === "error" || state === "disabled" ? "bg-text-2" : "bg-accent"}`}
              style={{ width: `${String(meterLevel * 100)}%` }}
            />
          </div>
        ) : (
          <canvas ref={canvasRef} aria-hidden="true" className="h-(--space-6) min-w-0 flex-1" />
        )}
        <span role="status" className={reduced ? "text-small text-text-1" : "sr-only"}>
          {status}
        </span>
        <span aria-live="polite" className="sr-only">
          {frozen ? ttfaAnnouncement(ttfaMs) : ""}
        </span>
      </div>
      <span className="text-small text-text-2">{t("pulse.label.measured")}</span>
    </div>
  );
}

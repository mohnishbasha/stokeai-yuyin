// Pure pieces of the pulse line (DESIGN 5.17 and 7): the mock audio stream, a fixed-size sample
// buffer, the canvas draw routine, and text helpers. No React and no DOM, so each piece is unit
// testable and the real stream can replace the mock through the same `AmplitudeSource` type.
import { t } from "./messages";

/** Returns the audio level in [0, 1] at `tMs` milliseconds since streaming began. */
export type AmplitudeSource = (tMs: number) => number;

/** Fixed point budget: the waveform never holds or draws more points than this. */
export const POINT_BUDGET = 192;

/** Reduced motion: the meter bar steps at most this often (DESIGN 7). */
export const METER_STEP_MS = 250;
const METER_STEPS = 8;

/** Time for the line to return to flat after the stream ends (the configured settle time). */
export const SETTLE_MS = 400;

/**
 * A deterministic stand-in for decoded audio: a slow speech-like envelope (syllable bursts with
 * short pauses) built from two sines. Same input, same output, always within [0, 1].
 */
export function createMockAudioStream(): AmplitudeSource {
  return (tMs) => {
    const syllable = 0.5 + 0.5 * Math.sin(tMs * 0.012);
    const phrase = 0.5 + 0.5 * Math.sin(tMs * 0.0021 + 1.3);
    const level = syllable * (0.35 + 0.65 * phrase);
    return level < 0 ? 0 : level > 1 ? 1 : level;
  };
}

export interface Waveform {
  /** Fixed-length ring of signed samples in [-1, 1]. Allocated once. */
  readonly samples: Float32Array;
  head: number;
}

export function createWaveform(): Waveform {
  return { samples: new Float32Array(POINT_BUDGET), head: 0 };
}

export function pushSample(wave: Waveform, value: number): void {
  wave.samples[wave.head] = value;
  wave.head = (wave.head + 1) % POINT_BUDGET;
}

export function resetWaveform(wave: Waveform): void {
  wave.samples.fill(0);
  wave.head = 0;
}

/** The subset of CanvasRenderingContext2D the line needs, so tests can record calls. */
export interface DrawContext {
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  clearRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

export interface Palette {
  readonly line: string;
  readonly width: number;
}

/** Draws the ring oldest to newest as one path. No allocation per frame. */
export function drawWaveform(
  ctx: DrawContext,
  wave: Waveform,
  width: number,
  height: number,
  palette: Palette,
): void {
  const mid = height / 2;
  const amp = Math.max(0, mid - palette.width);
  const step = width / (POINT_BUDGET - 1);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = palette.width;
  ctx.beginPath();
  ctx.moveTo(0, mid - (wave.samples[wave.head] ?? 0) * amp);
  for (let i = 1; i < POINT_BUDGET; i += 1) {
    const s = wave.samples[(wave.head + i) % POINT_BUDGET] ?? 0;
    ctx.lineTo(i * step, mid - s * amp);
  }
  ctx.stroke();
}

/** Snaps a level to the meter's coarse steps and clamps to [0, 1]. */
export function quantiseLevel(level: number): number {
  const clamped = level < 0 ? 0 : level > 1 ? 1 : level;
  return Math.round(clamped * METER_STEPS) / METER_STEPS;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => values[key] ?? "");
}

/** The one formatter for the readout: whole milliseconds, or the idle placeholder. */
export function formatTtfa(ms: number | undefined): string {
  if (ms === undefined) return t("pulse.readout.idle");
  return fill(t("pulse.readout.unit"), { n: String(Math.round(ms)) });
}

export function ttfaAnnouncement(ms: number): string {
  return fill(t("pulse.ttfa"), { n: String(Math.round(ms)) });
}

export function errorStatus(code: string | undefined): string {
  return fill(t("pulse.status.error"), { code: code ?? "" });
}

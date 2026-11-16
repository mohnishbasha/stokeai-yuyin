// Status variants shared by Badge, Banner and Toast. Every status pairs an icon glyph with
// text; colour is never the only signal (DESIGN 2.3).

export const STATUSES = ["neutral", "ok", "warn", "err", "info"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_GLYPH: Record<Status, string> = {
  neutral: "•",
  ok: "✓",
  warn: "!",
  err: "×",
  info: "i",
};

export const STATUS_TEXT_CLASS: Record<Status, string> = {
  neutral: "text-text-1",
  ok: "text-ok",
  warn: "text-warn",
  err: "text-err",
  info: "text-info",
};

export const STATUS_BORDER_CLASS: Record<Status, string> = {
  neutral: "border-line-strong",
  ok: "border-ok",
  warn: "border-warn",
  err: "border-err",
  info: "border-info",
};

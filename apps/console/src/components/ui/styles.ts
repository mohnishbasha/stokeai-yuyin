// Class fragments shared by the form controls. Only token-backed utilities (tokens.css) are
// used; the focus ring comes from the global `:focus-visible` rule and is never removed.

/** Fill, border, and text of a text-entry control (DESIGN 5 shared states). */
export const FIELD_CLASS =
  "w-full rounded-control border border-line-strong bg-bg-2 px-3 text-body text-text-0 hover:bg-bg-3 aria-disabled:text-text-2 aria-[invalid=true]:border-err";

export const LABEL_CLASS = "text-small font-medium text-text-0";
export const HELPER_CLASS = "text-small text-text-1";
export const ERROR_CLASS = "text-small text-err";
export const MONO_CLASS = "font-mono text-mono tabular-nums";

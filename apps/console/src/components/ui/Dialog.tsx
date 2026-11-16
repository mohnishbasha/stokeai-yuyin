"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t } from "../../lib/messages";

export interface DialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Name the consequence ("Revoke key sk_live_...a91f?"), DESIGN 5.8. */
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  /** Actions, primary last. */
  readonly footer?: ReactNode;
  /** A request is in flight: Escape and the scrim do not close the dialog. */
  readonly busy?: boolean;
  /** Inline error summary at the top of the body. Focus moves to it. */
  readonly error?: string;
}

const FOCUSABLE =
  'a[href], button:not([aria-disabled="true"]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** A modal dialog: focus is trapped, Escape closes, focus returns to the trigger (DESIGN 5.8). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy = false,
  error,
}: DialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first =
      errorRef.current ??
      dialog?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialog?.querySelector<HTMLElement>(FOCUSABLE) ??
      dialog;
    first?.focus();
    return () => {
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open && error !== undefined) errorRef.current?.focus();
  }, [open, error]);

  if (!open || typeof document === "undefined") return null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = items[0];
    const last = items[items.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      data-testid="dialog-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className="fixed inset-0 z-20 flex items-center justify-center bg-bg-0/80 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description !== undefined ? `${id}-desc` : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex w-full max-w-prose flex-col gap-4 rounded-panel border border-line-strong bg-bg-1 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-title`} className="text-h3 font-medium text-text-0">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            aria-disabled={busy}
            className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-small text-text-0 hover:bg-bg-3"
          >
            {t("common.close")}
          </button>
        </div>
        {description !== undefined ? (
          <p id={`${id}-desc`} className="text-body text-text-1">
            {description}
          </p>
        ) : null}
        {error !== undefined ? (
          <div
            ref={errorRef}
            role="alert"
            tabIndex={-1}
            className="rounded-control border border-err p-3 text-body text-err"
          >
            {error}
          </div>
        ) : null}
        {children}
        {footer !== undefined ? <div className="flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";
import {
  STATUS_BORDER_CLASS,
  STATUS_GLYPH,
  STATUS_TEXT_CLASS,
  type Status,
} from "../../lib/status";

export type ToastKind = "success" | "info" | "error";

export interface ToastInput {
  readonly kind: ToastKind;
  /** State the outcome and where to find it. A toast never holds the only copy of something important. */
  readonly message: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

interface ToastEntry extends ToastInput {
  readonly id: number;
}

interface ToastApi {
  readonly push: (toast: ToastInput) => number;
  readonly dismiss: (id: number) => void;
}

/** Success and info toasts last at least 6 seconds (DESIGN 5.9). Errors stay until dismissed. */
export const TOAST_DURATION_MS = 6_000;

const KIND_STATUS: Record<ToastKind, Status> = { success: "ok", info: "info", error: "err" };
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast must be used inside a ToastProvider");
  return api;
}

/** Holds the toast queue and renders the polite live region. F8 moves focus to it. */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const next = useRef(1);
  const region = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: ToastInput) => {
    const id = next.current;
    next.current += 1;
    setToasts((current) => [...current, { ...toast, id }]);
    return id;
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F8") region.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        ref={region}
        role="region"
        aria-label={t("toast.region")}
        aria-live="polite"
        tabIndex={-1}
        className="fixed right-4 bottom-4 z-30 flex max-w-prose flex-col gap-2"
      >
        <ul className="flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </ul>
      </div>
    </ToastContext>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  readonly toast: ToastEntry;
  readonly onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const status = KIND_STATUS[toast.kind];

  useEffect(() => {
    if (toast.kind === "error" || paused) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, TOAST_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [paused, toast.kind, toast.id, onDismiss]);

  return (
    <li
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={() => {
        setPaused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onDismiss(toast.id);
      }}
      className={cx(
        "flex list-none items-center gap-3 rounded-control border bg-bg-2 px-3 py-2 text-body text-text-0",
        STATUS_BORDER_CLASS[status],
      )}
    >
      <span aria-hidden="true" className={STATUS_TEXT_CLASS[status]}>
        {STATUS_GLYPH[status]}
      </span>
      <span>{toast.message}</span>
      {toast.action !== undefined ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="min-h-(--control-height) rounded-control px-2 text-small text-accent hover:bg-bg-3"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          onDismiss(toast.id);
        }}
        className="min-h-(--control-height) rounded-control px-2 text-small text-text-1 hover:bg-bg-3"
      >
        {t("common.dismiss")}
      </button>
    </li>
  );
}

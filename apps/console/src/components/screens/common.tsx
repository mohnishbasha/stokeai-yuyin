"use client";

import type { ReactNode } from "react";
import { t, type MessageKey } from "../../lib/messages";
import type { ScreenResult } from "../../lib/data/types";
import { ErrorState } from "../ui/ErrorState";
import { useToast } from "../ui/Toast";

/** The page shell every console screen uses: one main landmark, one h1, optional actions. */
export function ScreenPage({
  title,
  lead,
  actions,
  children,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto flex max-w-content flex-col gap-5 p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-medium text-text-0">{title}</h1>
          {lead !== undefined ? <p className="max-w-prose text-body text-text-1">{lead}</p> : null}
        </div>
        {actions !== undefined ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

export function Panel({
  title,
  children,
}: {
  readonly title?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-panel border border-line bg-bg-1 p-4">
      {title !== undefined ? <h2 className="text-h3 font-medium text-text-0">{title}</h2> : null}
      {children}
    </section>
  );
}

export function LoadingPlaceholder() {
  return (
    <div aria-busy="true" className="h-(--space-9) rounded-panel bg-bg-2">
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

/** A screen-level failure with its code and trace ID and a Retry that reloads the page. */
export function ScreenError({
  code,
  traceId,
  cause = "screen.error.cause",
}: {
  readonly code: string;
  readonly traceId: string;
  readonly cause?: MessageKey;
}) {
  return (
    <ErrorState
      title={t("screen.error.title")}
      cause={t(cause)}
      code={code}
      traceId={traceId}
      onRetry={() => {
        window.location.reload();
      }}
    />
  );
}

/** Renders the loading placeholder, the error, or the data, in that order of precedence. */
export function Result<T>({
  result,
  cause,
  children,
}: {
  readonly result: ScreenResult<T>;
  readonly cause?: MessageKey;
  readonly children: (data: T) => ReactNode;
}) {
  if (result.status === "loading") return <LoadingPlaceholder />;
  if (result.status === "error") {
    return (
      <ScreenError
        code={result.code}
        traceId={result.traceId}
        {...(cause !== undefined ? { cause } : {})}
      />
    );
  }
  return <>{children(result.data)}</>;
}

/** For actions that need the backend: tells the reviewer nothing was saved. */
export function useMockAction(message: MessageKey = "screen.mock.notConnected"): () => void {
  const toast = useToast();
  return () => {
    toast.push({ kind: "info", message: t(message) });
  };
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { t, tf } from "../../lib/messages";
import { Button } from "./Button";

export interface ErrorStateProps {
  readonly title: string;
  /** What went wrong, in plain words, and what to do next. */
  readonly cause: string;
  readonly code?: string;
  readonly traceId?: string;
  readonly onRetry?: () => void;
  readonly retrying?: boolean;
  /** Seconds before Retry is allowed (for example after a 429). */
  readonly retryAfterSeconds?: number;
  readonly help?: { readonly label: string; readonly href: string };
  /** The error follows a user action, so it is announced as an alert. */
  readonly afterUserAction?: boolean;
  readonly focusOnMount?: boolean;
}

/** A recoverable failure with its code, trace ID, and a retry (DESIGN 5.15). */
export function ErrorState({
  title,
  cause,
  code,
  traceId,
  onRetry,
  retrying = false,
  retryAfterSeconds = 0,
  help,
  afterUserAction = false,
  focusOnMount = false,
}: ErrorStateProps) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    setRemaining(retryAfterSeconds);
  }, [retryAfterSeconds]);

  const waiting = remaining > 0;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1_000);
    return () => {
      clearInterval(timer);
    };
  }, [waiting]);

  return (
    <section
      aria-labelledby={headingId}
      {...(afterUserAction ? { role: "alert" } : {})}
      className="flex flex-col items-start gap-3 rounded-panel border border-err bg-bg-1 p-6"
    >
      <h2 id={headingId} ref={heading} tabIndex={-1} className="text-h3 font-medium text-text-0">
        {title}
      </h2>
      <p className="max-w-prose text-body text-text-1">{cause}</p>
      {code !== undefined || traceId !== undefined ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-small text-text-1">
          {code !== undefined ? (
            <>
              <dt>{t("error.code")}</dt>
              <dd>
                <code>{code}</code>
              </dd>
            </>
          ) : null}
          {traceId !== undefined ? (
            <>
              <dt>{t("error.trace")}</dt>
              <dd>
                <code>{traceId}</code>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {onRetry !== undefined ? (
        <Button onClick={onRetry} disabled={waiting} loading={retrying}>
          {waiting ? tf("error.retryIn", { n: remaining }) : t("error.retry")}
        </Button>
      ) : null}
      {help !== undefined ? <a href={help.href}>{help.label}</a> : null}
    </section>
  );
}

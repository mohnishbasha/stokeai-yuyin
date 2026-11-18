"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { t } from "../../lib/messages";
import { buildSpeechSnippets } from "../../lib/snippets";
import { Button } from "./Button";
import { ErrorState } from "./ErrorState";
import { useCopy } from "./useCopy";

export interface KeyRevealProps {
  /** The newly minted secret. It is rendered until Done is chosen, then dropped for good. */
  readonly secret: string | null;
  readonly onDone: () => void;
  readonly loading?: boolean;
  /** Set when minting failed. No partial key is ever shown. */
  readonly errorCode?: string;
  readonly onRetry?: () => void;
}

/** Shows a secret exactly once and gates dismissal on an acknowledgement (DESIGN 5.17). */
export function KeyReveal({ secret, onDone, loading = false, errorCode, onRetry }: KeyRevealProps) {
  const checkId = useId();
  const keyRef = useRef<HTMLElement>(null);
  const [stored, setStored] = useState(false);
  const [gone, setGone] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const { state, copy } = useCopy();
  const hasSecret = secret !== null && !gone;

  useEffect(() => {
    if (hasSecret) keyRef.current?.focus();
  }, [hasSecret]);

  if (loading) {
    return (
      <div aria-busy="true" className="h-(--space-9) rounded-panel bg-bg-2">
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }
  if (gone) {
    return <p className="text-body text-text-1">{t("key.gone")}</p>;
  }
  if (errorCode !== undefined || secret === null) {
    return (
      <ErrorState
        title={t("key.mintFailed")}
        cause={t("key.mintFailedCause")}
        {...(errorCode !== undefined ? { code: errorCode } : {})}
        {...(onRetry !== undefined ? { onRetry } : {})}
        afterUserAction
      />
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !stored) {
      event.preventDefault();
      setBlocked(true);
    }
  }

  function done() {
    if (!stored) return;
    setGone(true);
    onDone();
  }

  const curl = buildSpeechSnippets()[0]?.code ?? "";
  const copyLabel =
    state === "copied"
      ? t("common.copied")
      : state === "failed"
        ? t("common.copyFailed")
        : t("common.copy");

  return (
    <section
      aria-label={t("key.label")}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-3 rounded-panel border border-warn bg-bg-1 p-4"
    >
      <p className="text-small font-medium text-warn">
        <span aria-hidden="true">{"! "}</span>
        {t("key.shownOnce")}
      </p>
      <p className="text-body text-text-1">{t("key.explain")}</p>
      <div className="flex items-center gap-3">
        <code ref={keyRef} tabIndex={-1} className="flex-1 break-all rounded-control bg-bg-0 p-3">
          {secret}
        </code>
        <Button
          onClick={() => {
            void copy(secret);
          }}
        >
          {copyLabel}
        </Button>
      </div>
      <p className="text-small text-text-1">{t("key.curl")}</p>
      <pre
        role="region"
        aria-label={t("key.curl")}
        tabIndex={0}
        className="overflow-x-auto rounded-control bg-bg-0 p-3"
      >
        {curl}
      </pre>
      <div className="flex items-center gap-2">
        <input
          id={checkId}
          type="checkbox"
          checked={stored}
          onChange={(event) => {
            setStored(event.target.checked);
            setBlocked(false);
          }}
        />
        <label htmlFor={checkId} className="text-body text-text-0">
          {t("key.stored")}
        </label>
      </div>
      <p role="status" className="text-small text-warn">
        {blocked ? t("key.escapeBlocked") : ""}
      </p>
      <div>
        <Button variant="primary" disabled={!stored} onClick={done}>
          {t("key.done")}
        </Button>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { t, tf } from "../../lib/messages";
import type { Snippet } from "../../lib/snippets";
import { Button } from "./Button";
import { useCopy } from "./useCopy";

export interface CodeBlockProps {
  readonly snippets: readonly Snippet[];
  readonly loading?: boolean;
}

const STORAGE_KEY = "yuyin.codeLanguage";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Request samples with language tabs and a copy button (DESIGN 5.11). */
export function CodeBlock({ snippets, loading = false }: CodeBlockProps) {
  const uid = useId();
  const [selected, setSelected] = useState<string | undefined>(snippets[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const { state, copy } = useCopy();

  useEffect(() => {
    const stored = readStored();
    if (stored !== null && snippets.some((snippet) => snippet.id === stored)) setSelected(stored);
  }, [snippets]);

  const active = snippets.find((snippet) => snippet.id === selected) ?? snippets[0];

  function choose(id: string) {
    setSelected(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage can be unavailable; the choice then lasts for this view only.
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = snippets.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const to = targets[event.key];
    const snippet = to === undefined ? undefined : snippets[to];
    if (snippet === undefined) return;
    event.preventDefault();
    refs.current.get(snippet.id)?.focus();
    choose(snippet.id);
  }

  if (loading || active === undefined) {
    return (
      <div aria-busy="true" className="h-(--space-9) rounded-panel bg-bg-2">
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }

  const empty = active.code === "";
  const label =
    state === "copied"
      ? t("common.copied")
      : state === "failed"
        ? t("common.copyFailed")
        : t("common.copy");

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-bg-1 p-3">
      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label={t("code.languages")} className="flex gap-1">
          {snippets.map((snippet, index) => {
            const isSelected = snippet.id === active.id;
            return (
              <button
                key={snippet.id}
                ref={(node) => {
                  if (node === null) refs.current.delete(snippet.id);
                  else refs.current.set(snippet.id, node);
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${snippet.id}`}
                aria-selected={isSelected}
                aria-controls={`${uid}-panel`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => {
                  choose(snippet.id);
                }}
                onKeyDown={(event) => {
                  onKeyDown(event, index);
                }}
                className={cx(
                  "min-h-(--control-height) rounded-control px-3 text-body",
                  isSelected ? "bg-bg-3 text-text-0" : "text-text-1 hover:bg-bg-3",
                )}
              >
                {snippet.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="secondary"
          disabled={empty}
          onClick={() => {
            void copy(active.code);
          }}
        >
          {label}
        </Button>
        <span aria-live="polite" className="sr-only">
          {state === "idle" ? "" : label}
        </span>
      </div>
      <div
        role="region"
        id={`${uid}-panel`}
        aria-label={tf("code.region", { language: active.label })}
        tabIndex={0}
        className="overflow-x-auto rounded-control bg-bg-0 p-3"
      >
        <pre>
          <code>{active.code}</code>
        </pre>
      </div>
      <p className="text-small text-text-1">{t("code.keyNotice")}</p>
    </div>
  );
}

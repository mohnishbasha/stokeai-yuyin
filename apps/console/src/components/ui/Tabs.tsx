"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly panel: ReactNode;
  readonly disabled?: boolean;
}

export interface TabsProps {
  /** Names the tab list for assistive technology. */
  readonly label: string;
  readonly tabs: readonly TabItem[];
  /** Controlled selection. Leave unset for an uncontrolled component. */
  readonly selected?: string;
  readonly onChange?: (id: string) => void;
  /** `auto` selects on arrow keys; `manual` waits for Enter or Space (panels that load data). */
  readonly activation?: "auto" | "manual";
}

/** Peer views in one context, following the ARIA tabs pattern (DESIGN 5.7). */
export function Tabs({ label, tabs, selected, onChange, activation = "auto" }: TabsProps) {
  const uid = useId();
  const [inner, setInner] = useState(tabs[0]?.id);
  const current = selected ?? inner;
  const [focused, setFocused] = useState<string | undefined>(undefined);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const enabled = tabs.filter((tab) => !tab.disabled);
  const stop = focused ?? current;

  function select(id: string) {
    setInner(id);
    setFocused(undefined);
    onChange?.(id);
  }

  function move(toId: string | undefined) {
    if (toId === undefined) return;
    refs.current.get(toId)?.focus();
    if (activation === "auto") select(toId);
    else setFocused(toId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const index = enabled.findIndex((tab) => tab.id === id);
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        move(enabled[(index + 1) % enabled.length]?.id);
        break;
      case "ArrowLeft":
        event.preventDefault();
        move(enabled[(index - 1 + enabled.length) % enabled.length]?.id);
        break;
      case "Home":
        event.preventDefault();
        move(enabled[0]?.id);
        break;
      case "End":
        event.preventDefault();
        move(enabled[enabled.length - 1]?.id);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        select(id);
        break;
    }
  }

  const active = tabs.find((tab) => tab.id === current);

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
        {tabs.map((tab) => {
          const isSelected = tab.id === current;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node === null) refs.current.delete(tab.id);
                else refs.current.set(tab.id, node);
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`${uid}-panel`}
              aria-disabled={tab.disabled === true ? true : undefined}
              tabIndex={tab.id === stop ? 0 : -1}
              onClick={() => {
                if (tab.disabled !== true) select(tab.id);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, tab.id);
              }}
              className={cx(
                "min-h-(--control-height) border-b-2 px-3 text-body",
                isSelected
                  ? "border-accent bg-bg-3 text-text-0"
                  : "border-transparent text-text-1 hover:bg-bg-3",
                tab.disabled === true && "text-text-2",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={active !== undefined ? `${uid}-tab-${active.id}` : undefined}
        tabIndex={0}
      >
        {active?.panel}
      </div>
    </div>
  );
}

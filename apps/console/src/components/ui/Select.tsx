"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";
import { ERROR_CLASS, FIELD_CLASS, HELPER_CLASS, LABEL_CLASS } from "./styles";

export interface SelectOption {
  readonly value: string;
  /** The native name, for example "हिन्दी". */
  readonly label: string;
  /** The English name shown next to a native one, for example "Hindi". */
  readonly secondary?: string;
}

export interface SelectProps {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly value?: string;
  readonly onChange: (value: string) => void;
  readonly name?: string;
  readonly helper?: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

const TYPEAHEAD_RESET_MS = 600;

/** A single-select listbox following the ARIA select-only combobox pattern (DESIGN 5.4). */
export function Select({
  label,
  options,
  value,
  onChange,
  name,
  helper,
  error,
  disabled = false,
  loading = false,
}: SelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [inner, setInner] = useState<string | undefined>(value);
  const typed = useRef({ text: "", at: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = value ?? inner;
  const selected = options.find((option) => option.value === current);
  const last = options.length - 1;
  const inactive = disabled || loading;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      const list = document.getElementById(listId);
      if (!triggerRef.current?.contains(target) && !list?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, listId]);

  function show() {
    if (inactive || options.length === 0) return;
    const index = options.findIndex((option) => option.value === current);
    setActive(index >= 0 ? index : 0);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option === undefined) return;
    setInner(option.value);
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function typeahead(key: string) {
    const now = Date.now();
    const text = (now - typed.current.at > TYPEAHEAD_RESET_MS ? "" : typed.current.text) + key;
    typed.current = { text, at: now };
    const lower = text.toLowerCase();
    const start = text.length === 1 ? active + 1 : active;
    const ordered = [...options.keys()].map((i) => (start + i) % options.length);
    const match = ordered.find((i) => options[i]?.label.toLowerCase().startsWith(lower));
    if (match !== undefined) setActive(match);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (inactive) return;
    const { key } = event;
    if (!open) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        show();
      }
      return;
    }
    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (key.length === 1) typeahead(key);
    }
  }

  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy =
    [helper !== undefined ? helperId : null, error !== undefined ? errorId : null]
      .filter((v): v is string => v !== null)
      .join(" ") || undefined;

  return (
    <div className="relative flex flex-col gap-1">
      <span id={`${id}-label`} className={LABEL_CLASS}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${id}-label ${id}`}
        aria-activedescendant={open ? `${id}-opt-${String(active)}` : undefined}
        aria-disabled={disabled}
        aria-busy={loading || undefined}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => {
          if (open) setOpen(false);
          else show();
        }}
        onKeyDown={handleKeyDown}
        className={cx(FIELD_CLASS, "min-h-(--control-height) text-left")}
      >
        {loading
          ? t("select.loading")
          : selected !== undefined
            ? selected.label
            : t("select.placeholder")}
        {selected?.secondary !== undefined && !loading ? (
          <span className="text-text-1">{`, ${selected.secondary}`}</span>
        ) : null}
        <span aria-hidden="true" className="float-right text-text-1">
          {"▾"}
        </span>
      </button>
      {name !== undefined ? <input type="hidden" name={name} value={current ?? ""} /> : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="absolute top-full z-10 mt-1 w-full rounded-control border border-line-strong bg-bg-1 py-1"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-opt-${String(index)}`}
              role="option"
              aria-selected={option.value === current}
              onClick={() => {
                choose(index);
              }}
              className={cx(
                "flex cursor-default gap-2 border-l-2 px-3 py-1 text-body text-text-0",
                index === active ? "border-accent bg-bg-3" : "border-transparent",
              )}
            >
              <span>{option.label}</span>
              {option.secondary !== undefined ? (
                <span className="text-text-1">{`, ${option.secondary}`}</span>
              ) : null}
              {option.value === current ? <span aria-hidden="true">{"✓"}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {helper !== undefined ? (
        <p id={helperId} className={HELPER_CLASS}>
          {helper}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={errorId} className={ERROR_CLASS}>
          <span aria-hidden="true">{"× "}</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

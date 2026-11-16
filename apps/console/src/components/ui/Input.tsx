"use client";

import { useId, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";
import { ERROR_CLASS, FIELD_CLASS, HELPER_CLASS, LABEL_CLASS } from "./styles";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  /** A visible label. The placeholder is never the label (DESIGN 5.2). */
  readonly label: string;
  readonly helper?: string;
  readonly error?: string;
  /** Content after the control, for example a unit or a spinner while validating. */
  readonly suffix?: ReactNode;
  /** When set, a Clear button is shown. Escape clears only while that button has focus. */
  readonly onClear?: () => void;
  readonly counter?: string;
}

export function Input({
  label,
  helper,
  error,
  suffix,
  onClear,
  counter,
  className,
  ...rest
}: InputProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;
  const describedBy =
    [
      helper !== undefined ? helperId : null,
      counter !== undefined ? counterId : null,
      error !== undefined ? errorId : null,
    ]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined;

  function handleClearKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClear?.();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          {...rest}
          id={id}
          aria-invalid={error !== undefined ? true : undefined}
          aria-describedby={describedBy}
          className={cx(FIELD_CLASS, "min-h-(--control-height)", className)}
        />
        {onClear !== undefined ? (
          <button
            type="button"
            onClick={onClear}
            onKeyDown={handleClearKey}
            className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-small text-text-0 hover:bg-bg-3"
          >
            {t("common.clear")}
          </button>
        ) : null}
        {suffix}
      </div>
      {helper !== undefined ? (
        <p id={helperId} className={HELPER_CLASS}>
          {helper}
        </p>
      ) : null}
      {counter !== undefined ? (
        <p id={counterId} className={cx(HELPER_CLASS, "font-mono tabular-nums")}>
          {counter}
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

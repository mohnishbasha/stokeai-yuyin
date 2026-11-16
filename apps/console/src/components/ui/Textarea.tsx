"use client";

import {
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { countCodePoints } from "../../lib/count";
import { cx } from "../../lib/cx";
import { t, tf } from "../../lib/messages";
import { ERROR_CLASS, FIELD_CLASS, HELPER_CLASS, LABEL_CLASS } from "./styles";

export interface TextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "value" | "defaultValue"
> {
  readonly label: string;
  readonly value?: string;
  readonly defaultValue?: string;
  /** Maximum code points. The text is never truncated; the user is told how far over it is. */
  readonly limit?: number;
  /** Estimated cost line, already formatted by the money helper. */
  readonly estimate?: string;
  readonly helper?: string;
  readonly error?: string;
  /** Called with true or false when the over-limit state changes, so a host can disable submit. */
  readonly onOverLimitChange?: (over: boolean) => void;
  /** Called for Ctrl or Cmd plus Enter. Tab is never captured. */
  readonly onSubmitShortcut?: () => void;
  readonly onValueChange?: (value: string) => void;
}

/** Multi-line input with a live Unicode code point counter (DESIGN 5.3). */
export function Textarea({
  label,
  value,
  defaultValue = "",
  limit,
  estimate,
  helper,
  error,
  onOverLimitChange,
  onSubmitShortcut,
  onValueChange,
  onChange,
  onKeyDown,
  className,
  ...rest
}: TextareaProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const count = countCodePoints(text);
  const over = limit !== undefined && count > limit ? count - limit : 0;

  useEffect(() => {
    onOverLimitChange?.(over > 0);
  }, [over, onOverLimitChange]);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInner(event.target.value);
    onValueChange?.(event.target.value);
    onChange?.(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      onSubmitShortcut !== undefined
    ) {
      event.preventDefault();
      onSubmitShortcut();
    }
    onKeyDown?.(event);
  }

  const counterText =
    limit === undefined ? tf("count.plain", { count }) : tf("count.of", { count, limit });
  const counterId = `${id}-counter`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const invalid = over > 0 || error !== undefined;
  const describedBy = [
    counterId,
    helper !== undefined || onSubmitShortcut !== undefined ? helperId : null,
    over > 0 || error !== undefined ? errorId : null,
  ]
    .filter((v): v is string => v !== null)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className={cx(FIELD_CLASS, "min-h-(--control-height-touch) resize-y py-2", className)}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          id={counterId}
          className={cx("font-mono text-mono tabular-nums", over > 0 ? "text-err" : "text-text-1")}
        >
          {counterText}
        </p>
        {estimate !== undefined ? <p className={HELPER_CLASS}>{estimate}</p> : null}
      </div>
      {helper !== undefined || onSubmitShortcut !== undefined ? (
        <p id={helperId} className={HELPER_CLASS}>
          {[helper, onSubmitShortcut !== undefined ? t("textarea.shortcut") : undefined]
            .filter((part): part is string => part !== undefined)
            .join(" ")}
        </p>
      ) : null}
      {over > 0 || error !== undefined ? (
        <p id={errorId} className={ERROR_CLASS}>
          <span aria-hidden="true">{"× "}</span>
          {over > 0 ? tf("count.over", { n: over }) : error}
        </p>
      ) : null}
    </div>
  );
}

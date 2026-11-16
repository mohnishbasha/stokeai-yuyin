"use client";

import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "children"> {
  readonly variant?: ButtonVariant;
  /** Disabled through `aria-disabled` so the control stays focusable and can explain why. */
  readonly disabled?: boolean;
  /** Text that states why the button is disabled. Shown as helper text and `title`. */
  readonly disabledReason?: string;
  /** Keeps the label and width, marks the button busy, and ignores clicks. */
  readonly loading?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
  readonly children: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-accent-ink hover:bg-accent active:bg-accent",
  secondary: "border-line-strong bg-transparent text-text-0 hover:bg-bg-3 active:bg-bg-3",
  ghost: "border-transparent bg-transparent text-text-0 hover:bg-bg-3 active:bg-bg-3",
  destructive: "border-err bg-err text-bg-0 hover:bg-err active:bg-err",
};

/** A trigger for an action. Use a link, not a button, to navigate (DESIGN 5.1). */
export function Button({
  variant = "secondary",
  disabled = false,
  disabledReason,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  type = "button",
  onClick,
  children,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const inactive = disabled || loading;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (inactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <>
      <button
        {...rest}
        type={type}
        aria-disabled={disabled}
        aria-busy={loading || undefined}
        aria-describedby={disabled && disabledReason !== undefined ? reasonId : rest["aria-describedby"]}
        title={disabled ? disabledReason : rest.title}
        onClick={handleClick}
        className={cx(
          "inline-flex min-h-(--control-height) items-center justify-center gap-2 rounded-control border px-4 text-body font-medium",
          VARIANT_CLASS[variant],
          disabled && "text-text-2 hover:bg-transparent",
          className,
        )}
      >
        {leadingIcon}
        <span>{children}</span>
        {loading ? <span aria-hidden="true">{"…"}</span> : trailingIcon}
        {loading ? <span className="sr-only">{t("common.loading")}</span> : null}
      </button>
      {disabled && disabledReason !== undefined ? (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}

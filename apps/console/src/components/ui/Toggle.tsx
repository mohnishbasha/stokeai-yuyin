"use client";

import { useId, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";
import { ERROR_CLASS, HELPER_CLASS, LABEL_CLASS } from "./styles";

export interface ToggleProps {
  /** Describe the on state ("Show normalised text"), DESIGN 5.18. */
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly helper?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  /** The change is being saved: the state text reads "Saving" and clicks are ignored. */
  readonly saving?: boolean;
  /** A failed save: the host reverts `checked` and passes the message here. */
  readonly error?: string;
}

/** A switch for a setting that applies immediately. Space toggles; Enter does not. */
export function Toggle({
  label,
  checked,
  onChange,
  helper,
  disabled = false,
  disabledReason,
  saving = false,
  error,
}: ToggleProps) {
  const id = useId();
  const notesId = `${id}-notes`;
  const inactive = disabled || saving;
  const stateText = saving ? t("common.saving") : checked ? t("common.on") : t("common.off");
  const notes = [
    helper,
    disabled ? disabledReason : undefined,
    error,
  ].filter((note): note is string => note !== undefined);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    // The switch pattern uses Space only; a native button would also activate on Enter.
    if (event.key === "Enter") event.preventDefault();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
          aria-busy={saving || undefined}
          aria-describedby={notes.length > 0 ? notesId : undefined}
          aria-labelledby={`${id}-label`}
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!inactive) onChange(!checked);
          }}
          className={cx(
            "inline-flex h-(--control-height) w-8 shrink-0 items-center rounded-control border border-line-strong px-1",
            checked ? "justify-end bg-accent" : "justify-start bg-bg-2 hover:bg-bg-3",
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              "block h-4 w-4 rounded-control",
              checked ? "bg-accent-ink" : "bg-text-1",
            )}
          />
        </button>
        <span id={`${id}-label`} className={LABEL_CLASS}>
          {label}
        </span>
        <span className="text-small text-text-1">{stateText}</span>
      </div>
      {notes.length > 0 ? (
        <div id={notesId} className="flex flex-col gap-1">
          {helper !== undefined ? <p className={HELPER_CLASS}>{helper}</p> : null}
          {disabled && disabledReason !== undefined ? (
            <p className={HELPER_CLASS}>{disabledReason}</p>
          ) : null}
          {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

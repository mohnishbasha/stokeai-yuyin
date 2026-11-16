"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { t, tf } from "../../lib/messages";
import { HELPER_CLASS } from "./styles";

export interface VoiceOption {
  readonly id: string;
  readonly name: string;
  /** Language tags, so Hinglish suitability is visible (DESIGN 5.5). */
  readonly languages: readonly string[];
  readonly description: string;
  /** Set when the voice is not available to this plan. The text is shown as the reason. */
  readonly unavailableReason?: string;
}

export interface VoicePickerProps {
  readonly voices: readonly VoiceOption[];
  readonly selectedId?: string;
  readonly onSelect: (id: string) => void;
  /** The id of the sample that is playing now, if any. Samples never autoplay. */
  readonly playingId?: string;
  readonly onPlay: (id: string) => void;
  readonly onStop: () => void;
  readonly sampleError?: { readonly id: string; readonly onRetry: () => void };
}

/** A filterable listbox of voices with an auditioning sample per row (DESIGN 5.5). */
export function VoicePicker({
  voices,
  selectedId,
  onSelect,
  playingId,
  onPlay,
  onStop,
  sampleError,
}: VoicePickerProps) {
  const id = useId();
  const [filter, setFilter] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const languages = [...new Set(voices.flatMap((voice) => voice.languages))].sort();
  const shown =
    filter === null ? voices : voices.filter((voice) => voice.languages.includes(filter));
  const activeVoice = shown[Math.min(active, shown.length - 1)];
  const selected = voices.find((voice) => voice.id === selectedId);

  function togglePlay(voice: VoiceOption | undefined) {
    if (voice === undefined || voice.unavailableReason !== undefined) return;
    if (playingId === voice.id) onStop();
    else onPlay(voice.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const last = shown.length - 1;
    switch (event.key) {
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
        event.preventDefault();
        if (activeVoice !== undefined && activeVoice.unavailableReason === undefined) {
          onSelect(activeVoice.id);
        }
        break;
      case " ":
        event.preventDefault();
        togglePlay(activeVoice);
        break;
      case "Escape":
        onStop();
        break;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t("voice.filterLabel")} className="flex flex-wrap gap-2">
        <FilterButton
          label={t("voice.all")}
          pressed={filter === null}
          onClick={() => {
            setFilter(null);
            setActive(0);
          }}
        />
        {languages.map((language) => (
          <FilterButton
            key={language}
            label={language}
            pressed={filter === language}
            onClick={() => {
              setFilter(language);
              setActive(0);
            }}
          />
        ))}
      </div>
      <ul
        role="listbox"
        tabIndex={0}
        aria-label={t("voice.listLabel")}
        aria-activedescendant={activeVoice !== undefined ? `${id}-${activeVoice.id}` : undefined}
        onKeyDown={handleKeyDown}
        className="flex flex-col rounded-panel border border-line bg-bg-1"
      >
        {shown.map((voice) => {
          const unavailable = voice.unavailableReason !== undefined;
          const isActive = voice.id === activeVoice?.id;
          return (
            <li
              key={voice.id}
              id={`${id}-${voice.id}`}
              role="option"
              aria-selected={voice.id === selectedId}
              aria-disabled={unavailable || undefined}
              onClick={() => {
                if (!unavailable) onSelect(voice.id);
              }}
              className={cx(
                "flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 px-3 py-2",
                isActive ? "border-accent bg-bg-3" : "border-transparent hover:bg-bg-3",
                unavailable ? "text-text-2" : "text-text-0",
              )}
            >
              <span className="font-medium">{voice.name}</span>
              {voice.languages.map((language) => (
                <span
                  key={language}
                  className="rounded-control bg-bg-3 px-2 text-small text-text-1"
                >
                  {language}
                </span>
              ))}
              <span className="text-small text-text-1">{voice.description}</span>
              {unavailable ? <span className="text-small">{voice.unavailableReason}</span> : null}
              {!unavailable ? (
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePlay(voice);
                  }}
                  className="ml-auto text-small text-accent"
                >
                  {playingId === voice.id ? t("voice.playing") : t("voice.play")}
                </span>
              ) : null}
              {voice.id === selectedId ? <span aria-hidden="true">{"✓"}</span> : null}
            </li>
          );
        })}
      </ul>
      {sampleError !== undefined ? (
        <p role="alert" className="flex items-center gap-3 text-small text-err">
          <span>{t("voice.sampleError")}</span>
          <button
            type="button"
            onClick={sampleError.onRetry}
            className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-text-0 hover:bg-bg-3"
          >
            {t("common.retry")}
          </button>
        </p>
      ) : null}
      <p className={HELPER_CLASS}>
        {selected !== undefined ? tf("voice.selected", { name: selected.name }) : t("voice.none")}
      </p>
      <p className={HELPER_CLASS}>{t("voice.hint")}</p>
    </div>
  );
}

function FilterButton({
  label,
  pressed,
  onClick,
}: {
  readonly label: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        "min-h-(--control-height) rounded-control border px-3 text-small text-text-0",
        pressed ? "border-accent bg-bg-3" : "border-line-strong hover:bg-bg-3",
      )}
    >
      {label}
    </button>
  );
}

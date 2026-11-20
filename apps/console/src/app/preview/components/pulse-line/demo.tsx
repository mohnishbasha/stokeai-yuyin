"use client";

import { useEffect, useRef, useState } from "react";
import { PulseLine, type PulseState } from "../../../../components/PulseLine";
import { createMockAudioStream } from "../../../../lib/pulseline";
import { t } from "../../../../lib/messages";

const MOCK_FIRST_AUDIO_MS = 480;
const MOCK_STREAM_MS = 6000;

const buttonClass =
  "inline-flex min-h-(--control-height) items-center rounded-control border border-line-strong bg-bg-2 px-3 text-small text-text-0 hover:bg-bg-3";

/** Drives PulseLine through request, first audio, streaming and end with timers. Mock only. */
export function PulseLineDemo() {
  const [state, setState] = useState<PulseState>("idle");
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const [ttfa, setTtfa] = useState<number | undefined>();
  const [source] = useState(createMockAudioStream);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => clear, []);

  function start() {
    clear();
    setTtfa(undefined);
    setStartedAt(performance.now());
    setState("requesting");
    timers.current.push(
      setTimeout(() => {
        setTtfa(MOCK_FIRST_AUDIO_MS);
        setState("streaming");
      }, MOCK_FIRST_AUDIO_MS),
      setTimeout(() => {
        setState("ended");
      }, MOCK_FIRST_AUDIO_MS + MOCK_STREAM_MS),
    );
  }
  function stop(next: PulseState) {
    clear();
    setState(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <PulseLine
        state={state}
        source={source}
        requestStartedAt={startedAt}
        {...(ttfa === undefined ? {} : { ttfaMs: ttfa })}
        {...(state === "error" ? { errorCode: "mock_failure" } : {})}
      />
      <div className="flex gap-2">
        <button type="button" className={buttonClass} onClick={start}>
          {t("preview.pulse.start")}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            stop("cancelled");
          }}
        >
          {t("preview.pulse.cancel")}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            stop("error");
          }}
        >
          {t("preview.pulse.fail")}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            stop("idle");
          }}
        >
          {t("preview.pulse.reset")}
        </button>
      </div>
    </div>
  );
}

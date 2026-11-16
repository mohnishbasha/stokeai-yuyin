"use client";

import { useEffect, useRef, useState } from "react";
import { createMockAudioStream } from "../../lib/pulseline";
import { t, tf } from "../../lib/messages";
import { PulseLine, type PulseState } from "../PulseLine";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

/** The demo accepts at most this many code points (FR-023). */
export const DEMO_LIMIT = 200;
const MOCK_REQUEST_MS = 400;
const MOCK_STREAM_MS = 5000;

/**
 * The home page demo (DESIGN M1). A mock for now: it drives the pulse line from a synthetic
 * audio stream and sends nothing. It shows no timing readout, because none has been measured.
 */
export function DemoPanel() {
  const [state, setState] = useState<PulseState>("idle");
  const [voice, setVoice] = useState("asha");
  const [language, setLanguage] = useState("mixed");
  const [over, setOver] = useState(false);
  const [source] = useState(createMockAudioStream);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => clear, []);

  function play() {
    clear();
    setState("requesting");
    timers.current.push(
      setTimeout(() => {
        setState("streaming");
      }, MOCK_REQUEST_MS),
      setTimeout(() => {
        setState("ended");
      }, MOCK_REQUEST_MS + MOCK_STREAM_MS),
    );
  }

  function stop() {
    clear();
    setState("cancelled");
  }

  const running = state === "requesting" || state === "streaming";

  return (
    <section
      aria-labelledby="demo-heading"
      className="flex max-w-prose flex-col gap-4 rounded-panel border border-line bg-bg-1 p-4"
    >
      <h2 id="demo-heading" className="text-h3 font-medium text-text-0">
        {t("site.demo.title")}
      </h2>
      <p className="text-small text-text-1">{t("site.demo.mock")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t("site.demo.voice")}
          value={voice}
          onChange={setVoice}
          options={[
            { value: "asha", label: t("site.demo.voiceAsha") },
            { value: "dev", label: t("site.demo.voiceDev") },
          ]}
        />
        <Select
          label={t("site.demo.language")}
          value={language}
          onChange={setLanguage}
          options={[
            { value: "hi", label: t("site.demo.langHi"), secondary: t("site.demo.langHiEn") },
            { value: "en", label: t("site.demo.langEn") },
            { value: "mixed", label: t("site.demo.langMix") },
          ]}
        />
      </div>
      <Textarea
        label={t("site.demo.text")}
        limit={DEMO_LIMIT}
        defaultValue={t("site.demo.sample")}
        helper={tf("site.demo.limit", { n: DEMO_LIMIT })}
        onOverLimitChange={setOver}
      />
      <PulseLine state={state} source={source} />
      <div className="flex gap-2">
        {running ? (
          <Button onClick={stop}>{t("site.demo.stop")}</Button>
        ) : (
          <Button
            variant="primary"
            onClick={play}
            disabled={over}
            disabledReason={t("site.demo.over")}
          >
            {t("site.demo.play")}
          </Button>
        )}
      </div>
    </section>
  );
}

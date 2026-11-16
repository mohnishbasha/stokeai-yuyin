"use client";

import { useEffect, useRef, useState } from "react";
import { countCodePoints } from "../../lib/count";
import { createMockAudioStream } from "../../lib/pulseline";
import { formatMicroUsd, estimateCostMicroUsd } from "../../lib/money";
import { t } from "../../lib/messages";
import type { PlaygroundContext, ScreenResult, VoiceRecord } from "../../lib/data/types";
import { PulseLine, type PulseState } from "../PulseLine";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Panel, Result, ScreenPage } from "./common";

export interface PlaygroundData {
  readonly context: PlaygroundContext;
  readonly voices: readonly VoiceRecord[];
}

const MOCK_FIRST_AUDIO_MS = 480;
const MOCK_STREAM_MS = 4000;
const BILLING_HREF = "/dashboard/billing";

/** C2. Mock playback: the pulse line runs from timers. No text leaves this page or is stored. */
export function PlaygroundScreen({ result }: { readonly result: ScreenResult<PlaygroundData> }) {
  return (
    <ScreenPage title={t("screen.playground.title")} lead={t("screen.playground.lead")}>
      <Result result={result}>{(data) => <PlaygroundBody data={data} />}</Result>
    </ScreenPage>
  );
}

function PlaygroundBody({ data }: { readonly data: PlaygroundData }) {
  const { context } = data;
  const [text, setText] = useState(context.sampleText);
  const [voiceId, setVoiceId] = useState(data.voices[0]?.id ?? "");
  const [pulse, setPulse] = useState<PulseState>("idle");
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined);
  const [ttfa, setTtfa] = useState<number | undefined>(undefined);
  const [source] = useState(createMockAudioStream);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => clear, []);

  const count = countCodePoints(text);
  const over = count > context.charLimit;
  const noBalance = context.balanceMicroUsd <= 0;
  const reason = noBalance
    ? t("screen.playground.zeroBalanceReason")
    : text.trim() === ""
      ? t("screen.playground.emptyReason")
      : over
        ? t("screen.playground.overLimitReason")
        : undefined;
  const busy = pulse === "requesting" || pulse === "streaming";

  function play() {
    clear();
    setTtfa(undefined);
    setStartedAt(performance.now());
    setPulse("requesting");
    timers.current.push(
      setTimeout(() => {
        setTtfa(MOCK_FIRST_AUDIO_MS);
        setPulse("streaming");
      }, MOCK_FIRST_AUDIO_MS),
      setTimeout(() => {
        setPulse("ended");
      }, MOCK_FIRST_AUDIO_MS + MOCK_STREAM_MS),
    );
  }

  function cancel() {
    clear();
    setPulse("cancelled");
  }

  return (
    <>
      {noBalance ? (
        <Banner status="warn" action={{ label: t("screen.playground.topUp"), href: BILLING_HREF }}>
          {t("screen.playground.zeroBalance")}
        </Banner>
      ) : null}
      <Panel>
        <Select
          label={t("screen.playground.voice")}
          value={voiceId}
          options={data.voices
            .filter((voice) => voice.unavailableReason === undefined)
            .map((voice) => ({ value: voice.id, label: voice.name }))}
          onChange={setVoiceId}
        />
        <Textarea
          label={t("screen.playground.textLabel")}
          value={text}
          limit={context.charLimit}
          estimate={formatMicroUsd(estimateCostMicroUsd(count, context.pricePerThousandMicroUsd))}
          helper={t("screen.playground.privacy")}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="primary"
            disabled={reason !== undefined || busy}
            {...(reason !== undefined ? { disabledReason: reason } : {})}
            onClick={play}
          >
            {t("screen.playground.play")}
          </Button>
          <Button disabled={!busy} onClick={cancel}>
            {t("screen.playground.cancel")}
          </Button>
        </div>
      </Panel>
      <Panel>
        <PulseLine
          state={pulse}
          source={source}
          requestStartedAt={startedAt}
          {...(ttfa === undefined ? {} : { ttfaMs: ttfa })}
        />
      </Panel>
    </>
  );
}

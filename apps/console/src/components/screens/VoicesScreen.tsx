"use client";

import Link from "next/link";
import { useState } from "react";
import { t, type MessageKey } from "../../lib/messages";
import type {
  CustomVoiceRecord,
  CustomVoiceStatus,
  ScreenResult,
  VoiceRecord,
} from "../../lib/data/types";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { VoicePicker } from "../ui/VoicePicker";
import { Panel, Result, ScreenPage } from "./common";

export interface VoicesData {
  readonly voices: readonly VoiceRecord[];
  readonly custom: readonly CustomVoiceRecord[];
  /** `?state=sample-error`: the first sample fails to play, to show the inline retry. */
  readonly sampleFails: boolean;
}

const REQUEST_HREF = "/dashboard/voices/request";

const STATUS_KEY: Readonly<Record<CustomVoiceStatus, MessageKey>> = {
  in_review: "screen.voices.status.inReview",
  approved: "screen.voices.status.approved",
  rejected: "screen.voices.status.rejected",
};
const STATUS_BADGE = { in_review: "info", approved: "ok", rejected: "err" } as const;

/** C7. The voice library. Samples never autoplay; Play is always the listener's action. */
export function VoicesScreen({ result }: { readonly result: ScreenResult<VoicesData> }) {
  return (
    <ScreenPage
      title={t("screen.voices.title")}
      lead={t("screen.voices.lead")}
      actions={
        <Link
          href={REQUEST_HREF}
          className="inline-flex min-h-(--control-height) items-center rounded-control border border-line-strong px-3 text-body text-text-0"
        >
          {t("screen.voices.request")}
        </Link>
      }
    >
      <Result result={result}>{(data) => <VoicesBody data={data} />}</Result>
    </ScreenPage>
  );
}

function VoicesBody({ data }: { readonly data: VoicesData }) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [playingId, setPlayingId] = useState<string | undefined>(undefined);
  const [failedId, setFailedId] = useState<string | undefined>(
    data.sampleFails ? data.voices[0]?.id : undefined,
  );

  return (
    <>
      <VoicePicker
        voices={data.voices}
        {...(selectedId !== undefined ? { selectedId } : {})}
        onSelect={setSelectedId}
        {...(playingId !== undefined ? { playingId } : {})}
        onPlay={(id) => {
          if (id === failedId) return;
          setPlayingId(id);
        }}
        onStop={() => {
          setPlayingId(undefined);
        }}
        {...(failedId !== undefined
          ? {
              sampleError: {
                id: failedId,
                onRetry: () => {
                  setFailedId(undefined);
                },
              },
            }
          : {})}
      />
      <Panel title={t("screen.voices.custom")}>
        {data.custom.length === 0 ? (
          <EmptyState
            title={t("screen.voices.empty.title")}
            body={t("screen.voices.empty.body")}
            docs={{ label: t("screen.voices.request"), href: REQUEST_HREF }}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.custom.map((voice) => (
              <li key={voice.id} className="flex items-center gap-3 text-body text-text-0">
                <span>{voice.name}</span>
                <Badge status={STATUS_BADGE[voice.status]}>{t(STATUS_KEY[voice.status])}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

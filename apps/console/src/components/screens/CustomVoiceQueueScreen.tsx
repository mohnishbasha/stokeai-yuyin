"use client";

import { useState } from "react";
import { formatDate } from "../../lib/format";
import { t, tf, type MessageKey } from "../../lib/messages";
import type {
  ConsentStatus,
  ScreenResult,
  VoiceRequestItem,
  VoiceStage,
} from "../../lib/data/types";
import { ConfirmDialog } from "../operator/parts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Panel, Result, ScreenError, ScreenPage, useMockAction } from "./common";

const ALL = "all";
const STAGE_LABEL: Readonly<Record<VoiceStage, MessageKey>> = {
  consent: "op.voices.stageConsent",
  recordings: "op.voices.stageRecordings",
  review: "op.voices.stageReview",
  decided: "op.voices.stageDecided",
};
const CONSENT_LABEL: Readonly<Record<ConsentStatus, MessageKey>> = {
  verified: "op.voices.consentVerified",
  pending: "op.voices.consentPending",
};
const ASSET_ERROR_CODE = "asset_unavailable";
const ASSET_TRACE_ID = "tr_mock_0000000000000001";

/** O5. The custom voice queue. Approval is blocked until consent is verified. */
export function CustomVoiceQueueScreen({
  result,
}: {
  readonly result: ScreenResult<readonly VoiceRequestItem[]>;
}) {
  return (
    <ScreenPage title={t("op.voices.title")} lead={t("op.voices.lead")}>
      <Result result={result}>{(items) => <QueueBody items={items} />}</Result>
    </ScreenPage>
  );
}

function QueueBody({ items }: { readonly items: readonly VoiceRequestItem[] }) {
  const [stage, setStage] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | undefined>(items[0]?.id);
  if (items.length === 0) {
    return <EmptyState title={t("op.voices.empty.title")} body={t("op.voices.empty.body")} />;
  }
  const filtered = items.filter((row) => stage === ALL || row.stage === stage);
  const selected = items.find((row) => row.id === selectedId) ?? filtered[0];

  return (
    <>
      <Select
        label={t("op.voices.filterStage")}
        value={stage}
        options={[
          { value: ALL, label: t("op.voices.all") },
          ...(Object.keys(STAGE_LABEL) as VoiceStage[]).map((value) => ({
            value,
            label: t(STAGE_LABEL[value]),
          })),
        ]}
        onChange={setStage}
      />
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{t("op.voices.title")}</caption>
        <thead>
          <tr className="border-b border-line-strong text-left text-small text-text-1">
            {(
              [
                "op.voices.colRequest",
                "op.voices.colOrg",
                "op.voices.colStage",
                "op.voices.colSubmitted",
                "op.voices.colOwner",
              ] as const
            ).map((key) => (
              <th key={key} scope="col" className="px-3 py-2 font-medium">
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className={
                row.id === selected?.id ? "border-b border-line bg-bg-3" : "border-b border-line"
              }
            >
              <td className="px-3 py-2">
                <button
                  type="button"
                  aria-label={tf("op.voices.open", { id: row.id })}
                  aria-pressed={row.id === selected?.id}
                  onClick={() => {
                    setSelectedId(row.id);
                  }}
                  className="rounded-control px-1 font-mono text-mono text-text-0 underline"
                >
                  {row.id}
                </button>
              </td>
              <td className="px-3 py-2">{row.orgName}</td>
              <td className="px-3 py-2">{t(STAGE_LABEL[row.stage])}</td>
              <td className="px-3 py-2">{formatDate(row.submittedAt)}</td>
              <td className="px-3 py-2">{row.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected !== undefined ? <RequestDetail key={selected.id} item={selected} /> : null}
    </>
  );
}

const DECISIONS: readonly {
  readonly key: MessageKey;
  readonly variant: "primary" | "secondary" | "destructive";
}[] = [
  { key: "op.voices.approve", variant: "primary" },
  { key: "op.voices.changes", variant: "secondary" },
  { key: "op.voices.reject", variant: "destructive" },
];

function RequestDetail({ item }: { readonly item: VoiceRequestItem }) {
  const mock = useMockAction("op.mock.notice");
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<MessageKey | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const consentOk = item.consent === "verified";

  return (
    <Panel title={tf("op.voices.requestTitle", { id: item.id })}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-body text-text-1">{t("op.voices.consent")}</span>
        <Badge status={consentOk ? "ok" : "warn"}>{t(CONSENT_LABEL[item.consent])}</Badge>
        <Button onClick={mock}>{t("op.voices.viewConsent")}</Button>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-small font-medium text-text-1">{t("op.voices.recordings")}</h3>
        {item.assetUnavailable ? (
          <ScreenError
            code={ASSET_ERROR_CODE}
            traceId={ASSET_TRACE_ID}
            cause="op.voices.assetError"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {item.recordings.map((recording) => (
              <li key={recording.id} className="flex flex-wrap items-center gap-3">
                <Button
                  aria-pressed={playing === recording.id}
                  onClick={() => {
                    // Playback only ever starts from this press; nothing autoplays (DESIGN O5).
                    setPlaying((current) => (current === recording.id ? null : recording.id));
                  }}
                >
                  {tf("op.voices.play", { name: recording.name })}
                </Button>
                <Badge status={recording.check === "pass" ? "ok" : "err"}>
                  {recording.check === "pass" ? t("op.voices.checkPass") : t("op.voices.checkFail")}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Textarea
        label={t("op.voices.notes")}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("op.voices.title")}>
        {DECISIONS.map((entry) => {
          const blocked = entry.key === "op.voices.approve" && !consentOk;
          return (
            <Button
              key={entry.key}
              variant={entry.variant}
              disabled={blocked}
              {...(blocked ? { disabledReason: t("op.voices.approveBlocked") } : {})}
              onClick={() => {
                setDecision(entry.key);
              }}
            >
              {t(entry.key)}
            </Button>
          );
        })}
      </div>
      <ConfirmDialog
        open={decision !== null}
        title={tf("op.voices.confirmTitle", {
          action: decision === null ? "" : t(decision),
          id: item.id,
        })}
        onClose={() => {
          setDecision(null);
        }}
        onConfirm={() => {
          setDecision(null);
          mock();
        }}
      />
    </Panel>
  );
}

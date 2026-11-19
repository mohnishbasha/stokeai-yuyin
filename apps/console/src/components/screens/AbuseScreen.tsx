"use client";

import { useState } from "react";
import { formatDate, formatDateTime } from "../../lib/format";
import { t, tf, type MessageKey } from "../../lib/messages";
import type { AbuseCase, AbuseSeverity, AbuseStatus, ScreenResult } from "../../lib/data/types";
import { ConfirmDialog } from "../operator/parts";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

const ALL = "all";
const SEVERITY_LABEL: Readonly<Record<AbuseSeverity, MessageKey>> = {
  low: "op.abuse.severityLow",
  medium: "op.abuse.severityMedium",
  high: "op.abuse.severityHigh",
};
const STATUS_LABEL: Readonly<Record<AbuseStatus, MessageKey>> = {
  open: "op.abuse.statusOpen",
  actioned: "op.abuse.statusActioned",
};
const ACTIONS: readonly {
  readonly key: MessageKey;
  readonly variant: "secondary" | "destructive";
}[] = [
  { key: "op.abuse.warn", variant: "secondary" },
  { key: "op.abuse.suspend", variant: "destructive" },
  { key: "op.abuse.dismiss", variant: "secondary" },
  { key: "op.abuse.escalate", variant: "secondary" },
];

/** O4. The abuse queue with a case panel. Evidence is redacted until an audited reveal. */
export function AbuseScreen({ result }: { readonly result: ScreenResult<readonly AbuseCase[]> }) {
  return (
    <ScreenPage title={t("op.abuse.title")} lead={t("op.abuse.lead")}>
      <Result result={result}>{(cases) => <AbuseBody cases={cases} />}</Result>
    </ScreenPage>
  );
}

function AbuseBody({ cases }: { readonly cases: readonly AbuseCase[] }) {
  const [status, setStatus] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | undefined>(cases[0]?.id);

  const filtered = cases.filter(
    (row) =>
      (status === ALL || row.status === status) && (severity === ALL || row.severity === severity),
  );
  if (cases.length === 0) {
    return <EmptyState title={t("op.abuse.empty.title")} body={t("op.abuse.empty.body")} />;
  }
  const selected = cases.find((row) => row.id === selectedId) ?? filtered[0];

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("op.abuse.filterStatus")}
          value={status}
          options={[
            { value: ALL, label: t("op.abuse.all") },
            { value: "open", label: t("op.abuse.statusOpen") },
            { value: "actioned", label: t("op.abuse.statusActioned") },
          ]}
          onChange={setStatus}
        />
        <Select
          label={t("op.abuse.filterSeverity")}
          value={severity}
          options={[
            { value: ALL, label: t("op.abuse.all") },
            { value: "low", label: t("op.abuse.severityLow") },
            { value: "medium", label: t("op.abuse.severityMedium") },
            { value: "high", label: t("op.abuse.severityHigh") },
          ]}
          onChange={setSeverity}
        />
      </div>
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">{t("op.abuse.title")}</caption>
        <thead>
          <tr className="border-b border-line-strong text-left text-small text-text-1">
            {(
              [
                "op.abuse.colCase",
                "op.abuse.colOpened",
                "op.abuse.colOrg",
                "op.abuse.colSource",
                "op.abuse.colSeverity",
                "op.abuse.colStatus",
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
                row.id === selected?.id ? "border-b-2 border-accent" : "border-b border-line"
              }
            >
              <td className="px-3 py-2">
                <button
                  type="button"
                  aria-label={tf("op.abuse.open", { id: row.id })}
                  aria-pressed={row.id === selected?.id}
                  onClick={() => {
                    setSelectedId(row.id);
                  }}
                  className="rounded-control px-1 font-mono text-mono text-text-0 underline"
                >
                  {row.id}
                </button>
              </td>
              <td className="px-3 py-2">{formatDate(row.openedAt)}</td>
              <td className="px-3 py-2">{row.orgName}</td>
              <td className="px-3 py-2">{row.source}</td>
              <td className="px-3 py-2">
                <Badge
                  status={
                    row.severity === "high" ? "err" : row.severity === "medium" ? "warn" : "neutral"
                  }
                >
                  {t(SEVERITY_LABEL[row.severity])}
                </Badge>
              </td>
              <td className="px-3 py-2">{t(STATUS_LABEL[row.status])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected !== undefined ? <CaseDetail key={selected.id} item={selected} /> : null}
    </>
  );
}

function CaseDetail({ item }: { readonly item: AbuseCase }) {
  const mock = useMockAction("op.mock.notice");
  const [revealed, setRevealed] = useState(false);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<MessageKey | null>(null);
  const missing = reason.trim() === "";

  return (
    <Panel title={tf("op.abuse.caseTitle", { id: item.id })}>
      {item.conflict ? (
        <Banner status="warn" role="alert">
          {t("op.abuse.conflict")}
        </Banner>
      ) : null}
      {item.conflict ? (
        <div>
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            {t("op.abuse.reload")}
          </Button>
        </div>
      ) : null}
      <p className="text-body text-text-0">
        <span className="text-small text-text-1">{t("op.abuse.summary")}: </span>
        {item.summary}
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-small font-medium text-text-1">{t("op.abuse.evidence")}</h3>
        {revealed ? (
          <p className="rounded-control bg-bg-2 p-3 text-body text-text-0">{item.evidence}</p>
        ) : (
          <p className="rounded-control bg-bg-2 p-3 text-body text-text-1">
            {t("op.abuse.redacted")}
          </p>
        )}
        <div>
          <Button
            onClick={() => {
              if (!revealed) mock();
              setRevealed((value) => !value);
            }}
          >
            {revealed ? t("op.abuse.hide") : t("op.abuse.reveal")}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-small font-medium text-text-1">{t("op.abuse.timeline")}</h3>
        <ul className="flex flex-col gap-1 text-body text-text-0">
          {item.timeline.map((entry) => (
            <li key={`${entry.at}-${entry.text}`}>
              <span className="text-text-1">{formatDateTime(entry.at)}</span> {entry.text}
            </li>
          ))}
        </ul>
      </div>
      <Textarea
        label={t("op.reason.label")}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("op.abuse.actions")}>
        {ACTIONS.map((entry) => (
          <Button
            key={entry.key}
            variant={entry.variant}
            disabled={missing}
            {...(missing ? { disabledReason: t("op.reason.required") } : {})}
            onClick={() => {
              setAction(entry.key);
            }}
          >
            {t(entry.key)}
          </Button>
        ))}
      </div>
      <ConfirmDialog
        open={action !== null}
        title={tf("op.abuse.confirmTitle", {
          action: action === null ? "" : t(action),
          id: item.id,
        })}
        onClose={() => {
          setAction(null);
        }}
        onConfirm={() => {
          setAction(null);
          mock();
        }}
      />
    </Panel>
  );
}

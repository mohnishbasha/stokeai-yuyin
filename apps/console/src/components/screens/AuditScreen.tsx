"use client";

import { Fragment, useState } from "react";
import { formatDateTime } from "../../lib/format";
import { t, tf } from "../../lib/messages";
import type { AuditEntry, ScreenResult } from "../../lib/data/types";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { useToast } from "../ui/Toast";
import { Result, ScreenPage } from "./common";

const ALL = "all";
const PAGE_SIZE = 5;

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

/** O7. The audit log: read-only, append-only, rows expand to before and after values. */
export function AuditScreen({ result }: { readonly result: ScreenResult<readonly AuditEntry[]> }) {
  return (
    <ScreenPage title={t("op.audit.title")} lead={t("op.audit.lead")}>
      <Result result={result}>{(entries) => <AuditBody entries={entries} />}</Result>
    </ScreenPage>
  );
}

function AuditBody({ entries }: { readonly entries: readonly AuditEntry[] }) {
  const toast = useToast();
  const [actor, setActor] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [org, setOrg] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const needle = org.trim().toLowerCase();
  const filtered = entries.filter(
    (row) =>
      (actor === ALL || row.actor === actor) &&
      (action === ALL || row.action === action) &&
      (needle === "" || row.orgId.toLowerCase().includes(needle)) &&
      (from === "" || row.at.slice(0, 10) >= from) &&
      (to === "" || row.at.slice(0, 10) <= to),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function options(values: readonly string[]) {
    return [
      { value: ALL, label: t("op.audit.all") },
      ...unique(values).map((value) => ({ value, label: value })),
    ];
  }

  if (entries.length === 0) {
    return <EmptyState title={t("op.audit.empty.title")} body={t("op.audit.empty.body")} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t("op.audit.filterActor")}
          value={actor}
          options={options(entries.map((row) => row.actor))}
          onChange={(value) => {
            setActor(value);
            setPage(1);
          }}
        />
        <Select
          label={t("op.audit.filterAction")}
          value={action}
          options={options(entries.map((row) => row.action))}
          onChange={(value) => {
            setAction(value);
            setPage(1);
          }}
        />
        <Input
          label={t("op.audit.filterOrg")}
          value={org}
          onChange={(event) => {
            setOrg(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label={t("op.audit.from")}
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label={t("op.audit.to")}
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
        <Button
          onClick={() => {
            toast.push({ kind: "info", message: t("op.audit.exporting") });
            toast.push({ kind: "success", message: t("op.audit.exported") });
          }}
        >
          {t("op.audit.export")}
        </Button>
      </div>
      <p className="text-small text-text-1">{tf("op.audit.entries", { n: filtered.length })}</p>
      {filtered.length === 0 ? (
        <EmptyState title={t("op.audit.empty.title")} body={t("op.audit.empty.body")} />
      ) : (
        <table className="w-full border-collapse text-body">
          <caption className="sr-only">{t("op.audit.title")}</caption>
          <thead>
            <tr className="border-b border-line-strong text-left text-small text-text-1">
              {(
                [
                  "op.audit.colTime",
                  "op.audit.colActor",
                  "op.audit.colAction",
                  "op.audit.colTarget",
                  "op.audit.colReason",
                  "op.audit.colDetails",
                ] as const
              ).map((key) => (
                <th key={key} scope="col" className="px-3 py-2 font-medium">
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const expanded = open === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="border-b border-line">
                    <td className="px-3 py-2 font-mono text-mono">{formatDateTime(row.at)}</td>
                    <td className="px-3 py-2">{row.actor}</td>
                    <td className="px-3 py-2 font-mono text-mono">{row.action}</td>
                    <td className="px-3 py-2 font-mono text-mono">{row.target}</td>
                    <td className="px-3 py-2">{row.reason}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={tf(expanded ? "op.audit.collapse" : "op.audit.expand", {
                          id: row.id,
                        })}
                        onClick={() => {
                          setOpen(expanded ? null : row.id);
                        }}
                        className="min-h-(--control-height) rounded-control px-2 text-text-0 hover:bg-bg-3"
                      >
                        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-b border-line bg-bg-2">
                      <td colSpan={6} className="px-3 py-2">
                        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-small text-text-1">{t("op.audit.before")}</dt>
                            <dd className="font-mono text-mono text-text-0">{row.before}</dd>
                          </div>
                          <div>
                            <dt className="text-small text-text-1">{t("op.audit.after")}</dt>
                            <dd className="font-mono text-mono text-text-0">{row.after}</dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      <nav
        aria-label={t("table.pagination")}
        className="flex items-center gap-2 text-small text-text-1"
      >
        <Button
          disabled={page <= 1}
          disabledReason={t("op.audit.firstPage")}
          onClick={() => {
            setPage(page - 1);
          }}
        >
          {t("table.prev")}
        </Button>
        <span>{tf("table.page", { page, count: pageCount })}</span>
        <Button
          disabled={page >= pageCount}
          disabledReason={t("op.audit.lastPage")}
          onClick={() => {
            setPage(page + 1);
          }}
        >
          {t("table.next")}
        </Button>
      </nav>
    </>
  );
}

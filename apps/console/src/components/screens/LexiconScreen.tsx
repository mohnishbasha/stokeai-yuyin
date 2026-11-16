"use client";

import { useState } from "react";
import { t, tf } from "../../lib/messages";
import type { LexiconEntry, LexiconOverview, ScreenResult, Viewer } from "../../lib/data/types";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Table, type Column } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

export interface LexiconData {
  readonly overview: LexiconOverview;
  readonly viewer: Viewer;
}

/** C6. Pronunciation entries. Hindi and English are equals: both rows render in their own script. */
export function LexiconScreen({ result }: { readonly result: ScreenResult<LexiconData> }) {
  return (
    <ScreenPage title={t("screen.lexicon.title")} lead={t("screen.lexicon.lead")}>
      <Result result={result}>
        {(data) => <LexiconBody overview={data.overview} viewer={data.viewer} />}
      </Result>
    </ScreenPage>
  );
}

function LexiconBody({
  overview,
  viewer,
}: {
  readonly overview: LexiconOverview;
  readonly viewer: Viewer;
}) {
  const toast = useToast();
  const notConnected = useMockAction();
  const [entries, setEntries] = useState(overview.entries);
  const [adding, setAdding] = useState(false);
  const [written, setWritten] = useState("");
  const [spokenAs, setSpokenAs] = useState("");
  const [language, setLanguage] = useState<"hi" | "en">("hi");

  const full = entries.length >= overview.limit;
  const reason = !viewer.canManageLexicon
    ? t("screen.lexicon.forbidden")
    : full
      ? t("screen.lexicon.limitReached")
      : undefined;

  function add() {
    const entry: LexiconEntry = {
      id: `lex_new_${String(entries.length + 1)}`,
      written: written.trim(),
      language,
      spokenAs: spokenAs.trim(),
    };
    setEntries((current) => [entry, ...current]);
    setAdding(false);
    setWritten("");
    setSpokenAs("");
  }

  function remove(entry: LexiconEntry) {
    setEntries((current) => current.filter((row) => row.id !== entry.id));
    toast.push({ kind: "success", message: tf("screen.lexicon.removed", { word: entry.written }) });
  }

  const columns: readonly Column<LexiconEntry>[] = [
    {
      key: "written",
      header: t("screen.lexicon.colWritten"),
      render: (row) => <span lang={row.language}>{row.written}</span>,
    },
    {
      key: "language",
      header: t("screen.lexicon.colLanguage"),
      render: (row) => (row.language === "hi" ? t("lang.hi") : t("lang.en")),
    },
    {
      key: "spokenAs",
      header: t("screen.lexicon.colSpoken"),
      render: (row) => <span lang="hi">{row.spokenAs}</span>,
    },
    {
      key: "id",
      header: t("screen.lexicon.colActions"),
      render: (row) => (
        <Button
          variant="destructive"
          disabled={!viewer.canManageLexicon}
          {...(!viewer.canManageLexicon ? { disabledReason: t("screen.lexicon.forbidden") } : {})}
          onClick={() => {
            remove(row);
          }}
        >
          {tf("screen.lexicon.remove", { word: row.written })}
        </Button>
      ),
    },
  ];

  return (
    <>
      {!viewer.canManageLexicon ? (
        <Banner status="info">{t("screen.lexicon.forbidden")}</Banner>
      ) : null}
      {full ? <Banner status="warn">{t("screen.lexicon.limitReached")}</Banner> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-1">
          {tf("screen.lexicon.count", {
            count: String(entries.length),
            limit: String(overview.limit),
          })}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={!viewer.canManageLexicon}
            {...(!viewer.canManageLexicon ? { disabledReason: t("screen.lexicon.forbidden") } : {})}
            onClick={notConnected}
          >
            {t("screen.lexicon.import")}
          </Button>
          <Button onClick={notConnected}>{t("screen.lexicon.export")}</Button>
          <Button
            variant="primary"
            disabled={reason !== undefined}
            {...(reason !== undefined ? { disabledReason: reason } : {})}
            onClick={() => {
              setAdding(true);
            }}
          >
            {t("screen.lexicon.add")}
          </Button>
        </div>
      </div>
      {overview.importErrors.length > 0 ? (
        <Panel title={t("screen.lexicon.importErrors")}>
          <ul className="flex flex-col gap-2 text-body text-text-0">
            {overview.importErrors.map((row) => (
              <li key={row.line}>
                {tf("screen.lexicon.importLine", { line: String(row.line), message: row.message })}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {entries.length === 0 ? (
        <EmptyState
          title={t("screen.lexicon.empty.title")}
          body={t("screen.lexicon.empty.body")}
          action={{
            label: t("screen.lexicon.add"),
            onClick: () => {
              setAdding(true);
            },
            ...(reason !== undefined ? { disabledReason: reason } : {}),
          }}
        />
      ) : (
        <Table
          caption={t("screen.lexicon.title")}
          columns={columns}
          rows={entries}
          rowKey={(row) => row.id}
        />
      )}
      <Dialog
        open={adding}
        onClose={() => {
          setAdding(false);
        }}
        title={t("screen.lexicon.addTitle")}
        footer={
          <>
            <Button
              onClick={() => {
                setAdding(false);
              }}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="primary"
              disabled={written.trim() === "" || spokenAs.trim() === ""}
              disabledReason={t("screen.lexicon.addReason")}
              onClick={add}
            >
              {t("screen.lexicon.addSubmit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label={t("screen.lexicon.colWritten")}
            value={written}
            onChange={(event) => {
              setWritten(event.target.value);
            }}
          />
          <Select
            label={t("screen.lexicon.colLanguage")}
            value={language}
            options={[
              { value: "hi", label: t("lang.hi.native"), secondary: t("lang.hi") },
              { value: "en", label: t("lang.en.native"), secondary: t("lang.en") },
            ]}
            onChange={(value) => {
              setLanguage(value === "en" ? "en" : "hi");
            }}
          />
          <Input
            label={t("screen.lexicon.colSpoken")}
            value={spokenAs}
            onChange={(event) => {
              setSpokenAs(event.target.value);
            }}
          />
        </div>
      </Dialog>
    </>
  );
}

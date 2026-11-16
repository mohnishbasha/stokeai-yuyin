"use client";

import { useState } from "react";
import { formatCount } from "../../lib/format";
import { formatMicroUsd } from "../../lib/money";
import { t } from "../../lib/messages";
import {
  USAGE_RANGES,
  type ScreenResult,
  type UsageRange,
  type UsageSummary,
} from "../../lib/data/types";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Table } from "../ui/Table";
import { UsageChart } from "../ui/UsageChart";
import { Panel, Result, ScreenPage } from "./common";

const QUICKSTART_HREF = "/docs/quickstart";
const CSV_TYPE = "text/csv;charset=utf-8";

function rangeLabel(range: UsageRange): string {
  return range;
}

/** C4. Dates stay UTC on export (DESIGN C4). */
function downloadCsv(summary: UsageSummary, range: UsageRange) {
  const lines = [
    `${t("chart.colDate")},${t("screen.usage.unit")}`,
    ...summary.series[range].map((point) => `${point.label},${String(point.value)}`),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: CSV_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `usage-${range}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function UsageScreen({ result }: { readonly result: ScreenResult<UsageSummary> }) {
  return (
    <ScreenPage title={t("screen.usage.title")} lead={t("screen.usage.lead")}>
      <Result result={result}>{(summary) => <UsageBody summary={summary} />}</Result>
    </ScreenPage>
  );
}

function UsageBody({ summary }: { readonly summary: UsageSummary }) {
  const [range, setRange] = useState<UsageRange>("30d");
  const points = summary.series[range];
  const totals = summary.totals[range];

  if (points.length === 0) {
    return (
      <EmptyState
        title={t("screen.usage.empty.title")}
        body={t("screen.usage.empty.body")}
        docs={{ label: t("screen.usage.empty.docs"), href: QUICKSTART_HREF }}
      />
    );
  }

  return (
    <>
      {summary.partial ? <Banner status="info">{t("screen.usage.partial")}</Banner> : null}
      <UsageChart
        title={t("screen.usage.chartTitle")}
        unit={t("screen.usage.unit")}
        points={points}
        ranges={USAGE_RANGES.map((id) => ({ id, label: rangeLabel(id) }))}
        range={range}
        onRangeChange={(id) => {
          setRange(id as UsageRange);
        }}
      />
      <Panel title={t("screen.usage.totals")}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-small text-text-1">{t("screen.usage.totalCharacters")}</dt>
            <dd data-testid="usage-total-characters" className="font-mono text-mono tabular-nums">
              {formatCount(totals.characters)}
            </dd>
          </div>
          <div>
            <dt className="text-small text-text-1">{t("screen.usage.totalRequests")}</dt>
            <dd className="font-mono text-mono tabular-nums">{formatCount(totals.requests)}</dd>
          </div>
          <div>
            <dt className="text-small text-text-1">{t("screen.usage.totalSpend")}</dt>
            <dd className="font-mono text-mono tabular-nums">
              {formatMicroUsd(totals.spendMicroUsd)}
            </dd>
          </div>
        </dl>
      </Panel>
      <Panel title={t("screen.usage.byKey")}>
        <Table
          caption={t("screen.usage.byKey")}
          columns={[
            { key: "name", header: t("screen.usage.colKey") },
            {
              key: "characters",
              header: t("screen.usage.colCharacters"),
              numeric: true,
              render: (row) => formatCount(row.characters),
            },
            {
              key: "requests",
              header: t("screen.usage.colRequests"),
              numeric: true,
              render: (row) => formatCount(row.requests),
            },
          ]}
          rows={summary.byKey}
          rowKey={(row) => row.name}
        />
      </Panel>
      <Panel title={t("screen.usage.byVoice")}>
        <Table
          caption={t("screen.usage.byVoice")}
          columns={[
            { key: "name", header: t("screen.usage.colVoice") },
            {
              key: "characters",
              header: t("screen.usage.colCharacters"),
              numeric: true,
              render: (row) => formatCount(row.characters),
            },
          ]}
          rows={summary.byVoice}
          rowKey={(row) => row.name}
        />
      </Panel>
      <div>
        <Button
          onClick={() => {
            downloadCsv(summary, range);
          }}
        >
          {t("screen.usage.export")}
        </Button>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate, formatDateTime } from "../../lib/format";
import { formatMicroUsd } from "../../lib/money";
import { t, tf } from "../../lib/messages";
import type { ApiKeyRecord, OrgDetail, OrgEvent, ScreenResult } from "../../lib/data/types";
import { ReasonDialog } from "../operator/parts";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Table, type Column } from "../ui/Table";
import { Tabs } from "../ui/Tabs";
import { UsageChart } from "../ui/UsageChart";
import { ORG_PLAN_LABEL, OrgStatusBadge } from "./OrganizationsScreen";
import { Panel, Result, ScreenPage } from "./common";

const LINK_CLASS = "text-body font-medium text-text-0 underline";

/** O2. One organization: identity, balance, recent usage and events. Keys show a prefix only. */
export function OrganizationScreen({
  result,
}: {
  readonly result: ScreenResult<OrgDetail | null>;
}) {
  const title =
    result.status === "ok" && result.data !== null ? result.data.org.name : t("op.org.title");
  return (
    <ScreenPage title={title}>
      <Result result={result}>
        {(detail) =>
          detail === null ? (
            <EmptyState
              title={t("op.org.notFound.title")}
              body={t("op.org.notFound.body")}
              docs={{ label: t("op.org.back"), href: "/operator/organizations" }}
            />
          ) : (
            <OrganizationBody detail={detail} />
          )
        }
      </Result>
    </ScreenPage>
  );
}

function OrganizationBody({ detail }: { readonly detail: OrgDetail }) {
  const { org } = detail;
  const [acting, setActing] = useState(false);
  const suspended = org.status === "suspended";

  const eventColumns: readonly Column<OrgEvent>[] = [
    { key: "at", header: t("op.org.colTime"), render: (row) => formatDateTime(row.at) },
    { key: "event", header: t("op.org.colEvent") },
    { key: "actor", header: t("op.org.colActor") },
  ];
  const keyColumns: readonly Column<ApiKeyRecord>[] = [
    { key: "name", header: t("op.org.colKey") },
    { key: "prefix", header: t("op.org.colPrefix") },
    { key: "last4", header: t("op.org.colLast4") },
    {
      key: "lastUsedAt",
      header: t("op.org.colLastUsed"),
      render: (row) => (row.lastUsedAt === null ? t("op.org.never") : formatDate(row.lastUsedAt)),
    },
  ];
  const chart = (
    <UsageChart title={t("op.org.usageTitle")} unit={t("op.org.usageUnit")} points={detail.usage} />
  );

  const tabs = [
    {
      id: "overview",
      label: t("op.org.tabOverview"),
      panel: (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Fact label={t("op.org.owner")} value={org.ownerEmail} />
            <Fact label={t("op.org.created")} value={formatDate(org.createdAt)} />
            <Fact label={t("op.org.plan")} value={t(ORG_PLAN_LABEL[org.plan])} />
            <Fact label={t("op.org.balance")} value={formatMicroUsd(org.balanceMicroUsd)} />
          </dl>
          {chart}
          <Table
            caption={t("op.org.events")}
            columns={eventColumns}
            rows={detail.events}
            rowKey={(row) => row.id}
          />
          <p className="text-body text-text-1">
            {tf("op.org.abuseFlags", { n: detail.abuseFlags })}
            {" · "}
            {tf("op.org.voiceRequests", { n: detail.voiceRequests })}
          </p>
        </div>
      ),
    },
    {
      id: "keys",
      label: t("op.org.tabKeys"),
      panel: (
        <div className="flex flex-col gap-3">
          <p className="text-body text-text-1">{t("op.org.keysNote")}</p>
          <Table
            caption={t("op.org.keysTitle")}
            columns={keyColumns}
            rows={detail.keys}
            rowKey={(row) => row.id}
          />
        </div>
      ),
    },
    { id: "usage", label: t("op.org.tabUsage"), panel: chart },
    {
      id: "ledger",
      label: t("op.org.tabLedger"),
      panel: (
        <p className="text-body text-text-1">
          {t("op.org.ledgerNote")}{" "}
          <Link href="/operator/ledger" className={LINK_CLASS}>
            {t("op.org.adjust")}
          </Link>
        </p>
      ),
    },
    {
      id: "flags",
      label: t("op.org.tabFlags"),
      panel: (
        <p className="text-body text-text-1">
          {t("op.org.flagsNote")}{" "}
          <Link href="/operator/abuse" className={LINK_CLASS}>
            {t("op.nav.abuse")}
          </Link>
        </p>
      ),
    },
    {
      id: "notes",
      label: t("op.org.tabNotes"),
      panel: <p className="text-body text-text-1">{t("op.org.notesNote")}</p>,
    },
  ];

  return (
    <>
      {suspended ? <Banner status="warn">{t("op.org.suspendedBanner")}</Banner> : null}
      <div className="flex flex-wrap items-center gap-3">
        <code className="font-mono text-mono text-text-1">{org.id}</code>
        <OrgStatusBadge status={org.status} />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Link href="/operator/ledger" className={LINK_CLASS}>
            {t("op.org.adjust")}
          </Link>
          <Button
            variant="destructive"
            onClick={() => {
              setActing(true);
            }}
          >
            {suspended ? t("op.org.unsuspend") : t("op.org.suspend")}
          </Button>
        </div>
      </div>
      <Panel>
        <Tabs label={t("op.org.tabs")} tabs={tabs} />
      </Panel>
      <ReasonDialog
        open={acting}
        title={tf(suspended ? "op.org.unsuspendTitle" : "op.org.suspendTitle", { name: org.name })}
        {...(suspended ? {} : { description: t("op.org.suspendBody") })}
        onClose={() => {
          setActing(false);
        }}
      />
    </>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-small text-text-1">{label}</dt>
      <dd className="text-body text-text-0">{value}</dd>
    </div>
  );
}

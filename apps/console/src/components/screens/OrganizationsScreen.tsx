"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate } from "../../lib/format";
import { formatMicroUsd } from "../../lib/money";
import { t, tf } from "../../lib/messages";
import type { OperatorOrg, OrgPlan, OrgStatus, ScreenResult } from "../../lib/data/types";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Table, type Column } from "../ui/Table";
import { Result, ScreenPage } from "./common";

const PAGE_SIZE = 5;
const ALL = "all";

export const ORG_STATUS_LABEL = {
  active: "op.status.active",
  suspended: "op.status.suspended",
} as const;
export const ORG_PLAN_LABEL = {
  "pay-as-you-go": "op.plan.payg",
  committed: "op.plan.committed",
} as const;

export function OrgStatusBadge({ status }: { readonly status: OrgStatus }) {
  return <Badge status={status === "active" ? "ok" : "err"}>{t(ORG_STATUS_LABEL[status])}</Badge>;
}

/** O1. Every organization, with search and filters. Rows link to the detail screen. */
export function OrganizationsScreen({
  result,
}: {
  readonly result: ScreenResult<readonly OperatorOrg[]>;
}) {
  return (
    <ScreenPage title={t("op.orgs.title")} lead={t("op.orgs.lead")}>
      <Result result={result}>{(orgs) => <OrganizationsBody orgs={orgs} />}</Result>
    </ScreenPage>
  );
}

function OrganizationsBody({ orgs }: { readonly orgs: readonly OperatorOrg[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [plan, setPlan] = useState(ALL);
  const [page, setPage] = useState(1);

  const needle = query.trim().toLowerCase();
  const filtered = orgs.filter(
    (org) =>
      (needle === "" ||
        org.name.toLowerCase().includes(needle) ||
        org.id.toLowerCase().includes(needle)) &&
      (status === ALL || org.status === (status as OrgStatus)) &&
      (plan === ALL || org.plan === (plan as OrgPlan)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: readonly Column<OperatorOrg>[] = [
    {
      key: "name",
      header: t("op.orgs.colName"),
      sortable: true,
      render: (row) => (
        <Link href={`/operator/organizations/${row.id}`} className="text-text-0 underline">
          {row.name}
        </Link>
      ),
    },
    { key: "id", header: t("op.orgs.colId") },
    {
      key: "createdAt",
      header: t("op.orgs.colCreated"),
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "balanceMicroUsd",
      header: t("op.orgs.colBalance"),
      numeric: true,
      sortable: true,
      render: (row) => formatMicroUsd(row.balanceMicroUsd),
    },
    {
      key: "status",
      header: t("op.orgs.colStatus"),
      render: (row) => <OrgStatusBadge status={row.status} />,
    },
  ];

  function reset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label={t("op.orgs.search")}
          type="search"
          value={query}
          onChange={(event) => {
            reset(setQuery)(event.target.value);
          }}
        />
        <Select
          label={t("op.orgs.filterStatus")}
          value={status}
          options={[
            { value: ALL, label: t("op.orgs.all") },
            { value: "active", label: t("op.status.active") },
            { value: "suspended", label: t("op.status.suspended") },
          ]}
          onChange={reset(setStatus)}
        />
        <Select
          label={t("op.orgs.filterPlan")}
          value={plan}
          options={[
            { value: ALL, label: t("op.orgs.all") },
            { value: "pay-as-you-go", label: t("op.plan.payg") },
            { value: "committed", label: t("op.plan.committed") },
          ]}
          onChange={reset(setPlan)}
        />
      </div>
      <p className="text-small text-text-1">{tf("op.orgs.results", { n: filtered.length })}</p>
      {filtered.length === 0 ? (
        <EmptyState title={t("op.orgs.empty.title")} body={t("op.orgs.empty.body")} />
      ) : (
        <Table
          caption={t("op.orgs.title")}
          columns={columns}
          rows={visible}
          rowKey={(row) => row.id}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

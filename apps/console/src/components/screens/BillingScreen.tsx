"use client";

import { useState } from "react";
import { formatDate } from "../../lib/format";
import { formatMicroUsd, parseDollarsToMicro } from "../../lib/money";
import { t, tf, type MessageKey } from "../../lib/messages";
import type {
  BillingOverview,
  InvoiceRow,
  LedgerKind,
  LedgerRow,
  ScreenResult,
  Viewer,
} from "../../lib/data/types";
import { BalanceMeter } from "../ui/BalanceMeter";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Input } from "../ui/Input";
import { Table, type Column } from "../ui/Table";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

export interface BillingData {
  readonly overview: BillingOverview;
  readonly viewer: Viewer;
}

const OTHER = "other";
const BILLING_HREF = "/dashboard/billing";

const KIND_KEY: Readonly<Record<LedgerKind, MessageKey>> = {
  credit: "screen.billing.kind.credit",
  debit: "screen.billing.kind.debit",
  grant: "screen.billing.kind.grant",
  refund: "screen.billing.kind.refund",
  adjustment: "screen.billing.kind.adjustment",
};

/** C5. Amounts are integer micro-USD and are formatted by the one money helper. */
export function BillingScreen({ result }: { readonly result: ScreenResult<BillingData> }) {
  return (
    <ScreenPage title={t("screen.billing.title")} lead={t("screen.billing.lead")}>
      <Result result={result}>
        {(data) => <BillingBody overview={data.overview} viewer={data.viewer} />}
      </Result>
    </ScreenPage>
  );
}

function BillingBody({
  overview,
  viewer,
}: {
  readonly overview: BillingOverview;
  readonly viewer: Viewer;
}) {
  const notConnected = useMockAction();
  const [choice, setChoice] = useState<string>(String(overview.topUpPresetsMicroUsd[0] ?? OTHER));
  const [typed, setTyped] = useState("");
  const reason = viewer.canTopUp ? undefined : t("screen.billing.forbidden");

  const custom = choice === OTHER;
  const parsed = custom ? parseDollarsToMicro(typed) : Number(choice);
  const belowMinimum = parsed === null || parsed < overview.minTopUpMicroUsd;
  const amountError =
    custom && typed !== "" && belowMinimum
      ? tf("screen.billing.minError", { min: formatMicroUsd(overview.minTopUpMicroUsd) })
      : undefined;
  const payDisabled = !viewer.canTopUp || belowMinimum;
  const payReason = reason ?? (belowMinimum ? t("screen.billing.amountReason") : undefined);

  const ledgerColumns: readonly Column<LedgerRow>[] = [
    { key: "date", header: t("screen.billing.colDate"), render: (row) => formatDate(row.date) },
    { key: "kind", header: t("screen.billing.colKind"), render: (row) => t(KIND_KEY[row.kind]) },
    {
      key: "amountMicroUsd",
      header: t("screen.billing.colAmount"),
      numeric: true,
      render: (row) => formatMicroUsd(row.amountMicroUsd),
    },
    {
      key: "balanceMicroUsd",
      header: t("screen.billing.colBalance"),
      numeric: true,
      render: (row) => formatMicroUsd(row.balanceMicroUsd),
    },
  ];
  const invoiceColumns: readonly Column<InvoiceRow>[] = [
    { key: "date", header: t("screen.billing.colDate"), render: (row) => formatDate(row.date) },
    {
      key: "amountMicroUsd",
      header: t("screen.billing.colAmount"),
      numeric: true,
      render: (row) => formatMicroUsd(row.amountMicroUsd),
    },
    {
      key: "id",
      header: t("screen.billing.colInvoice"),
      render: (row) => (
        <Button variant="ghost" onClick={notConnected}>
          {tf("screen.billing.download", { id: row.id })}
        </Button>
      ),
    },
  ];

  return (
    <>
      {overview.paymentPending ? (
        <Banner status="info">
          <Badge status="info">{t("screen.billing.pending")}</Badge>{" "}
          {t("screen.billing.pendingBody")}
        </Banner>
      ) : null}
      {overview.paymentFailure !== null ? (
        <ErrorState
          title={t("screen.billing.failed.title")}
          cause={overview.paymentFailure.reason}
          afterUserAction
        />
      ) : null}
      {!viewer.canTopUp ? <Banner status="info">{t("screen.billing.forbidden")}</Banner> : null}
      <BalanceMeter
        balanceMicroUsd={overview.balanceMicroUsd}
        capacityMicroUsd={overview.capacityMicroUsd}
        lowThresholdMicroUsd={overview.lowThresholdMicroUsd}
        topUpHref={BILLING_HREF}
      />
      <Panel title={t("screen.billing.topUp")}>
        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="text-small text-text-1">{t("screen.billing.amountLegend")}</legend>
          {overview.topUpPresetsMicroUsd.map((amount) => (
            <label key={amount} className="flex items-center gap-2 text-body text-text-0">
              <input
                type="radio"
                name="top-up"
                value={String(amount)}
                checked={choice === String(amount)}
                onChange={() => {
                  setChoice(String(amount));
                }}
              />
              {formatMicroUsd(amount)}
            </label>
          ))}
          <label className="flex items-center gap-2 text-body text-text-0">
            <input
              type="radio"
              name="top-up"
              value={OTHER}
              checked={custom}
              onChange={() => {
                setChoice(OTHER);
              }}
            />
            {t("screen.billing.other")}
          </label>
        </fieldset>
        {custom ? (
          <Input
            label={t("screen.billing.otherAmount")}
            value={typed}
            inputMode="decimal"
            helper={tf("screen.billing.minHelper", {
              min: formatMicroUsd(overview.minTopUpMicroUsd),
            })}
            {...(amountError !== undefined ? { error: amountError } : {})}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
          />
        ) : null}
        <div>
          <Button
            variant="primary"
            disabled={payDisabled}
            {...(payReason !== undefined ? { disabledReason: payReason } : {})}
            onClick={notConnected}
          >
            {t("screen.billing.pay")}
          </Button>
        </div>
      </Panel>
      <Panel title={t("screen.billing.ledger")}>
        {overview.ledger.length === 0 ? (
          <EmptyState
            title={t("screen.billing.ledgerEmpty.title")}
            body={t("screen.billing.ledgerEmpty.body")}
          />
        ) : (
          <Table
            caption={t("screen.billing.ledger")}
            columns={ledgerColumns}
            rows={overview.ledger}
            rowKey={(row) => row.id}
          />
        )}
      </Panel>
      <Panel title={t("screen.billing.invoices")}>
        {overview.invoices.length === 0 ? (
          <p className="text-body text-text-1">{t("screen.billing.invoicesEmpty")}</p>
        ) : (
          <Table
            caption={t("screen.billing.invoices")}
            columns={invoiceColumns}
            rows={overview.invoices}
            rowKey={(row) => row.id}
          />
        )}
      </Panel>
    </>
  );
}

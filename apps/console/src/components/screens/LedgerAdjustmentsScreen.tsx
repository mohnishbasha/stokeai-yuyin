"use client";

import { useState } from "react";
import { formatDateTime } from "../../lib/format";
import { formatMicroUsd, parseDollarsToMicro } from "../../lib/money";
import { t, tf, type MessageKey } from "../../lib/messages";
import type { LedgerAdjustment, LedgerAdjustments, ScreenResult } from "../../lib/data/types";
import { ConfirmDialog } from "../operator/parts";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Table, type Column } from "../ui/Table";
import { Textarea } from "../ui/Textarea";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

type AdjustmentType = "credit" | "debit" | "refund";
const TYPES: readonly AdjustmentType[] = ["credit", "debit", "refund"];
const TYPE_LABEL: Readonly<Record<AdjustmentType, MessageKey>> = {
  credit: "op.ledger.credit",
  debit: "op.ledger.debit",
  refund: "op.ledger.refund",
};
const CURRENCY = "USD";

/** The signed effect on the balance: a debit removes money, a credit or a refund adds it. */
function signed(type: AdjustmentType, micro: number): number {
  return type === "debit" ? -micro : micro;
}

/** O3. Append-only ledger adjustments. Applying is a mock until the operator backend exists. */
export function LedgerAdjustmentsScreen({
  result,
}: {
  readonly result: ScreenResult<LedgerAdjustments>;
}) {
  return (
    <ScreenPage title={t("op.ledger.title")} lead={t("op.ledger.lead")}>
      <Result result={result}>{(data) => <LedgerBody data={data} />}</Result>
    </ScreenPage>
  );
}

function LedgerBody({ data }: { readonly data: LedgerAdjustments }) {
  const mock = useMockAction("op.mock.notice");
  const [orgId, setOrgId] = useState(data.prefill?.orgId ?? "");
  const [type, setType] = useState<AdjustmentType>(data.prefill?.type ?? "credit");
  const [amount, setAmount] = useState(data.prefill?.amount ?? "");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const org = data.orgs.find((row) => row.id === orgId);
  const micro = parseDollarsToMicro(amount);
  const valid = micro !== null && micro > 0;
  const amountError = amount !== "" && !valid ? t("op.ledger.amountError") : undefined;
  const after = org !== undefined && valid ? org.balanceMicroUsd + signed(type, micro) : undefined;
  const blocked =
    org === undefined
      ? t("op.ledger.orgError")
      : !valid
        ? t("op.ledger.amountError")
        : reason.trim() === ""
          ? t("op.reason.required")
          : undefined;

  const columns: readonly Column<LedgerAdjustment>[] = [
    { key: "at", header: t("op.ledger.colTime"), render: (row) => formatDateTime(row.at) },
    { key: "orgName", header: t("op.ledger.colOrg") },
    {
      key: "amountMicroUsd",
      header: t("op.ledger.colAmount"),
      numeric: true,
      render: (row) => formatMicroUsd(row.amountMicroUsd),
    },
    { key: "reason", header: t("op.ledger.colReason") },
    { key: "operator", header: t("op.ledger.colOperator") },
  ];

  return (
    <>
      <Panel>
        <div className="flex max-w-prose flex-col gap-4">
          <Select
            label={t("op.ledger.org")}
            value={orgId}
            options={data.orgs.map((row) => ({ value: row.id, label: `${row.name} (${row.id})` }))}
            onChange={setOrgId}
          />
          <fieldset className="flex flex-wrap items-center gap-4">
            <legend className="text-small text-text-1">{t("op.ledger.type")}</legend>
            {TYPES.map((value) => (
              <label key={value} className="flex items-center gap-2 text-body text-text-0">
                <input
                  type="radio"
                  name="adjustment-type"
                  value={value}
                  checked={type === value}
                  onChange={() => {
                    setType(value);
                  }}
                />
                {t(TYPE_LABEL[value])}
              </label>
            ))}
          </fieldset>
          <Input
            label={t("op.ledger.amount")}
            inputMode="decimal"
            value={amount}
            suffix={tf("op.ledger.currency", { code: CURRENCY })}
            {...(amountError !== undefined ? { error: amountError } : {})}
            onChange={(event) => {
              setAmount(event.target.value);
            }}
          />
          <Textarea
            label={t("op.reason.label")}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          />
          {org !== undefined && after !== undefined ? (
            <p className="font-mono text-mono text-text-0">
              {tf("op.ledger.preview", {
                before: formatMicroUsd(org.balanceMicroUsd),
                after: formatMicroUsd(after),
              })}
            </p>
          ) : null}
          {after !== undefined && after < 0 ? (
            <Banner status="warn">{t("op.ledger.negative")}</Banner>
          ) : null}
          {failed ? (
            <Banner status="err" role="alert">
              {t("op.ledger.failed")}
            </Banner>
          ) : null}
          <div>
            <Button
              variant="primary"
              disabled={blocked !== undefined}
              {...(blocked !== undefined ? { disabledReason: blocked } : {})}
              onClick={() => {
                setFailed(false);
                setConfirming(true);
              }}
            >
              {t("op.ledger.apply")}
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title={t("op.ledger.recent")}>
        <Table
          caption={t("op.ledger.recent")}
          columns={columns}
          rows={data.recent}
          rowKey={(row) => row.id}
        />
      </Panel>
      <ConfirmDialog
        open={confirming}
        title={tf("op.ledger.applyTitle", {
          type: t(TYPE_LABEL[type]).toLowerCase(),
          amount: micro === null ? "" : formatMicroUsd(micro),
          org: org?.name ?? "",
        })}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          if (data.applyFails) setFailed(true);
          else mock();
        }}
      />
    </>
  );
}

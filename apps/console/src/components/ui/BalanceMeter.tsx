"use client";

import { formatMicroUsd, percentOf } from "../../lib/money";
import { t, tf } from "../../lib/messages";
import { Button } from "./Button";

export interface BalanceMeterProps {
  readonly balanceMicroUsd?: number;
  readonly capacityMicroUsd?: number;
  readonly lowThresholdMicroUsd?: number;
  readonly topUpHref: string;
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly onRetry?: () => void;
}

/** The prepaid balance as a meter with the amount in text (DESIGN 5.12). */
export function BalanceMeter({
  balanceMicroUsd = 0,
  capacityMicroUsd = 0,
  lowThresholdMicroUsd,
  topUpHref,
  loading = false,
  error = false,
  onRetry,
}: BalanceMeterProps) {
  if (loading) {
    return (
      <div aria-busy="true" className="h-(--control-height) rounded-panel bg-bg-2">
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-panel border border-line bg-bg-1 p-4">
        <p className="text-body text-text-1">{t("meter.unavailable")}</p>
        {onRetry !== undefined ? <Button onClick={onRetry}>{t("common.retry")}</Button> : null}
      </div>
    );
  }

  const low = lowThresholdMicroUsd !== undefined && balanceMicroUsd < lowThresholdMicroUsd;
  const percent = percentOf(balanceMicroUsd, capacityMicroUsd);
  const amounts = {
    balance: formatMicroUsd(balanceMicroUsd),
    capacity: formatMicroUsd(capacityMicroUsd),
  };
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-bg-1 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-text-1">{t("meter.label")}</span>
        <span className="font-mono text-mono tabular-nums text-text-0">{amounts.balance}</span>
      </div>
      <div
        role="meter"
        aria-label={t("meter.label")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={tf(low ? "meter.valueTextLow" : "meter.valueText", amounts)}
        title={formatMicroUsd(balanceMicroUsd, { exact: true })}
        className="h-(--space-2) overflow-hidden rounded-control bg-bg-3"
      >
        <div
          className={low ? "h-full bg-warn" : "h-full bg-accent"}
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {low ? <span className="text-small text-warn">{t("meter.low")}</span> : <span />}
        <a href={topUpHref}>{t("meter.topUp")}</a>
      </div>
    </div>
  );
}

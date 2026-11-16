"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { t, tf } from "../../lib/messages";
import { Button } from "./Button";
import { Tabs } from "./Tabs";

export interface UsagePoint {
  readonly label: string;
  readonly value: number;
}

export interface UsageChartProps {
  readonly title: string;
  /** The unit shown after every value, for example "characters". */
  readonly unit: string;
  readonly points: readonly UsagePoint[];
  readonly ranges?: readonly { readonly id: string; readonly label: string }[];
  readonly range?: string;
  readonly onRangeChange?: (id: string) => void;
  readonly loading?: boolean;
  /** An ErrorState (or any node) shown in place of the chart. */
  readonly error?: ReactNode;
}

const BAR_STEP = 10;
const BAR_WIDTH = 8;
const PLOT_HEIGHT = 100;

function fmt(value: number): string {
  return value.toLocaleString("en-US");
}

/** A bar chart of usage over time with a keyboard model and a table view (DESIGN 5.13). */
export function UsageChart({
  title,
  unit,
  points,
  ranges,
  range,
  onRangeChange,
  loading = false,
  error,
}: UsageChartProps) {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = points.reduce((highest, point) => Math.max(highest, point.value), 0);
  const last = points.length - 1;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    switch (event.key) {
      case "ArrowRight":
        setActive((index) => Math.min(index + 1, last));
        break;
      case "ArrowLeft":
        setActive((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        setActive(0);
        break;
      case "End":
        setActive(last);
        break;
      case "Enter":
        setPinned((current) => (current === active ? null : active));
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  let body: ReactNode;
  if (loading) {
    body = (
      <div aria-busy="true" className="h-(--space-9) rounded-panel bg-bg-2">
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    );
  } else if (error !== undefined) {
    body = error;
  } else if (points.length === 0) {
    body = <p className="text-body text-text-1">{t("chart.empty")}</p>;
  } else if (asTable) {
    body = (
      <table className="w-full text-body">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left text-small text-text-1">
              {t("chart.colDate")}
            </th>
            <th scope="col" className="text-right text-small text-text-1">
              {t("chart.colValue")}
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td className="text-right font-mono text-mono tabular-nums">{fmt(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const current = points[active];
    body = (
      <div className="flex flex-col gap-2">
        <div className="flex gap-3">
          <div className="flex flex-col justify-between text-small text-text-1">
            <span>{tf("chart.unitValue", { value: fmt(max), unit })}</span>
            <span>{tf("chart.unitValue", { value: 0, unit })}</span>
          </div>
          <div
            role="group"
            aria-label={`${title}. ${t("chart.hint")}`}
            tabIndex={0}
            data-pinned={pinned === null ? "" : String(pinned)}
            onKeyDown={onKeyDown}
            className="flex-1 rounded-control"
          >
            <svg
              viewBox={`0 0 ${String(points.length * BAR_STEP)} ${String(PLOT_HEIGHT)}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              className="h-(--space-9) w-full"
            >
              {points.map((point, index) => {
                const height = max === 0 ? 0 : Math.round((point.value * PLOT_HEIGHT) / max);
                return (
                  <rect
                    key={point.label}
                    x={index * BAR_STEP + (BAR_STEP - BAR_WIDTH) / 2}
                    y={PLOT_HEIGHT - height}
                    width={BAR_WIDTH}
                    height={height}
                    className={index === active ? "fill-accent" : "fill-info"}
                    onMouseEnter={() => {
                      setActive(index);
                    }}
                  />
                );
              })}
            </svg>
          </div>
        </div>
        <p role="status" className="text-small text-text-0">
          {current !== undefined
            ? tf("chart.point", { label: current.label, value: fmt(current.value), unit })
            : ""}
        </p>
      </div>
    );
  }

  const content = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h3 font-medium text-text-0">{title}</h3>
        <Button
          aria-pressed={asTable}
          onClick={() => {
            setAsTable((value) => !value);
          }}
        >
          {asTable ? t("chart.viewChart") : t("chart.viewTable")}
        </Button>
      </div>
      {body}
    </div>
  );

  return (
    <section className="rounded-panel border border-line bg-bg-1 p-4">
      {ranges !== undefined && ranges.length > 0 ? (
        <Tabs
          label={t("chart.ranges")}
          tabs={ranges.map((item) => ({ id: item.id, label: item.label, panel: content }))}
          {...(range !== undefined ? { selected: range } : {})}
          onChange={(id) => {
            setActive(0);
            setPinned(null);
            onRangeChange?.(id);
          }}
        />
      ) : (
        content
      )}
    </section>
  );
}

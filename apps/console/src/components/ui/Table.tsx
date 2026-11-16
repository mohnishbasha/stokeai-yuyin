"use client";

import { useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t, tf } from "../../lib/messages";

export interface Column<Row> {
  readonly key: keyof Row & string;
  readonly header: string;
  /** Right-aligned, mono, tabular figures. */
  readonly numeric?: boolean;
  readonly sortable?: boolean;
  readonly render?: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  /** Always set; it names the table for assistive technology. */
  readonly caption: string;
  readonly columns: readonly Column<Row>[];
  readonly rows: readonly Row[];
  readonly rowKey: (row: Row) => string;
  readonly loading?: boolean;
  /** An ErrorState (or any node) shown in place of the rows. */
  readonly error?: ReactNode;
  readonly page?: number;
  readonly pageCount?: number;
  readonly onPageChange?: (page: number) => void;
}

type Direction = "ascending" | "descending";
const SKELETON_ROWS = 3;

function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

/** A data table with sortable headers and a pagination landmark (DESIGN 5.6). */
export function Table<Row extends object>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  page,
  pageCount,
  onPageChange,
}: TableProps<Row>) {
  const [sort, setSort] = useState<{ key: string; direction: Direction } | null>(null);

  if (error !== undefined) {
    return (
      <div role="region" aria-label={caption} className="rounded-panel border border-line bg-bg-1 p-4">
        {error}
      </div>
    );
  }

  const sorted =
    sort === null
      ? rows
      : [...rows].sort((a, b) => {
          const key = sort.key as keyof Row;
          const order = compare(a[key], b[key]);
          return sort.direction === "ascending" ? order : -order;
        });

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key && current.direction === "ascending"
        ? { key, direction: "descending" }
        : { key, direction: "ascending" },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <table aria-busy={loading || undefined} className="w-full border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-strong text-left text-small text-text-1">
            {columns.map((column) => {
              const direction = sort?.key === column.key ? sort.direction : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable === true ? (direction ?? "none") : undefined}
                  className={cx("px-3 py-2 font-medium", column.numeric === true && "text-right")}
                >
                  {column.sortable === true ? (
                    <button
                      type="button"
                      onClick={() => {
                        toggleSort(column.key);
                      }}
                      className="rounded-control px-1 text-small font-medium text-text-1 hover:bg-bg-3"
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {direction === "ascending" ? " ↑" : direction === "descending" ? " ↓" : ""}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <tr key={index} className="border-b border-line">
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-2">
                      <span className="block h-4 w-full rounded-control bg-bg-3" />
                    </td>
                  ))}
                </tr>
              ))
            : sorted.map((row) => (
                <tr key={rowKey(row)} className="border-b border-line hover:bg-bg-3">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cx(
                        "px-3 py-2",
                        column.numeric === true && "text-right font-mono text-mono tabular-nums",
                      )}
                    >
                      {column.render !== undefined ? column.render(row) : String(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between text-small text-text-1">
        <span>{tf("table.rows", { n: rows.length })}</span>
        {page !== undefined && pageCount !== undefined && onPageChange !== undefined ? (
          <nav aria-label={t("table.pagination")} className="flex items-center gap-2">
            <PageButton
              label={t("table.prev")}
              disabled={page <= 1}
              onClick={() => {
                onPageChange(page - 1);
              }}
            />
            <span>{tf("table.page", { page, count: pageCount })}</span>
            <PageButton
              label={t("table.next")}
              disabled={page >= pageCount}
              onClick={() => {
                onPageChange(page + 1);
              }}
            />
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className="min-h-(--control-height) rounded-control border border-line-strong px-3 text-text-0 hover:bg-bg-3 aria-disabled:text-text-2"
    >
      {label}
    </button>
  );
}

import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface StaticColumn {
  readonly header: string;
  /** Right-aligned, mono, tabular figures. */
  readonly numeric?: boolean;
}

export interface StaticTableProps {
  /** Always set; it names the table for assistive technology. */
  readonly caption: string;
  readonly columns: readonly StaticColumn[];
  /** Ready-made cells, one array per row, in column order. Plain data, so a server page can use it. */
  readonly rows: readonly (readonly { readonly key: string; readonly cell: ReactNode }[])[];
}

/**
 * A read-only table for server components. The interactive Table is a client component and
 * takes functions (render, rowKey), which a server page cannot pass to it (DESIGN 5.6).
 */
export function StaticTable({ caption, columns, rows }: StaticTableProps) {
  return (
    <table className="w-full border-collapse text-body">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-line-strong text-left text-small text-text-1">
          {columns.map((column) => (
            <th
              key={column.header}
              scope="col"
              className={cx("px-3 py-2 font-medium", column.numeric === true && "text-right")}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0]?.key} className="border-b border-line">
            {row.map((entry, index) => (
              <td
                key={entry.key}
                className={cx(
                  "px-3 py-2",
                  columns[index]?.numeric === true && "text-right font-mono text-mono tabular-nums",
                )}
              >
                {entry.cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

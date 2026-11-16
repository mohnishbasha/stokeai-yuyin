import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import {
  STATUS_BORDER_CLASS,
  STATUS_GLYPH,
  STATUS_TEXT_CLASS,
  type Status,
} from "../../lib/status";

export interface BadgeProps {
  readonly status?: Status;
  readonly children: ReactNode;
}

/** A static status label. An icon glyph always accompanies the text (DESIGN 5.10). Not focusable. */
export function Badge({ status = "neutral", children }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-control border px-2 text-small",
        STATUS_BORDER_CLASS[status],
        STATUS_TEXT_CLASS[status],
      )}
    >
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
      {children}
    </span>
  );
}

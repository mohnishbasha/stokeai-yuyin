"use client";

import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/messages";
import {
  STATUS_BORDER_CLASS,
  STATUS_GLYPH,
  STATUS_TEXT_CLASS,
  type Status,
} from "../../lib/status";
import { Button } from "./Button";

export interface BannerProps {
  readonly status: Status;
  readonly children: ReactNode;
  /** `status` for notices, `alert` for incidents. */
  readonly role?: "status" | "alert";
  readonly action?: { readonly label: string; readonly href: string };
  readonly onDismiss?: () => void;
  /** An incident banner cannot be dismissed. */
  readonly incident?: boolean;
}

/** A page-level notice with an icon, text, and an optional link action (DESIGN 5.10). */
export function Banner({
  status,
  children,
  role = "status",
  action,
  onDismiss,
  incident = false,
}: BannerProps) {
  return (
    <div
      role={role}
      className={cx(
        "flex items-center gap-3 rounded-panel border bg-bg-1 p-3 text-body text-text-0",
        STATUS_BORDER_CLASS[status],
      )}
    >
      <span aria-hidden="true" className={STATUS_TEXT_CLASS[status]}>
        {STATUS_GLYPH[status]}
      </span>
      <p className="flex-1">{children}</p>
      {action !== undefined ? <a href={action.href}>{action.label}</a> : null}
      {onDismiss !== undefined && !incident ? (
        <Button variant="ghost" onClick={onDismiss}>
          {t("common.dismiss")}
        </Button>
      ) : null}
    </div>
  );
}

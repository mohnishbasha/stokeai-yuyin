"use client";

import { useState, type ReactNode } from "react";
import { t } from "../../lib/messages";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Textarea } from "../ui/Textarea";
import { useMockAction } from "../screens/common";

/** A confirmation Dialog that names the consequence. Confirming runs `onConfirm` (DESIGN 5.8). */
export function ConfirmDialog({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmDisabledReason,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly confirmDisabledReason?: string;
  readonly children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      {...(description !== undefined ? { description } : {})}
      footer={
        <>
          <Button onClick={onClose}>{t("common.close")}</Button>
          <Button
            variant="primary"
            disabled={confirmDisabledReason !== undefined}
            {...(confirmDisabledReason !== undefined
              ? { disabledReason: confirmDisabledReason }
              : {})}
            onClick={onConfirm}
          >
            {t("op.confirm")}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

/**
 * A confirmation that needs a reason string, as every mutating operator action does (DESIGN 6.3).
 * Confirming is a mock: it shows the sample-data notice and writes nothing (S6-T03 wires it).
 */
export function ReasonDialog({
  open,
  title,
  description,
  onClose,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
}) {
  const mock = useMockAction("op.mock.notice");
  const [reason, setReason] = useState("");
  const missing = reason.trim() === "";
  return (
    <ConfirmDialog
      open={open}
      title={title}
      {...(description !== undefined ? { description } : {})}
      onClose={onClose}
      {...(missing ? { confirmDisabledReason: t("op.reason.required") } : {})}
      onConfirm={() => {
        mock();
        setReason("");
        onClose();
      }}
    >
      <Textarea
        label={t("op.reason.label")}
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
    </ConfirmDialog>
  );
}

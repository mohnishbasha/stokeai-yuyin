"use client";

import { useState } from "react";
import { t, tf } from "../../lib/messages";
import type { CustomVoiceDraft, ScreenResult } from "../../lib/data/types";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

/** C8. A custom voice request. Consent is required before the request can be submitted. */
export function VoiceRequestScreen({
  result,
}: {
  readonly result: ScreenResult<CustomVoiceDraft>;
}) {
  return (
    <ScreenPage title={t("screen.voiceRequest.title")} lead={t("screen.voiceRequest.lead")}>
      <Result result={result}>{(draft) => <RequestBody draft={draft} />}</Result>
    </ScreenPage>
  );
}

function RequestBody({ draft }: { readonly draft: CustomVoiceDraft }) {
  const notConnected = useMockAction();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(draft.status === "submitted");
  const rejected = draft.status === "rejected";
  const ready = name.trim() !== "" && consent;
  const reason = ready
    ? undefined
    : consent
      ? t("screen.voiceRequest.nameReason")
      : t("screen.voiceRequest.submitReason");

  if (submitted) {
    return (
      <Banner status="ok">
        {tf("screen.voiceRequest.submitted", { id: draft.referenceId ?? "CV-2026-0001" })}
      </Banner>
    );
  }

  const label = rejected ? t("screen.voiceRequest.resubmit") : t("screen.voiceRequest.submit");

  return (
    <>
      {rejected ? (
        <Banner status="err" role="alert">
          {t("screen.voiceRequest.rejected")} {draft.rejectionReason}
        </Banner>
      ) : null}
      <Panel>
        <Input
          label={t("screen.voiceRequest.nameLabel")}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
        <Textarea
          label={t("screen.voiceRequest.notesLabel")}
          value={notes}
          helper={t("screen.voiceRequest.notesHelper")}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
        />
        <div className="flex flex-col gap-2">
          <Button onClick={notConnected}>{t("screen.voiceRequest.upload")}</Button>
          <p className="text-small text-text-1">{t("screen.voiceRequest.uploadHelper")}</p>
        </div>
        <label className="flex items-start gap-2 text-body text-text-0">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
            }}
          />
          {t("screen.voiceRequest.consent")}
        </label>
        <div>
          <Button
            variant="primary"
            disabled={!ready}
            {...(reason !== undefined ? { disabledReason: reason } : {})}
            onClick={() => {
              setSubmitted(true);
            }}
          >
            {label}
          </Button>
        </div>
      </Panel>
    </>
  );
}

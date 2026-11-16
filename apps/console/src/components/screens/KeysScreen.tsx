"use client";

import { useState } from "react";
import { formatDate } from "../../lib/format";
import { buildMockKey } from "../../lib/data/mock";
import type { ApiKeyRecord, ScreenResult, Viewer } from "../../lib/data/types";
import { t, tf } from "../../lib/messages";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { KeyReveal } from "../ui/KeyReveal";
import { Table, type Column } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { Result, ScreenPage } from "./common";

export interface KeysData {
  readonly keys: readonly ApiKeyRecord[];
  readonly viewer: Viewer;
}

const LAST4_LENGTH = 4;

/** C3. The Result wrapper sits inside the page so the h1 is present in every state. */
export function KeysScreen({ result }: { readonly result: ScreenResult<KeysData> }) {
  return (
    <ScreenPage title={t("screen.keys.title")} lead={t("screen.keys.lead")}>
      <Result result={result}>
        {(data) => <KeysBody keys={data.keys} viewer={data.viewer} />}
      </Result>
    </ScreenPage>
  );
}

function KeysBody({
  keys: initial,
  viewer,
}: {
  readonly keys: readonly ApiKeyRecord[];
  readonly viewer: Viewer;
}) {
  const toast = useToast();
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRecord | null>(null);
  const reason = viewer.canManageKeys ? undefined : t("screen.keys.forbidden");

  function create() {
    const minted = buildMockKey(keys.length + 1);
    const record: ApiKeyRecord = {
      id: `key_${String(keys.length + 1)}_new`,
      name: name.trim(),
      prefix: minted.prefix,
      last4: minted.secret.slice(-LAST4_LENGTH),
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
    };
    setKeys((current) => [record, ...current]);
    setSecret(minted.secret);
    setCreating(false);
    setName("");
  }

  function revoke(record: ApiKeyRecord) {
    setKeys((current) => current.filter((key) => key.id !== record.id));
    setRevoking(null);
    toast.push({ kind: "success", message: tf("screen.keys.revoked", { name: record.name }) });
  }

  const columns: readonly Column<ApiKeyRecord>[] = [
    { key: "name", header: t("screen.keys.colName"), sortable: true },
    {
      key: "prefix",
      header: t("screen.keys.colPrefix"),
      render: (row) => (
        <code className="font-mono text-mono">{`${row.prefix}...${row.last4}`}</code>
      ),
    },
    {
      key: "createdAt",
      header: t("screen.keys.colCreated"),
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "lastUsedAt",
      header: t("screen.keys.colLastUsed"),
      render: (row) =>
        row.lastUsedAt === null ? t("screen.keys.never") : formatDate(row.lastUsedAt),
    },
    {
      key: "id",
      header: t("screen.keys.colActions"),
      render: (row) => (
        <Button
          variant="destructive"
          disabled={!viewer.canManageKeys}
          {...(reason !== undefined ? { disabledReason: reason } : {})}
          onClick={() => {
            setRevoking(row);
          }}
        >
          {tf("screen.keys.revoke", { name: row.name })}
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-text-1">{t("screen.keys.hint")}</p>
        <Button
          variant="primary"
          disabled={!viewer.canManageKeys}
          {...(reason !== undefined ? { disabledReason: reason } : {})}
          onClick={() => {
            setCreating(true);
          }}
        >
          {t("screen.keys.create")}
        </Button>
      </div>
      {!viewer.canManageKeys ? <Banner status="info">{t("screen.keys.forbidden")}</Banner> : null}
      {secret !== null ? (
        <KeyReveal
          secret={secret}
          onDone={() => {
            setSecret(null);
          }}
        />
      ) : null}
      {keys.length === 0 ? (
        <EmptyState
          title={t("screen.keys.empty.title")}
          body={t("screen.keys.empty.body")}
          action={{
            label: t("screen.keys.create"),
            onClick: () => {
              setCreating(true);
            },
            ...(reason !== undefined ? { disabledReason: reason } : {}),
          }}
        />
      ) : (
        <Table
          caption={t("screen.keys.title")}
          columns={columns}
          rows={keys}
          rowKey={(row) => row.id}
        />
      )}
      <Dialog
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
        title={t("screen.keys.createTitle")}
        description={t("screen.keys.createBody")}
        footer={
          <>
            <Button
              onClick={() => {
                setCreating(false);
              }}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="primary"
              disabled={name.trim() === ""}
              disabledReason={t("screen.keys.nameRequired")}
              onClick={create}
            >
              {t("screen.keys.createSubmit")}
            </Button>
          </>
        }
      >
        <Input
          label={t("screen.keys.nameLabel")}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </Dialog>
      <Dialog
        open={revoking !== null}
        onClose={() => {
          setRevoking(null);
        }}
        title={
          revoking === null
            ? ""
            : tf("screen.keys.revokeTitle", { name: revoking.name, last4: revoking.last4 })
        }
        description={t("screen.keys.revokeBody")}
        footer={
          <>
            <Button
              onClick={() => {
                setRevoking(null);
              }}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (revoking !== null) revoke(revoking);
              }}
            >
              {t("screen.keys.revokeConfirm")}
            </Button>
          </>
        }
      />
    </>
  );
}

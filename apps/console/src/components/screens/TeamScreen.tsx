"use client";

import { useState } from "react";
import { ROLES, type Role } from "../../lib/auth/types";
import { t, tf, type MessageKey } from "../../lib/messages";
import type { ScreenResult, TeamMember, Viewer } from "../../lib/data/types";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Table, type Column } from "../ui/Table";
import { useToast } from "../ui/Toast";
import { Result, ScreenPage } from "./common";

export interface TeamData {
  readonly members: readonly TeamMember[];
  readonly viewer: Viewer;
}

const ROLE_KEY: Readonly<Record<Role, MessageKey>> = {
  owner: "role.owner",
  admin: "role.admin",
  developer: "role.developer",
  billing: "role.billing",
};

/** C9. Members and roles. The last owner cannot be removed (PRD FR-022). */
export function TeamScreen({ result }: { readonly result: ScreenResult<TeamData> }) {
  return (
    <ScreenPage title={t("screen.team.title")} lead={t("screen.team.lead")}>
      <Result result={result}>
        {(data) => <TeamBody members={data.members} viewer={data.viewer} />}
      </Result>
    </ScreenPage>
  );
}

function TeamBody({
  members: initial,
  viewer,
}: {
  readonly members: readonly TeamMember[];
  readonly viewer: Viewer;
}) {
  const toast = useToast();
  const [members, setMembers] = useState(initial);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const reason = viewer.canManageMembers ? undefined : t("screen.team.forbidden");
  const owners = members.filter((member) => member.role === "owner").length;

  function invite() {
    const member: TeamMember = {
      id: `mem_new_${String(members.length + 1)}`,
      name: email.trim(),
      email: email.trim(),
      role,
      status: "invited",
    };
    setMembers((current) => [...current, member]);
    setInviting(false);
    setEmail("");
  }

  function remove(member: TeamMember) {
    setMembers((current) => current.filter((row) => row.id !== member.id));
    toast.push({ kind: "success", message: tf("screen.team.removed", { name: member.name }) });
  }

  function removeReason(member: TeamMember): string | undefined {
    if (reason !== undefined) return reason;
    return member.role === "owner" && owners <= 1 ? t("screen.team.lastOwner") : undefined;
  }

  const columns: readonly Column<TeamMember>[] = [
    { key: "name", header: t("screen.team.colName"), sortable: true },
    { key: "email", header: t("screen.team.colEmail") },
    { key: "role", header: t("screen.team.colRole"), render: (row) => t(ROLE_KEY[row.role]) },
    {
      key: "status",
      header: t("screen.team.colStatus"),
      render: (row) =>
        row.status === "invited" ? (
          <Badge status="warn">{t("screen.team.invited")}</Badge>
        ) : (
          <Badge status="ok">{t("screen.team.active")}</Badge>
        ),
    },
    {
      key: "id",
      header: t("screen.team.colActions"),
      render: (row) => {
        const why = removeReason(row);
        return (
          <Button
            variant="destructive"
            disabled={why !== undefined}
            {...(why !== undefined ? { disabledReason: why } : {})}
            onClick={() => {
              remove(row);
            }}
          >
            {tf("screen.team.remove", { name: row.name })}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      {reason !== undefined ? <Banner status="info">{reason}</Banner> : null}
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={reason !== undefined}
          {...(reason !== undefined ? { disabledReason: reason } : {})}
          onClick={() => {
            setInviting(true);
          }}
        >
          {t("screen.team.invite")}
        </Button>
      </div>
      {members.length <= 1 ? (
        <EmptyState
          title={t("screen.team.empty.title")}
          body={t("screen.team.empty.body")}
          action={{
            label: t("screen.team.invite"),
            onClick: () => {
              setInviting(true);
            },
            ...(reason !== undefined ? { disabledReason: reason } : {}),
          }}
        />
      ) : null}
      <Table
        caption={t("screen.team.title")}
        columns={columns}
        rows={members}
        rowKey={(row) => row.id}
      />
      <Dialog
        open={inviting}
        onClose={() => {
          setInviting(false);
        }}
        title={t("screen.team.inviteTitle")}
        footer={
          <>
            <Button
              onClick={() => {
                setInviting(false);
              }}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="primary"
              disabled={!email.includes("@")}
              disabledReason={t("screen.team.emailReason")}
              onClick={invite}
            >
              {t("screen.team.inviteSubmit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label={t("screen.team.colEmail")}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
          <Select
            label={t("screen.team.colRole")}
            value={role}
            options={ROLES.map((value) => ({ value, label: t(ROLE_KEY[value]) }))}
            onChange={(value) => {
              setRole(ROLES.find((candidate) => candidate === value) ?? "developer");
            }}
          />
        </div>
      </Dialog>
    </>
  );
}

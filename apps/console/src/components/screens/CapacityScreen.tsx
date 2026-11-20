"use client";

import { useState } from "react";
import { formatDateTime } from "../../lib/format";
import { t, tf, type MessageKey } from "../../lib/messages";
import type {
  AdmissionMode,
  FleetCapacity,
  FleetNode,
  NodeState,
  ScreenResult,
} from "../../lib/data/types";
import { ReasonDialog } from "../operator/parts";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Select } from "../ui/Select";
import { Table, type Column } from "../ui/Table";
import { UsageChart } from "../ui/UsageChart";
import { Panel, Result, ScreenPage, useMockAction } from "./common";

const NODE_STATE_LABEL: Readonly<Record<NodeState, MessageKey>> = {
  ready: "op.capacity.stateReady",
  draining: "op.capacity.stateDraining",
  down: "op.capacity.stateDown",
};
const ADMISSION_LABEL: Readonly<Record<AdmissionMode, MessageKey>> = {
  open: "op.capacity.admissionOpen",
  shedding: "op.capacity.admissionShedding",
  closed: "op.capacity.admissionClosed",
};
const ADMISSION_MODES: readonly AdmissionMode[] = ["open", "shedding", "closed"];

/** O6. Fleet capacity. Without metrics it shows no figures and no estimate (DESIGN O6). */
export function CapacityScreen({ result }: { readonly result: ScreenResult<FleetCapacity> }) {
  const updated =
    result.status === "ok" && result.data.metricsAvailable
      ? tf("op.capacity.updated", { time: formatDateTime(result.data.updatedAt) })
      : undefined;
  return (
    <ScreenPage
      title={t("op.capacity.title")}
      {...(updated !== undefined ? { lead: updated } : {})}
    >
      <Result result={result}>{(fleet) => <CapacityBody fleet={fleet} />}</Result>
    </ScreenPage>
  );
}

function CapacityBody({ fleet }: { readonly fleet: FleetCapacity }) {
  const mock = useMockAction("op.mock.notice");
  const mode = fleet.admission;
  const [target, setTarget] = useState<AdmissionMode>(nextMode(fleet.admission));
  const [changing, setChanging] = useState(false);

  if (!fleet.metricsAvailable) {
    return (
      <EmptyState
        title={t("op.capacity.unavailable.title")}
        body={tf("op.capacity.unavailable.body", { time: formatDateTime(fleet.lastGoodReadAt) })}
      />
    );
  }

  const columns: readonly Column<FleetNode>[] = [
    { key: "id", header: t("op.capacity.colNode") },
    { key: "nodeClass", header: t("op.capacity.colClass") },
    {
      key: "state",
      header: t("op.capacity.colState"),
      render: (row) => (
        <Badge status={row.state === "ready" ? "ok" : row.state === "draining" ? "warn" : "err"}>
          {t(NODE_STATE_LABEL[row.state])}
        </Badge>
      ),
    },
    { key: "activeSessions", header: t("op.capacity.colActive"), numeric: true },
    { key: "sessionLimit", header: t("op.capacity.colLimit"), numeric: true },
  ];

  return (
    <>
      <Panel title={t("op.capacity.nodes")}>
        <Table
          caption={t("op.capacity.nodes")}
          columns={columns}
          rows={fleet.nodes}
          rowKey={(row) => row.id}
        />
      </Panel>
      <Panel title={t("op.capacity.admission")}>
        <div className="flex flex-wrap items-center gap-3">
          <Badge status={mode === "open" ? "ok" : mode === "shedding" ? "warn" : "err"}>
            {t(ADMISSION_LABEL[mode])}
          </Badge>
          <Select
            label={t("op.capacity.target")}
            value={target}
            options={ADMISSION_MODES.map((value) => ({
              value,
              label: t(ADMISSION_LABEL[value]),
            }))}
            onChange={(value) => {
              setTarget(ADMISSION_MODES.find((candidate) => candidate === value) ?? mode);
            }}
          />
          <Button
            disabled={target === mode}
            disabledReason={t("op.capacity.sameMode")}
            onClick={() => {
              setChanging(true);
            }}
          >
            {t("op.capacity.change")}
          </Button>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-small text-text-1">{t("op.capacity.queue")}</dt>
            <dd className="font-mono text-mono text-text-0">{fleet.queueDepth}</dd>
          </div>
          <div>
            <dt className="text-small text-text-1">{t("op.capacity.rejections")}</dt>
            <dd className="font-mono text-mono text-text-0">{fleet.rejections503}</dd>
          </div>
        </dl>
      </Panel>
      <UsageChart
        title={t("op.capacity.chart")}
        unit={t("op.capacity.chartUnit")}
        points={fleet.sessions}
      />
      <Panel title={t("op.capacity.incident")}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={mock}>{t("op.capacity.createIncident")}</Button>
          <Button
            disabled={!fleet.incidentOpen}
            disabledReason={t("op.capacity.noIncident")}
            onClick={mock}
          >
            {t("op.capacity.resolveIncident")}
          </Button>
        </div>
      </Panel>
      <ReasonDialog
        open={changing}
        title={tf("op.capacity.changeTitle", { mode: t(ADMISSION_LABEL[target]) })}
        onClose={() => {
          setChanging(false);
        }}
      />
    </>
  );
}

/** The mode the control offers first: the next one along from the current mode. */
function nextMode(mode: AdmissionMode): AdmissionMode {
  const index = ADMISSION_MODES.indexOf(mode);
  return ADMISSION_MODES[(index + 1) % ADMISSION_MODES.length] ?? "open";
}

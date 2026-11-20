// The mock operator data (S2-T05, DESIGN 6.3 O1 to O7). Fixed and deterministic, shaped by the
// `?state=` flag like the console mock. Real reads go through the operator repository in S6-T03.
// Money is integer micro-USD. Keys carry a prefix and last four only. Evidence text is a
// placeholder sentence, never real customer text.
import type { ScreenState } from "../screens";
import type {
  AbuseCase,
  AuditEntry,
  FleetNode,
  LedgerAdjustment,
  OperatorApi,
  OperatorOrg,
  OrgDetail,
  UsagePointRecord,
  VoiceRequestItem,
} from "./types";

/** What the operator mock borrows from the console mock, passed in to avoid an import cycle. */
export interface OperatorMockContext {
  readonly state: ScreenState;
  readonly read: <T>(value: () => T) => Promise<T>;
  readonly daysAgo: (n: number) => string;
  readonly keyPrefix: (index: number) => string;
}

const OPERATOR_ACTOR = "operator@yuyin.example";

function orgs(ctx: OperatorMockContext): readonly OperatorOrg[] {
  const rows = [
    { id: "org_acme", name: "Acme Voice", ago: 120, balance: 62_400_000, plan: "pay-as-you-go" },
    { id: "org_bharat", name: "Bharat Telecom", ago: 90, balance: 480_000_000, plan: "committed" },
    {
      id: "org_chai",
      name: "Chai Point Support",
      ago: 64,
      balance: 8_150_000,
      plan: "pay-as-you-go",
    },
    { id: "org_desi", name: "Desi Reads", ago: 51, balance: 0, plan: "pay-as-you-go" },
    { id: "org_ekta", name: "Ekta Bank", ago: 33, balance: 215_000_000, plan: "committed" },
    { id: "org_fable", name: "Fable Audio", ago: 18, balance: 31_750_000, plan: "pay-as-you-go" },
    { id: "org_gati", name: "Gati Logistics", ago: 9, balance: 12_600_000, plan: "pay-as-you-go" },
  ] as const;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: ctx.daysAgo(row.ago),
    balanceMicroUsd: row.balance,
    plan: row.plan,
    status:
      row.id === "org_desi" || (row.id === "org_acme" && ctx.state === "suspended")
        ? ("suspended" as const)
        : ("active" as const),
    ownerEmail: `owner@${row.id.slice(4)}.example`,
  }));
}

function usage(ctx: OperatorMockContext): readonly UsagePointRecord[] {
  return Array.from({ length: 14 }, (_, i) => ({
    label: ctx.daysAgo(13 - i).slice(0, 10),
    value: 8_000 + ((i * 6_131) % 7_000),
  }));
}

function detail(ctx: OperatorMockContext, id: string): OrgDetail | null {
  if (ctx.state === "not-found") return null;
  const org = orgs(ctx).find((row) => row.id === id);
  if (org === undefined) return null;
  return {
    org,
    keys: [
      { name: "Production", last4: "a91f", created: 40, used: 0 },
      { name: "Staging", last4: "7c2e", created: 12, used: 3 },
    ].map((row, index) => ({
      id: `key_${String(index + 1)}`,
      name: row.name,
      prefix: ctx.keyPrefix(index),
      last4: row.last4,
      createdAt: ctx.daysAgo(row.created),
      lastUsedAt: ctx.daysAgo(row.used),
    })),
    usage: usage(ctx),
    events: [
      { id: "evt_3", ago: 1, event: "Top-up of $25.00 settled", actor: "stripe" },
      { id: "evt_2", ago: 6, event: "API key created", actor: org.ownerEmail },
      { id: "evt_1", ago: 40, event: "Organization created", actor: OPERATOR_ACTOR },
    ].map((row) => ({ id: row.id, at: ctx.daysAgo(row.ago), event: row.event, actor: row.actor })),
    abuseFlags: 1,
    voiceRequests: 1,
  };
}

function adjustments(ctx: OperatorMockContext): readonly LedgerAdjustment[] {
  return [
    {
      id: "adj_3",
      ago: 1,
      org: "Acme Voice",
      orgId: "org_acme",
      amount: 5_000_000,
      reason: "Goodwill credit after the 12 November incident",
    },
    {
      id: "adj_2",
      ago: 4,
      org: "Chai Point Support",
      orgId: "org_chai",
      amount: -2_000_000,
      reason: "Reversal of a duplicate credit",
    },
    {
      id: "adj_1",
      ago: 11,
      org: "Gati Logistics",
      orgId: "org_gati",
      amount: 12_000_000,
      reason: "Refund of a failed batch job",
    },
  ].map((row) => ({
    id: row.id,
    at: ctx.daysAgo(row.ago),
    orgId: row.orgId,
    orgName: row.org,
    amountMicroUsd: row.amount,
    reason: row.reason,
    operator: OPERATOR_ACTOR,
  }));
}

function abuseCases(ctx: OperatorMockContext): readonly AbuseCase[] {
  if (ctx.state === "empty") return [];
  const rows = [
    {
      id: "case_101",
      ago: 1,
      org: "org_desi",
      name: "Desi Reads",
      source: "Rate pattern",
      severity: "high",
      summary: "Sustained synthesis of the same text from many keys.",
    },
    {
      id: "case_102",
      ago: 3,
      org: "org_fable",
      name: "Fable Audio",
      source: "Customer report",
      severity: "medium",
      summary: "A third party reported impersonation in generated audio.",
    },
    {
      id: "case_103",
      ago: 7,
      org: "org_gati",
      name: "Gati Logistics",
      source: "Policy pattern",
      severity: "low",
      summary: "Text matched a configured policy pattern once.",
    },
  ] as const;
  return rows.map((row, index) => ({
    id: row.id,
    openedAt: ctx.daysAgo(row.ago),
    orgId: row.org,
    orgName: row.name,
    source: row.source,
    severity: row.severity,
    status: "open" as const,
    summary: row.summary,
    evidence: "Redacted sample text held by the case, shown only after an audited reveal.",
    timeline: [
      { at: ctx.daysAgo(row.ago), text: "Case opened" },
      { at: ctx.daysAgo(Math.max(row.ago - 1, 0)), text: "Evidence attached" },
    ],
    conflict: ctx.state === "conflict" && index === 0,
  }));
}

function voiceRequests(ctx: OperatorMockContext): readonly VoiceRequestItem[] {
  if (ctx.state === "empty") return [];
  const unavailable = ctx.state === "asset-error";
  return [
    {
      id: "cv_req_21",
      org: "Acme Voice",
      stage: "review",
      ago: 2,
      owner: "Meera K.",
      consent: "verified",
      checks: ["pass", "pass"],
    },
    {
      id: "cv_req_22",
      org: "Bharat Telecom",
      stage: "consent",
      ago: 5,
      owner: "Unassigned",
      consent: "pending",
      checks: ["pass", "fail"],
    },
    {
      id: "cv_req_23",
      org: "Ekta Bank",
      stage: "recordings",
      ago: 8,
      owner: "Ravi N.",
      consent: "verified",
      checks: ["fail", "pass"],
    },
  ].map((row) => ({
    id: row.id,
    orgName: row.org,
    stage: row.stage as VoiceRequestItem["stage"],
    submittedAt: ctx.daysAgo(row.ago),
    owner: row.owner,
    consent: row.consent as VoiceRequestItem["consent"],
    recordings: row.checks.map((check, index) => ({
      id: `${row.id}_rec_${String(index + 1)}`,
      name: `Recording ${String(index + 1)}`,
      check: check as "pass" | "fail",
    })),
    assetUnavailable: unavailable,
  }));
}

const NODE_SESSION_LIMIT = 200;

function nodes(): readonly FleetNode[] {
  return [
    { id: "node-a1", nodeClass: "cpu-standard", state: "ready", activeSessions: 142 },
    { id: "node-a2", nodeClass: "cpu-standard", state: "ready", activeSessions: 117 },
    { id: "node-b1", nodeClass: "cpu-large", state: "draining", activeSessions: 38 },
    { id: "node-b2", nodeClass: "cpu-large", state: "down", activeSessions: 0 },
  ].map((row) => ({
    ...row,
    state: row.state as FleetNode["state"],
    sessionLimit: NODE_SESSION_LIMIT,
  }));
}

function auditEntries(ctx: OperatorMockContext): readonly AuditEntry[] {
  if (ctx.state === "empty") return [];
  return [
    {
      id: "aud_6",
      ago: 0,
      action: "ledger.adjust",
      target: "org_acme",
      org: "org_acme",
      reason: "Goodwill credit after the 12 November incident",
      before: "$57.40",
      after: "$62.40",
    },
    {
      id: "aud_5",
      ago: 1,
      action: "org.suspend",
      target: "org_desi",
      org: "org_desi",
      reason: "Confirmed abuse, case_101",
      before: "active",
      after: "suspended",
    },
    {
      id: "aud_4",
      ago: 2,
      action: "abuse.dismiss",
      target: "case_099",
      org: "org_chai",
      reason: "False positive on policy pattern",
      before: "open",
      after: "dismissed",
    },
    {
      id: "aud_3",
      ago: 4,
      action: "ledger.adjust",
      target: "org_chai",
      org: "org_chai",
      reason: "Reversal of a duplicate credit",
      before: "$10.15",
      after: "$8.15",
    },
    {
      id: "aud_2",
      ago: 6,
      action: "voice.approve",
      target: "cv_req_18",
      org: "org_ekta",
      reason: "Consent verified, checks passed",
      before: "review",
      after: "approved",
    },
    {
      id: "aud_1",
      ago: 9,
      action: "admission.change",
      target: "fleet",
      org: "none",
      reason: "Planned maintenance window",
      before: "open",
      after: "shedding",
    },
  ].map((row) => ({
    id: row.id,
    at: ctx.daysAgo(row.ago),
    actor: OPERATOR_ACTOR,
    action: row.action,
    target: row.target,
    orgId: row.org,
    reason: row.reason,
    before: row.before,
    after: row.after,
  }));
}

/** Creates the mock operator reads for one state flag. */
export function createOperatorMock(ctx: OperatorMockContext): OperatorApi {
  const { read } = ctx;
  return {
    orgs: {
      list: () => read(() => (ctx.state === "empty" ? [] : orgs(ctx))),
      get: (id) => read(() => detail(ctx, id)),
    },
    ledger: {
      overview: () =>
        read(() => ({
          orgs: orgs(ctx),
          recent: adjustments(ctx),
          applyFails: ctx.state === "failed",
          prefill:
            ctx.state === "negative"
              ? { orgId: "org_chai", type: "debit" as const, amount: "20.00" }
              : null,
        })),
    },
    abuse: { cases: () => read(() => abuseCases(ctx)) },
    customVoices: { queue: () => read(() => voiceRequests(ctx)) },
    fleet: {
      capacity: () =>
        read(() => ({
          metricsAvailable: ctx.state !== "metrics-unavailable",
          updatedAt: ctx.daysAgo(0),
          lastGoodReadAt: ctx.daysAgo(0),
          nodes: nodes(),
          admission: "open",
          queueDepth: 7,
          rejections503: 3,
          sessions: Array.from({ length: 12 }, (_, i) => ({
            label: `${String(i * 2).padStart(2, "0")}:00`,
            value: 120 + ((i * 53) % 140),
          })),
          incidentOpen: false,
        })),
    },
    audit: { entries: () => read(() => auditEntries(ctx)) },
  };
}

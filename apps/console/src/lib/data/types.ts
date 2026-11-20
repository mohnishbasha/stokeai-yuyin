// The console data layer contract (S2-T05). The mock layer in `mock.ts` implements these
// interfaces now; the real layer (typed repository over the gateway and Postgres, always setting
// the Nile tenant context) implements the same ones later without a screen change.
// Money is integer micro-USD (SOUL). Dates are ISO 8601 UTC strings.
import type { Role } from "../auth/types";

/** A failure the screens show as an ErrorState with its code and trace ID (DESIGN 5.15). */
export class DataError extends Error {
  readonly code: string;
  readonly traceId: string;

  constructor(code: string, traceId: string) {
    super(code);
    this.name = "DataError";
    this.code = code;
    this.traceId = traceId;
  }
}

export interface Viewer {
  readonly role: Role;
  readonly canManageKeys: boolean;
  readonly canTopUp: boolean;
  readonly canManageMembers: boolean;
  readonly canManageLexicon: boolean;
}

export interface ApiKeyRecord {
  readonly id: string;
  readonly name: string;
  /** Non-secret prefix. The secret and its hash are never returned (PRD FR-015). */
  readonly prefix: string;
  readonly last4: string;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

export interface VoiceRecord {
  readonly id: string;
  readonly name: string;
  readonly languages: readonly string[];
  readonly style: string;
  readonly description: string;
  /** Set when the voice is not on the current plan. */
  readonly unavailableReason?: string;
}

export type CustomVoiceStatus = "in_review" | "approved" | "rejected";

export interface CustomVoiceRecord {
  readonly id: string;
  readonly name: string;
  readonly status: CustomVoiceStatus;
}

export const USAGE_RANGES = ["7d", "30d", "90d"] as const;
export type UsageRange = (typeof USAGE_RANGES)[number];

export interface UsagePointRecord {
  readonly label: string;
  readonly value: number;
}

export interface UsageTotals {
  readonly characters: number;
  readonly requests: number;
  readonly spendMicroUsd: number;
}

export interface UsageSummary {
  readonly series: Readonly<Record<UsageRange, readonly UsagePointRecord[]>>;
  readonly totals: Readonly<Record<UsageRange, UsageTotals>>;
  readonly byKey: readonly {
    readonly name: string;
    readonly characters: number;
    readonly requests: number;
  }[];
  readonly byVoice: readonly { readonly name: string; readonly characters: number }[];
  /** Today's figures are still being aggregated (DESIGN C4, partial data). */
  readonly partial: boolean;
}

export type LedgerKind = "credit" | "debit" | "grant" | "refund" | "adjustment";

export interface LedgerRow {
  readonly id: string;
  readonly date: string;
  readonly kind: LedgerKind;
  readonly amountMicroUsd: number;
  readonly balanceMicroUsd: number;
}

export interface InvoiceRow {
  readonly id: string;
  readonly date: string;
  readonly amountMicroUsd: number;
}

export interface BillingOverview {
  readonly balanceMicroUsd: number;
  readonly capacityMicroUsd: number;
  readonly lowThresholdMicroUsd: number;
  readonly lowBalanceAlert: boolean;
  /** Preset top-up amounts and the minimum come from config (PRD FR-016). */
  readonly topUpPresetsMicroUsd: readonly number[];
  readonly minTopUpMicroUsd: number;
  readonly paymentPending: boolean;
  readonly paymentFailure: { readonly reason: string } | null;
  readonly ledger: readonly LedgerRow[];
  readonly invoices: readonly InvoiceRow[];
}

export interface LexiconEntry {
  readonly id: string;
  readonly written: string;
  readonly language: "hi" | "en";
  readonly spokenAs: string;
}

export interface LexiconOverview {
  readonly entries: readonly LexiconEntry[];
  readonly limit: number;
  readonly importErrors: readonly { readonly line: number; readonly message: string }[];
}

export type MemberStatus = "active" | "invited";

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly status: MemberStatus;
}

export interface OrgSettings {
  readonly orgName: string;
  readonly defaultVoiceId: string;
  readonly defaultLanguage: string;
  readonly interfaceLanguage: string;
  readonly theme: "dark" | "light" | "system";
}

export interface CustomVoiceDraft {
  readonly status: "draft" | "submitted" | "rejected";
  readonly referenceId?: string;
  readonly rejectionReason?: string;
}

export interface PlaygroundContext {
  readonly balanceMicroUsd: number;
  readonly charLimit: number;
  readonly pricePerThousandMicroUsd: number;
  readonly sampleText: string;
}

export interface OnboardingProgress {
  readonly keyCreated: boolean;
  readonly requestSent: boolean;
  readonly heard: boolean;
}

export interface ViewerApi {
  get(): Promise<Viewer>;
}
export interface KeysApi {
  list(): Promise<readonly ApiKeyRecord[]>;
}
export interface UsageApi {
  summary(): Promise<UsageSummary>;
}
export interface BillingApi {
  overview(): Promise<BillingOverview>;
}
export interface LexiconApi {
  overview(): Promise<LexiconOverview>;
}
export interface VoicesApi {
  list(): Promise<readonly VoiceRecord[]>;
  custom(): Promise<readonly CustomVoiceRecord[]>;
  draft(): Promise<CustomVoiceDraft>;
}
export interface TeamApi {
  list(): Promise<readonly TeamMember[]>;
}
export interface SettingsApi {
  get(): Promise<OrgSettings>;
}
export interface PlaygroundApi {
  context(): Promise<PlaygroundContext>;
}
export interface OnboardingApi {
  progress(): Promise<OnboardingProgress>;
}

// Operator types (DESIGN 6.3, O1 to O7). Mock data until S6-T03 wires the operator repository.

export type OrgStatus = "active" | "suspended";
export type OrgPlan = "pay-as-you-go" | "committed";

export interface OperatorOrg {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly balanceMicroUsd: number;
  readonly status: OrgStatus;
  readonly plan: OrgPlan;
  readonly ownerEmail: string;
}

export interface OrgEvent {
  readonly id: string;
  readonly at: string;
  readonly event: string;
  readonly actor: string;
}

export interface OrgDetail {
  readonly org: OperatorOrg;
  /** Prefix and last four only, never the secret (PRD FR-015). */
  readonly keys: readonly ApiKeyRecord[];
  readonly usage: readonly UsagePointRecord[];
  readonly events: readonly OrgEvent[];
  readonly abuseFlags: number;
  readonly voiceRequests: number;
}

export interface LedgerAdjustment {
  readonly id: string;
  readonly at: string;
  readonly orgId: string;
  readonly orgName: string;
  readonly amountMicroUsd: number;
  readonly reason: string;
  readonly operator: string;
}

export interface LedgerAdjustments {
  readonly orgs: readonly OperatorOrg[];
  readonly recent: readonly LedgerAdjustment[];
  /** `failed` makes the next apply report that nothing was applied (DESIGN O3). */
  readonly applyFails: boolean;
  /** A form the screen opens with, used to show the would-go-negative warning. */
  readonly prefill: {
    readonly orgId: string;
    readonly type: "credit" | "debit" | "refund";
    /** Typed dollars, as the form field holds them. */
    readonly amount: string;
  } | null;
}

export type AbuseSeverity = "low" | "medium" | "high";
export type AbuseStatus = "open" | "actioned";

export interface AbuseCase {
  readonly id: string;
  readonly openedAt: string;
  readonly orgId: string;
  readonly orgName: string;
  readonly source: string;
  readonly severity: AbuseSeverity;
  readonly status: AbuseStatus;
  readonly summary: string;
  /** Held server-side and shown redacted until an audited reveal (DESIGN O4). */
  readonly evidence: string;
  readonly timeline: readonly { readonly at: string; readonly text: string }[];
  /** Set when another operator already actioned the case. */
  readonly conflict: boolean;
}

export type VoiceStage = "consent" | "recordings" | "review" | "decided";
export type ConsentStatus = "verified" | "pending";

export interface VoiceRequestItem {
  readonly id: string;
  readonly orgName: string;
  readonly stage: VoiceStage;
  readonly submittedAt: string;
  readonly owner: string;
  readonly consent: ConsentStatus;
  readonly recordings: readonly {
    readonly id: string;
    readonly name: string;
    readonly check: "pass" | "fail";
  }[];
  /** Recordings cannot be played (DESIGN O5, asset unavailable). */
  readonly assetUnavailable: boolean;
}

export type AdmissionMode = "open" | "shedding" | "closed";
export type NodeState = "ready" | "draining" | "down";

export interface FleetNode {
  readonly id: string;
  readonly nodeClass: string;
  readonly state: NodeState;
  readonly activeSessions: number;
  readonly sessionLimit: number;
}

export interface FleetCapacity {
  /** False when gateway metrics cannot be read: no figures, only the last good read. */
  readonly metricsAvailable: boolean;
  readonly updatedAt: string;
  readonly lastGoodReadAt: string;
  readonly nodes: readonly FleetNode[];
  readonly admission: AdmissionMode;
  readonly queueDepth: number;
  readonly rejections503: number;
  readonly sessions: readonly UsagePointRecord[];
  readonly incidentOpen: boolean;
}

export interface AuditEntry {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly action: string;
  readonly target: string;
  readonly orgId: string;
  readonly reason: string;
  readonly before: string;
  readonly after: string;
}

export interface OrgsApi {
  list(): Promise<readonly OperatorOrg[]>;
  /** `null` when the organization does not exist. */
  get(id: string): Promise<OrgDetail | null>;
}
export interface LedgerAdjustmentsApi {
  overview(): Promise<LedgerAdjustments>;
}
export interface AbuseApi {
  cases(): Promise<readonly AbuseCase[]>;
}
export interface CustomVoiceQueueApi {
  queue(): Promise<readonly VoiceRequestItem[]>;
}
export interface FleetApi {
  capacity(): Promise<FleetCapacity>;
}
export interface AuditApi {
  entries(): Promise<readonly AuditEntry[]>;
}

/** What the operator screens read. Reads only: mutations and audit writes arrive in S6-T03. */
export interface OperatorApi {
  readonly orgs: OrgsApi;
  readonly ledger: LedgerAdjustmentsApi;
  readonly abuse: AbuseApi;
  readonly customVoices: CustomVoiceQueueApi;
  readonly fleet: FleetApi;
  readonly audit: AuditApi;
}

/** Everything a console screen reads. The mock and the real layer both implement this. */
export interface ConsoleData {
  readonly viewer: ViewerApi;
  readonly keys: KeysApi;
  readonly usage: UsageApi;
  readonly billing: BillingApi;
  readonly lexicon: LexiconApi;
  readonly voices: VoicesApi;
  readonly team: TeamApi;
  readonly settings: SettingsApi;
  readonly playground: PlaygroundApi;
  readonly onboarding: OnboardingApi;
  readonly operator: OperatorApi;
}

/** What a page hands to its screen component: serialisable, so it crosses the server boundary. */
export type ScreenResult<T> =
  | { readonly status: "ok"; readonly data: T }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly code: string; readonly traceId: string };

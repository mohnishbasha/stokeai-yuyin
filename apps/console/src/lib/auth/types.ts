// Auth domain types (ARCHITECTURE section 10 data model, ADR-025).

export const ROLES = ["owner", "admin", "developer", "billing"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "suspended";
  /** Reserved for Clerk (Next phase). Always null in the current phase. */
  readonly externalAuthId: string | null;
  readonly createdAt: Date;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly status: "active" | "disabled";
  readonly createdAt: Date;
}

export interface Membership {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: Role;
}

export interface MembershipWithOrg extends Membership {
  readonly orgName: string;
  readonly orgStatus: Organization["status"];
}

export interface LoginTokenRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: Buffer;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly issuedBy: string;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly tokenHash: Buffer;
  readonly csrfSecret: Buffer;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}

/** Data access for the auth subset. Postgres in production, in memory in unit tests. */
export interface AuthStore {
  createOrganization(org: Organization): Promise<void>;
  createUser(user: User): Promise<void>;
  addMembership(membership: Membership): Promise<void>;
  findOrganization(id: string): Promise<Organization | null>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  /** Memberships of a user with organization names, ordered by organization name. */
  membershipsForUser(userId: string): Promise<MembershipWithOrg[]>;
  insertLoginToken(record: LoginTokenRecord): Promise<void>;
  /**
   * Atomically marks the token used and returns it, only when the hash matches, it is unused,
   * and it has not expired at `now`. Returns null otherwise.
   */
  consumeLoginToken(tokenHash: Buffer, now: Date): Promise<LoginTokenRecord | null>;
  insertSession(record: SessionRecord): Promise<void>;
  findSessionByHash(tokenHash: Buffer): Promise<SessionRecord | null>;
  setSessionTenant(sessionId: string, tenantId: string): Promise<void>;
  revokeSession(sessionId: string, now: Date): Promise<void>;
}

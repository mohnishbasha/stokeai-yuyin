import type {
  AuthStore,
  LoginTokenRecord,
  Membership,
  MembershipWithOrg,
  Organization,
  SessionRecord,
  User,
} from "./types";

/** In-memory AuthStore for unit tests. Mirrors the constraints in migrations/0001. */
export class MemoryAuthStore implements AuthStore {
  readonly organizations = new Map<string, Organization>();
  readonly users = new Map<string, User>();
  readonly memberships: Membership[] = [];
  readonly loginTokens: LoginTokenRecord[] = [];
  readonly sessions = new Map<string, SessionRecord>();

  createOrganization(org: Organization): Promise<void> {
    this.organizations.set(org.id, org);
    return Promise.resolve();
  }

  createUser(user: User): Promise<void> {
    if (user.email !== user.email.toLowerCase()) {
      return Promise.reject(new Error("email must be lower case"));
    }
    for (const existing of this.users.values()) {
      if (existing.email === user.email) {
        return Promise.reject(new Error("duplicate email"));
      }
    }
    this.users.set(user.id, user);
    return Promise.resolve();
  }

  addMembership(membership: Membership): Promise<void> {
    if (!this.organizations.has(membership.tenantId) || !this.users.has(membership.userId)) {
      return Promise.reject(new Error("unknown organization or user"));
    }
    const duplicate = this.memberships.some(
      (m) => m.tenantId === membership.tenantId && m.userId === membership.userId,
    );
    if (duplicate) {
      return Promise.reject(new Error("duplicate membership"));
    }
    this.memberships.push(membership);
    return Promise.resolve();
  }

  findOrganization(id: string): Promise<Organization | null> {
    return Promise.resolve(this.organizations.get(id) ?? null);
  }

  findUserById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  membershipsForUser(userId: string): Promise<MembershipWithOrg[]> {
    const rows: MembershipWithOrg[] = [];
    for (const m of this.memberships) {
      const org = this.organizations.get(m.tenantId);
      if (m.userId === userId && org !== undefined) {
        rows.push({ ...m, orgName: org.name, orgStatus: org.status });
      }
    }
    return Promise.resolve(rows.sort((a, b) => a.orgName.localeCompare(b.orgName)));
  }

  insertLoginToken(record: LoginTokenRecord): Promise<void> {
    if (this.loginTokens.some((t) => t.tokenHash.equals(record.tokenHash))) {
      return Promise.reject(new Error("duplicate token hash"));
    }
    this.loginTokens.push(record);
    return Promise.resolve();
  }

  consumeLoginToken(tokenHash: Buffer, now: Date): Promise<LoginTokenRecord | null> {
    const index = this.loginTokens.findIndex(
      (t) => t.tokenHash.equals(tokenHash) && t.usedAt === null && t.expiresAt > now,
    );
    const found = this.loginTokens[index];
    if (found === undefined) {
      return Promise.resolve(null);
    }
    const used = { ...found, usedAt: now };
    this.loginTokens[index] = used;
    return Promise.resolve(used);
  }

  insertSession(record: SessionRecord): Promise<void> {
    this.sessions.set(record.id, record);
    return Promise.resolve();
  }

  findSessionByHash(tokenHash: Buffer): Promise<SessionRecord | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenHash.equals(tokenHash)) {
        return Promise.resolve(session);
      }
    }
    return Promise.resolve(null);
  }

  setSessionTenant(sessionId: string, tenantId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session !== undefined) {
      this.sessions.set(sessionId, { ...session, tenantId });
    }
    return Promise.resolve();
  }

  revokeSession(sessionId: string, now: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session !== undefined && session.revokedAt === null) {
      this.sessions.set(sessionId, { ...session, revokedAt: now });
    }
    return Promise.resolve();
  }
}

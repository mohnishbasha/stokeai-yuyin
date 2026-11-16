// PostgreSQL implementation of AuthStore (ADR-024). Plain SQL against migrations/0001. Kept out
// of src/lib so the unit coverage gate measures logic, while this file is exercised against a
// real Postgres in the integration job (tests/unit/pg-store.test.ts, needs DATABASE_URL).
import pg from "pg";
import type {
  AuthStore,
  LoginTokenRecord,
  Membership,
  MembershipWithOrg,
  Organization,
  Role,
  SessionRecord,
  User,
} from "../lib/auth/types";

type Row = Record<string, unknown>;

function organization(row: Row): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    status: row.status as Organization["status"],
    externalAuthId: (row.external_auth_id as string | null) ?? null,
    createdAt: row.created_at as Date,
  };
}

function user(row: Row): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    status: row.status as User["status"],
    createdAt: row.created_at as Date,
  };
}

function loginToken(row: Row): LoginTokenRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tokenHash: row.token_hash as Buffer,
    expiresAt: row.expires_at as Date,
    usedAt: (row.used_at as Date | null) ?? null,
    issuedBy: row.issued_by as string,
  };
}

function session(row: Row): SessionRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    tenantId: row.tenant_id as string,
    tokenHash: row.token_hash as Buffer,
    csrfSecret: row.csrf_secret as Buffer,
    expiresAt: row.expires_at as Date,
    revokedAt: (row.revoked_at as Date | null) ?? null,
    createdAt: row.created_at as Date,
  };
}

export class PgAuthStore implements AuthStore {
  constructor(private readonly pool: pg.Pool) {}

  static fromUrl(connectionString: string, options: pg.PoolConfig = {}): PgAuthStore {
    return new PgAuthStore(
      new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, ...options }),
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createOrganization(org: Organization): Promise<void> {
    await this.pool.query(
      "insert into organizations (id, external_auth_id, name, status, created_at) values ($1, $2, $3, $4, $5)",
      [org.id, org.externalAuthId, org.name, org.status, org.createdAt],
    );
  }

  async createUser(u: User): Promise<void> {
    await this.pool.query(
      "insert into users (id, email, name, status, created_at) values ($1, $2, $3, $4, $5)",
      [u.id, u.email, u.name, u.status, u.createdAt],
    );
  }

  async addMembership(m: Membership): Promise<void> {
    await this.pool.query(
      "insert into memberships (tenant_id, user_id, role) values ($1, $2, $3)",
      [m.tenantId, m.userId, m.role],
    );
  }

  async findOrganization(id: string): Promise<Organization | null> {
    const result = await this.pool.query("select * from organizations where id = $1", [id]);
    return result.rows[0] === undefined ? null : organization(result.rows[0] as Row);
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.pool.query("select * from users where id = $1", [id]);
    return result.rows[0] === undefined ? null : user(result.rows[0] as Row);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query("select * from users where email = $1", [email]);
    return result.rows[0] === undefined ? null : user(result.rows[0] as Row);
  }

  async membershipsForUser(userId: string): Promise<MembershipWithOrg[]> {
    const result = await this.pool.query(
      `select m.tenant_id, m.user_id, m.role, o.name as org_name, o.status as org_status
         from memberships m join organizations o on o.id = m.tenant_id
        where m.user_id = $1 order by o.name, o.id`,
      [userId],
    );
    return (result.rows as Row[]).map((row) => ({
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      role: row.role as Role,
      orgName: row.org_name as string,
      orgStatus: row.org_status as Organization["status"],
    }));
  }

  async insertLoginToken(record: LoginTokenRecord): Promise<void> {
    await this.pool.query(
      `insert into login_tokens (id, user_id, token_hash, expires_at, used_at, issued_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        record.id,
        record.userId,
        record.tokenHash,
        record.expiresAt,
        record.usedAt,
        record.issuedBy,
      ],
    );
  }

  async consumeLoginToken(tokenHash: Buffer, now: Date): Promise<LoginTokenRecord | null> {
    // One statement: the row is claimed by whichever caller updates it first.
    const result = await this.pool.query(
      `update login_tokens set used_at = $2
        where token_hash = $1 and used_at is null and expires_at > $2
        returning *`,
      [tokenHash, now],
    );
    return result.rows[0] === undefined ? null : loginToken(result.rows[0] as Row);
  }

  async insertSession(record: SessionRecord): Promise<void> {
    await this.pool.query(
      `insert into sessions (id, user_id, tenant_id, token_hash, csrf_secret, expires_at, revoked_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        record.id,
        record.userId,
        record.tenantId,
        record.tokenHash,
        record.csrfSecret,
        record.expiresAt,
        record.revokedAt,
        record.createdAt,
      ],
    );
  }

  async findSessionByHash(tokenHash: Buffer): Promise<SessionRecord | null> {
    const result = await this.pool.query("select * from sessions where token_hash = $1", [
      tokenHash,
    ]);
    return result.rows[0] === undefined ? null : session(result.rows[0] as Row);
  }

  async setSessionTenant(sessionId: string, tenantId: string): Promise<void> {
    await this.pool.query("update sessions set tenant_id = $2 where id = $1", [
      sessionId,
      tenantId,
    ]);
  }

  async revokeSession(sessionId: string, now: Date): Promise<void> {
    await this.pool.query(
      "update sessions set revoked_at = $2 where id = $1 and revoked_at is null",
      [sessionId, now],
    );
  }
}

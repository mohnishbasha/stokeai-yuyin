// Operator library behind the `yuyin-admin` command (ADR-025). There is no self-serve sign-up:
// organizations and users exist only because an operator created them here.
import { uuidv7 } from "./ids";
import { issueLoginToken } from "./login";
import { isRole } from "./types";
import type { AuthStore, Organization, Role, User } from "./types";

export { issueLoginToken };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createOrganization(
  store: AuthStore,
  input: { name: string },
  now: Date = new Date(),
): Promise<Organization> {
  const name = input.name.trim();
  if (name.length === 0 || name.length > 200) {
    throw new Error("organization name must be 1 to 200 characters");
  }
  const org: Organization = {
    id: uuidv7(now),
    name,
    status: "active",
    externalAuthId: null,
    createdAt: now,
  };
  await store.createOrganization(org);
  return org;
}

/**
 * Creates a user and adds it to an organization with a role. When the email already exists the
 * existing user is reused, so one person can belong to several organizations.
 */
export async function createUser(
  store: AuthStore,
  input: { email: string; name: string; orgId: string; role: Role },
  now: Date = new Date(),
): Promise<User> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    throw new Error("invalid email address");
  }
  if (!isRole(input.role)) {
    throw new Error("role must be owner, admin, developer, or billing");
  }
  if ((await store.findOrganization(input.orgId)) === null) {
    throw new Error("organization not found");
  }
  const existing = await store.findUserByEmail(email);
  const user: User = existing ?? {
    id: uuidv7(now),
    email,
    name: input.name.trim() || email,
    status: "active",
    createdAt: now,
  };
  if (existing === null) {
    await store.createUser(user);
  }
  await store.addMembership({ tenantId: input.orgId, userId: user.id, role: input.role });
  return user;
}

/** The sign-in link an operator sends to a user. The token is in the query, not the path. */
export function loginLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/sign-in?token=${token}`;
}

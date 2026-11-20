import type { Role } from "./types";

// Role checks run on the server for every action; the client never decides authorisation
// (ARCHITECTURE, Console). PRD FR-021.
export type Action =
  | "console.view"
  | "keys.manage"
  | "billing.topup"
  | "billing.view"
  | "usage.view"
  | "members.manage"
  | "org.switch";

const MATRIX: Record<Role, readonly Action[]> = {
  owner: [
    "console.view",
    "keys.manage",
    "billing.topup",
    "billing.view",
    "usage.view",
    "members.manage",
    "org.switch",
  ],
  admin: [
    "console.view",
    "keys.manage",
    "billing.topup",
    "billing.view",
    "usage.view",
    "members.manage",
    "org.switch",
  ],
  developer: ["console.view", "keys.manage", "usage.view", "org.switch"],
  billing: ["console.view", "billing.topup", "billing.view", "usage.view", "org.switch"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}

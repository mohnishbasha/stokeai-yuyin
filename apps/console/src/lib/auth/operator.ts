/** Parses OPERATOR_USER_IDS, a comma or whitespace separated list of user ids. */
export function parseOperatorIds(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,]+/)
      .map((id) => id.trim().toLowerCase())
      .filter((id) => id.length > 0),
  );
}

/** Operator access is an allowlist. An empty or unset list denies everyone. */
export function isOperator(userId: string, allowlist: ReadonlySet<string>): boolean {
  return allowlist.has(userId.toLowerCase());
}

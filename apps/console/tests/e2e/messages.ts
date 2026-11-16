// The console message catalogue for Playwright specs. Playwright's loader runs as native ESM,
// which refuses a bare JSON import, so the catalogue is read from disk. The keys are still
// checked against the app's own `MessageKey` type.
import { readFileSync } from "node:fs";
import type { MessageKey } from "../../src/lib/messages";

const CATALOGUE = JSON.parse(
  readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8"),
) as Record<MessageKey, string>;

export function t(key: MessageKey): string {
  return CATALOGUE[key];
}

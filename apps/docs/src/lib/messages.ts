// Every user-visible string comes from a messages file so Hindi localisation can be added
// later (AGENTS.md, TypeScript and React). English is the only locale for now.
import en from "../messages/en.json";

export type MessageKey = keyof typeof en;

export function t(key: MessageKey): string {
  return en[key];
}

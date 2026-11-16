// Every user-visible string comes from a messages file so Hindi localisation can be added
// later (AGENTS.md, TypeScript and React). English is the only locale for now.
import en from "../messages/en.json";

export type MessageKey = keyof typeof en;

export function t(key: MessageKey): string {
  return en[key];
}

/** Like `t`, with `{name}` placeholders replaced. Numbers use en-US digit grouping. */
export function tf(key: MessageKey, params: Readonly<Record<string, string | number>>): string {
  return en[key].replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === "number" ? value.toLocaleString("en-US") : value;
  });
}

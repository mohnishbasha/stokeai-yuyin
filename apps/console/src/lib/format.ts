// Display helpers for the console screens. Dates are UTC in storage and in the mock layer;
// the display uses a fixed locale and time zone so the server and browser render the same text
// (the user's own locale arrives with the settings backend).

const DATE = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** A UTC date and time for audit and event rows, for example `Nov 16, 2026, 00:00 UTC`. */
export function formatDateTime(iso: string): string {
  return `${DATE_TIME.format(new Date(iso))} UTC`;
}

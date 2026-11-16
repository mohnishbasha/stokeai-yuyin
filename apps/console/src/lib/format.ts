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

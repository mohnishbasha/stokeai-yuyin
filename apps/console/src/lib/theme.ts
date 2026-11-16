// Theme selection (DESIGN 2). Dark is the default. A stored choice is kept in a cookie so the
// server can render data-theme without an inline script; with no choice the attribute is
// omitted and tokens.css follows the OS preference.

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "yuyin-theme";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Returns the theme named by `value`, or undefined when it is not a known theme. */
export function parseTheme(value: string | null | undefined): Theme | undefined {
  return THEMES.find((theme) => theme === value);
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/** The `document.cookie` assignment that stores the user's choice. */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${String(ONE_YEAR_SECONDS)}; samesite=lax`;
}

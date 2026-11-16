"use client";

import { useEffect, useState } from "react";
import { t } from "../lib/messages";
import { DEFAULT_THEME, THEME_COOKIE, nextTheme, parseTheme, themeCookie, type Theme } from "../lib/theme";

function storedTheme(): Theme | undefined {
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${THEME_COOKIE}=`));
  return parseTheme(entry?.slice(THEME_COOKIE.length + 1));
}

/**
 * A pressed button means the light theme is on. The site is static, so the stored choice is
 * applied after hydration; with no choice, tokens.css follows the OS preference.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = storedTheme();
    if (stored !== undefined) {
      document.documentElement.dataset["theme"] = stored;
      setTheme(stored);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  function toggle() {
    const next = nextTheme(theme);
    document.documentElement.dataset["theme"] = next;
    document.cookie = themeCookie(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      aria-pressed={theme === "light"}
      onClick={toggle}
      className="inline-flex min-h-(--control-height) items-center rounded-control border border-line-strong bg-bg-2 px-3 text-small text-text-0 hover:bg-bg-3"
    >
      {t("theme.toggle")}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME, nextTheme, themeCookie, type Theme } from "../lib/theme";
import { t } from "../lib/messages";

interface ThemeToggleProps {
  /** The theme stored in the cookie, or undefined when the user has not chosen. */
  readonly initial: Theme | undefined;
}

/** A pressed button means the light theme is on. Reachable and operable by keyboard. */
export function ThemeToggle({ initial }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initial ?? DEFAULT_THEME);

  useEffect(() => {
    if (initial === undefined && window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, [initial]);

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

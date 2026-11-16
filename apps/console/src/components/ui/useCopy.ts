"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/** How long the "Copied" label stays (DESIGN 5.11). */
export const COPY_RESET_MS = 2_000;

/** Writes text to the clipboard and reports the outcome, resetting after two seconds. */
export function useCopy(): { state: CopyState; copy: (text: string) => Promise<void> } {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    let next: CopyState = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = "failed";
    }
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState("idle");
    }, COPY_RESET_MS);
  }, []);

  return { state, copy };
}

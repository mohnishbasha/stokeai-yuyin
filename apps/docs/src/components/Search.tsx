"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { t } from "../lib/messages";
import { isSearchIndex, search, type SearchEntry } from "../lib/search";
import { SEARCH_INDEX_URL } from "../lib/site";

/** Search field over the static index. `/` focuses it. The index loads on first focus. */
export function Search() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<readonly SearchEntry[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function load() {
    if (index !== null) return;
    void fetch(SEARCH_INDEX_URL)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        setIndex(isSearchIndex(data) ? data : []);
      })
      .catch(() => {
        setIndex([]);
      });
  }

  const results = useMemo(() => (index === null ? [] : search(index, query)), [index, query]);
  const showEmpty = index !== null && query.trim() !== "" && results.length === 0;

  return (
    <div className="relative">
      <input
        ref={input}
        type="search"
        value={query}
        onFocus={load}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        aria-label={t("search.label")}
        aria-controls={listId}
        placeholder={t("search.placeholder")}
        title={t("search.hint")}
        className="min-h-(--control-height) w-full rounded-control border border-line-strong bg-bg-2 px-3 text-small text-text-0"
      />
      <div id={listId} className="absolute left-0 right-0 z-10 mt-1">
        {results.length > 0 && (
          <ul
            aria-label={t("search.results")}
            className="rounded-panel border border-line bg-bg-1 p-2"
          >
            {results.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => {
                    setQuery("");
                  }}
                  className="block rounded-control px-3 py-2 text-small text-text-0 no-underline hover:bg-bg-2"
                >
                  <span className="font-medium">{entry.title}</span>
                  <span className="block text-text-2">{entry.context}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {showEmpty && (
          <p
            role="status"
            className="rounded-panel border border-line bg-bg-1 px-3 py-2 text-small text-text-1"
          >
            {t("search.noResults").replace("{query}", query.trim())}
          </p>
        )}
      </div>
    </div>
  );
}

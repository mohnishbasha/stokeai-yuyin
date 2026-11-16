"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { t, type MessageKey } from "../../lib/messages";
import { Input } from "../ui/Input";

export interface FaqItem {
  readonly question: MessageKey;
  readonly answer: MessageKey;
}

/** Disclosure accordion with client-side search (DESIGN M5). Answers stay in the markup. */
export function FaqList({ items }: { readonly items: readonly FaqItem[] }) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const needle = query.trim().toLowerCase();
  const shown = items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        needle === "" ||
        t(item.question).toLowerCase().includes(needle) ||
        t(item.answer).toLowerCase().includes(needle),
    );

  function toggle(index: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  }

  return (
    <div className="flex max-w-prose flex-col gap-4">
      <Input
        type="search"
        label={t("site.faq.search")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {shown.length === 0 ? (
        <p role="status" className="text-body text-text-1">
          {t("site.faq.none")} <Link href="/contact">{t("site.nav.contact")}</Link>
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map(({ item, index }) => {
            const expanded = open.has(index);
            return (
              <li key={item.question} className="border-b border-line py-3">
                <h2 className="text-h3 font-medium text-text-0">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`${uid}-${String(index)}`}
                    onClick={() => {
                      toggle(index);
                    }}
                    className="w-full rounded-control text-left hover:bg-bg-3"
                  >
                    {t(item.question)}
                  </button>
                </h2>
                <p
                  id={`${uid}-${String(index)}`}
                  hidden={!expanded}
                  className="mt-2 text-body text-text-1"
                >
                  {t(item.answer)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-body text-text-1">
        {t("site.faq.stuck")} <Link href="/contact">{t("site.faq.contact")}</Link>
      </p>
    </div>
  );
}

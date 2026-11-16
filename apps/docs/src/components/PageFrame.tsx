import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "../lib/messages";
import { neighbours } from "../lib/nav";

export interface TocItem {
  readonly id: string;
  readonly text: string;
}

interface PageFrameProps {
  readonly href: string;
  readonly toc: readonly TocItem[];
  readonly children: ReactNode;
}

/** Article column, "On this page" list at lg and above, and previous and next links. */
export function PageFrame({ href, toc, children }: PageFrameProps) {
  const { previous, next } = neighbours(href);
  return (
    <div className="flex gap-6">
      <article className="min-w-0 flex-1">
        {children}
        <nav aria-label={t("nav.pager")} className="mt-7 flex justify-between gap-4 text-small">
          {previous ? (
            <Link href={previous.href}>
              {t("nav.previous")}: {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href}>
              {t("nav.next")}: {next.title}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
      {toc.length > 0 && (
        <nav
          aria-label={t("nav.toc")}
          className="hidden w-[calc(var(--space-9)*2)] shrink-0 text-small lg:block"
        >
          <h2 className="mb-2 text-small font-semibold text-text-2">{t("nav.toc")}</h2>
          <ul className="flex flex-col gap-1">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-text-1 no-underline hover:text-text-0">
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

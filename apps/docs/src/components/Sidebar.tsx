import Link from "next/link";
import { t } from "../lib/messages";
import { PAGES, SECTIONS } from "../lib/nav";

interface SidebarProps {
  /** The path of the page being shown; its link carries aria-current="page". */
  readonly currentPath: string;
}

/** Sections in a fixed order, each with its pages (DESIGN 6.4 docs frame). */
export function Sidebar({ currentPath }: SidebarProps) {
  return (
    <nav aria-label={t("nav.sidebar")} className="flex flex-col gap-5 text-small">
      {SECTIONS.map((section) => (
        <div key={section}>
          <h2 className="mb-2 text-small font-semibold text-text-2">{section}</h2>
          <ul className="flex flex-col gap-1">
            {PAGES.filter((page) => page.section === section).map((page) => {
              const current = page.href === currentPath;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    {...(current ? { "aria-current": "page" as const } : {})}
                    className={
                      current
                        ? "block rounded-control bg-accent-dim px-3 py-1 font-medium text-text-0 no-underline"
                        : "block rounded-control px-3 py-1 text-text-1 no-underline hover:bg-bg-2"
                    }
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

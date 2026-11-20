import type { ReactNode } from "react";

export interface MarketingPageProps {
  readonly title: string;
  readonly lead?: string;
  readonly children?: ReactNode;
}

/** The common frame of a marketing screen: `main#main`, one h1, an optional lead line. */
export function MarketingPage({ title, lead, children }: MarketingPageProps) {
  return (
    <main id="main" className="mx-auto max-w-content px-4 py-8 lg:px-6 lg:py-9">
      <h1 className="max-w-prose text-h1 font-medium text-text-0 lg:text-display">{title}</h1>
      {lead !== undefined ? <p className="mt-4 max-w-prose text-body text-text-1">{lead}</p> : null}
      <div className="mt-7 flex flex-col gap-7">{children}</div>
    </main>
  );
}

export interface SectionProps {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}

/** A titled region of a page. The heading names the region for assistive technology. */
export function Section({ id, title, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex max-w-prose flex-col gap-3">
      <h2 id={`${id}-heading`} className="text-h2 font-medium text-text-0">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { readonly children: ReactNode }) {
  return <p className="max-w-prose text-body text-text-1 [&_a]:underline">{children}</p>;
}

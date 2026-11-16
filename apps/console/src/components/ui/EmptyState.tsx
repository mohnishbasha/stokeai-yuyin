"use client";

import { useId } from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  readonly title: string;
  readonly body: string;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
    readonly disabledReason?: string;
  };
  readonly docs?: { readonly label: string; readonly href: string };
}

/** Explains an empty area and offers the one next step (DESIGN 5.14). */
export function EmptyState({ title, body, action, docs }: EmptyStateProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col items-start gap-3 rounded-panel border border-line bg-bg-1 p-6"
    >
      <h2 id={headingId} className="text-h3 font-medium text-text-0">
        {title}
      </h2>
      <p className="max-w-prose text-body text-text-1">{body}</p>
      {action !== undefined ? (
        <Button
          variant="primary"
          onClick={action.onClick}
          disabled={action.disabledReason !== undefined}
          {...(action.disabledReason !== undefined
            ? { disabledReason: action.disabledReason }
            : {})}
        >
          {action.label}
        </Button>
      ) : null}
      {docs !== undefined ? <a href={docs.href}>{docs.label}</a> : null}
    </section>
  );
}

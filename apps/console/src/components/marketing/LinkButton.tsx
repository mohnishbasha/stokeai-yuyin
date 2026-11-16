import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

export interface LinkButtonProps {
  readonly href: string;
  readonly variant?: "primary" | "secondary";
  readonly children: ReactNode;
}

const VARIANT_CLASS = {
  primary: "border-accent bg-accent text-accent-ink",
  secondary: "border-line-strong bg-transparent text-text-0",
} as const;

/** A link that looks like a Button. Navigation uses a link, not a button (DESIGN 5.1). */
export function LinkButton({ href, variant = "secondary", children }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-(--control-height) items-center justify-center rounded-control border px-4 text-body font-medium no-underline",
        VARIANT_CLASS[variant],
      )}
    >
      {children}
    </Link>
  );
}

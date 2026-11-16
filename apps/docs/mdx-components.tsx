import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { slugify } from "./src/lib/slug";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => textOf(child as ReactNode)).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Heading with a stable anchor id, so the "On this page" list and search can link to it. */
function heading(Tag: "h2" | "h3", className: string) {
  return function Heading({ children, ...rest }: ComponentPropsWithoutRef<"h2">) {
    return (
      <Tag id={slugify(textOf(children))} className={className} {...rest}>
        {children}
      </Tag>
    );
  };
}

/** Elements used by MDX pages, styled with tokens only. */
export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    h1: (props) => <h1 className="mb-4 text-h1 font-semibold text-text-0" {...props} />,
    h2: heading("h2", "mt-7 mb-3 text-h2 font-semibold text-text-0 scroll-mt-5"),
    h3: heading("h3", "mt-5 mb-2 text-h3 font-semibold text-text-0 scroll-mt-5"),
    p: (props) => <p className="mb-4 max-w-prose text-text-1" {...props} />,
    ul: (props) => <ul className="mb-4 max-w-prose list-disc pl-5 text-text-1" {...props} />,
    ol: (props) => <ol className="mb-4 max-w-prose list-decimal pl-5 text-text-1" {...props} />,
    li: (props) => <li className="mb-1" {...props} />,
    a: ({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) =>
      href.startsWith("/") ? (
        <Link href={href}>{children}</Link>
      ) : (
        <a href={href} {...rest}>
          {children}
        </a>
      ),
    table: (props) => (
      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-small" {...props} />
      </div>
    ),
    th: (props) => (
      <th className="border-b border-line-strong px-3 py-2 font-medium text-text-0" {...props} />
    ),
    td: (props) => <td className="border-b border-line px-3 py-2 text-text-1" {...props} />,
    pre: (props) => (
      <pre
        className="mb-4 overflow-x-auto rounded-panel border border-line bg-bg-1 p-4 text-text-0"
        tabIndex={0}
        {...props}
      />
    ),
    blockquote: (props) => (
      <blockquote
        className="mb-4 max-w-prose rounded-panel border border-line bg-bg-2 px-4 py-3 text-text-1"
        {...props}
      />
    ),
    ...components,
  };
}

import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const config: NextConfig = {
  // A static site: every page, the API reference, and the search index are built ahead of time.
  // `make build-docs` publishes apps/docs/dist (ARCHITECTURE 16).
  output: "export",
  distDir: "dist",
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default createMDX({
  // GitHub-flavoured Markdown for tables. Named as a string so Turbopack can load it.
  options: { remarkPlugins: ["remark-gfm"] },
})(config);

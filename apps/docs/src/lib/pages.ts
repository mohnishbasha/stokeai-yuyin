import type { ComponentType } from "react";

/** One loader per MDX file under src/content, keyed by the `file` in the page manifest. */
export const MDX_LOADERS: Readonly<Record<string, () => Promise<{ default: ComponentType }>>> = {
  index: () => import("../content/index.mdx"),
  "guides/index": () => import("../content/guides/index.mdx"),
  "guides/normalisation": () => import("../content/guides/normalisation.mdx"),
  sdks: () => import("../content/sdks.mdx"),
  "self-hosting": () => import("../content/self-hosting.mdx"),
};

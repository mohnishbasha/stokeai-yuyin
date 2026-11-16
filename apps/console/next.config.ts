import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  // Self-contained server for the distroless image (deploy/docker/Dockerfile.console).
  output: "standalone",
  // The Bun workspace root, so the standalone trace includes hoisted node_modules.
  outputFileTracingRoot: join(dirname(fileURLToPath(import.meta.url)), "../.."),
  // The console does not use next/image; the Dockerfile prunes sharp and its LGPL libvips from the standalone output.
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
  headers() {
    return Promise.resolve([
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ]);
  },
};

export default config;

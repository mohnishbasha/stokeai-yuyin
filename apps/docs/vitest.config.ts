import { defineConfig } from "vitest/config";

// Unit tests run in node; a component test opts in to jsdom with a `@vitest-environment jsdom`
// docblock. JSX uses the automatic runtime (tsconfig jsx: react-jsx).
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});

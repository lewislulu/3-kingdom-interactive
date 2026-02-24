import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@sgyy/schema": path.resolve(__dirname, "packages/schema/src/index.ts")
    }
  }
});

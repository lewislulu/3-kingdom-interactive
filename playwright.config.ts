import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3100"
  },
  webServer: {
    command: "npm run dev --workspace @sgyy/web -- --port 3100",
    port: 3100,
    reuseExistingServer: false,
    timeout: 120000
  }
});

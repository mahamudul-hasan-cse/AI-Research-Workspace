import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // A production build with the test-only chat sabotage hooks compiled in,
    // so the assistant can be driven by scripted replies instead of a model.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/assistant`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE: "1",
      // Satisfies the route's configuration check; it is not a valid key, so
      // even an unscripted request could never reach a paid model.
      OPENROUTER_API_KEY: "e2e-placeholder-not-a-real-key",
    },
  },
});

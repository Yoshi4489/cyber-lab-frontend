import { defineConfig, devices } from "@playwright/test";

/**
 * Deterministic, test-only values for the loopback backend fixture. They are
 * not credentials for any deployment: the fixture and the frontend both listen
 * on 127.0.0.1 and no live target is reachable from this configuration.
 */
const loopbackBffEnv = {
  BFF_AUTH_SECRET: "test-only-bff-authentication-secret-value",
  BFF_SESSION_SECRET: "test-only-frontend-session-secret-value",
  BACKEND_SERVICE_TOKEN_SECRET: "test-only-service-token-secret-value",
  SERVICE_TOKEN_ISSUER: "ciscoku-frontend-test",
  SERVICE_TOKEN_AUDIENCE: "ciscoku-backend-test",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "node tests/fixtures/backend.mjs",
      url: "http://127.0.0.1:4101/healthz",
      reuseExistingServer: false,
      env: { BACKEND_FIXTURE_LISTEN: "true", ...loopbackBffEnv },
    },
    {
      command: "npm run start -- --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: {
        BACKEND_URL: "http://127.0.0.1:4101",
        BFF_PUBLIC_ORIGIN: "http://127.0.0.1:3100",
        LIVE_INSTANCE_UI: "true",
        ...loopbackBffEnv,
      },
    },
  ],
});

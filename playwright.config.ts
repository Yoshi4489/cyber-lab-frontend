import { defineConfig, devices } from "@playwright/test";

// No backend process: populated settings and an unavailable origin must not
// affect the preview. Unit tests separately spy on all upstream entry points.
export default defineConfig({
  testDir: "./tests/preview",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: {
      FRONTEND_MODE: "preview", BACKEND_URL: "http://127.0.0.1:4199",
      BFF_PUBLIC_ORIGIN: "http://127.0.0.1:3100", LIVE_INSTANCE_UI: "true",
      BFF_AUTH_SECRET: "test-only-bff-authentication-secret-value",
      BFF_SESSION_SECRET: "test-only-frontend-session-secret-value",
      BACKEND_SERVICE_TOKEN_SECRET: "test-only-service-token-secret-value",
      SERVICE_TOKEN_ISSUER: "ciscoku-frontend-test", SERVICE_TOKEN_AUDIENCE: "ciscoku-backend-test",
    },
  },
});

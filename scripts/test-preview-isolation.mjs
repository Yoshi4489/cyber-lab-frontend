import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { CompactEncrypt } from "jose";

// Disposable loopback services only. The upstream records attempted requests;
// it never implements authentication, lab operations or a database.
const upstreamRequests = [];
const upstream = createHttpServer((request, response) => {
  upstreamRequests.push({ method: request.method, path: request.url });
  request.resume();
  response.writeHead(503, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: "UNAVAILABLE" }));
});
const sessionSecret = "test-only-frontend-session-secret-value";
const cookieName = "ciscoku.backend-session";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const pages = [
  "/", "/labs", "/labs/cookie-monster", "/labs/cookie-monster/session", "/saved",
  "/dashboard", "/leaderboard", "/profile", "/paths", "/guide", "/login", "/signup",
  "/verify-email?token=old-test-token", "/forgot-password", "/reset-password?token=old-test-token",
];
const endpoints = [
  ["GET", "/api/catalog"], ["GET", "/api/backend-status"], ["GET", "/api/auth/session"],
  ...["login", "logout", "verification/request", "verification/confirm", "password-reset/request", "password-reset/confirm"]
    .map(path => ["POST", `/api/auth/${path}`]),
  ["POST", "/api/instances"], ["GET", `/api/instances/${instanceId}`],
  ["DELETE", `/api/instances/${instanceId}`], ["POST", `/api/instances/${instanceId}/extend`],
  ["POST", "/api/submissions"],
];
let child;
let browser;
let output = "";

try {
  const upstreamPort = await listen(upstream);
  const probe = await fetch(`http://127.0.0.1:${upstreamPort}/tripwire-check`, { signal: AbortSignal.timeout(1_000) });
  assert.equal(probe.status, 503);
  assert.equal(upstreamRequests.length, 1, "The reachable upstream tripwire must record requests.");
  upstreamRequests.length = 0;
  const frontendPort = await availablePort();
  const origin = `http://127.0.0.1:${frontendPort}`;
  child = startFrontend(frontendPort, {
    FRONTEND_MODE: "preview", BACKEND_URL: `http://127.0.0.1:${upstreamPort}`,
    BFF_PUBLIC_ORIGIN: origin, LIVE_INSTANCE_UI: "true",
    BFF_AUTH_SECRET: "test-only-bff-authentication-secret-value",
    BFF_SESSION_SECRET: sessionSecret,
    BACKEND_SERVICE_TOKEN_SECRET: "test-only-service-token-secret-value",
    SERVICE_TOKEN_ISSUER: "ciscoku-frontend-test", SERVICE_TOKEN_AUDIENCE: "ciscoku-backend-test",
  });
  await waitForFrontend(origin, child);
  browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: origin, serviceWorkers: "block" });
  context.setDefaultTimeout(10_000);
  context.setDefaultNavigationTimeout(15_000);
  const browserApiRequests = [];
  const externalRequests = [];
  const errors = [];
  context.on("request", request => {
    const url = new URL(request.url());
    if (url.origin !== origin) externalRequests.push(url.origin);
    if (url.pathname.startsWith("/api/")) browserApiRequests.push(url.pathname);
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.origin !== origin || url.pathname.startsWith("/api/")
      ? route.abort("blockedbyclient") : route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.name));
  await verifyLocalSession(page);
  await visitPages(page);
  await verifyApiBoundary(context, origin);
  assert.equal((await context.cookies()).find(cookie => cookie.name === cookieName), undefined,
    "Preview must not create a live session cookie.");

  const sealed = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify({
    sessionToken: "A".repeat(43), absoluteExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }))).setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "ciscoku-backend-session" })
    .encrypt(createHash("sha256").update(sessionSecret).digest());
  await context.addCookies([{ name: cookieName, value: sealed, url: origin, httpOnly: true, sameSite: "Lax" }]);
  await visitPages(page);
  await verifyApiBoundary(context, origin);
  assert.equal((await context.cookies()).find(cookie => cookie.name === cookieName)?.value, sealed,
    "Preview must preserve an existing valid sealed live cookie without processing it.");
  assert.ok(!(await page.evaluate(() => document.cookie)).includes(cookieName));
  await context.close();
  await browser.close();
  browser = undefined;
  await stopFrontend(child);
  child = undefined;
  assert.deepEqual(upstreamRequests, [], "Preview made an upstream request.");
  assert.deepEqual(browserApiRequests, [], "Preview made a browser API request.");
  assert.deepEqual(externalRequests, [], "Preview attempted an external browser request.");
  assert.deepEqual(errors, [], "Preview reported a browser error.");
  process.stdout.write(`Preview isolation passed: ${pages.length * 2} page visits, ${endpoints.length * 2} API 404s, both operator 404s, local session flow, no live-cookie creation or mutation, and zero upstream/browser API/external requests.\n`);
} catch (error) {
  if (output) process.stderr.write(`Next.js test server output:\n${output}\n`);
  throw error;
} finally {
  try { await browser?.close(); }
  finally {
    try { await stopFrontend(child); }
    finally { await closeServer(upstream); }
  }
}

async function verifyLocalSession(page) {
  await page.goto("/login?next=%2Flabs%2Fcookie-monster%2Fsession");
  assert.equal(await page.locator('input[type="password"], input[type="email"]').count(), 0);
  await page.getByLabel("Username", { exact: true }).fill("isolated_preview");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await page.getByTestId("demo-status").filter({ hasText: /^running$/ }).waitFor();
  await page.getByRole("button", { name: "Extend 30 minutes", exact: true }).click();
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "first completion" }).waitFor();
  await page.getByRole("button", { name: "Replay demo", exact: true }).click();
  await page.getByTestId("demo-status").filter({ hasText: /^running$/ }).waitFor();
  await page.getByRole("button", { name: "Stop demo", exact: true }).click();
  await page.getByTestId("demo-status").filter({ hasText: /^stopped$/ }).waitFor();
}

async function visitPages(page) {
  for (const path of pages) {
    const response = await page.goto(path);
    assert.equal(response?.status(), 200, `Preview page must load: ${path}`);
    await page.getByRole("main").waitFor();
    if (path === "/labs") assert.equal(await page.getByTestId("lab-card").count(), 12);
  }
}

async function verifyApiBoundary(context, origin) {
  for (const [method, path] of endpoints) {
    const response = await context.request.fetch(`${path}?FRONTEND_MODE=live`, {
      method, headers: { Origin: origin },
      ...(method === "GET" ? {} : { data: { FRONTEND_MODE: "live", unexpected: true } }),
    });
    assert.equal(response.status(), 404, `Preview API must return 404: ${method} ${path}`);
    assert.equal(response.headers()["cache-control"], "no-store");
    assert.equal(response.headers()["set-cookie"], undefined);
    assert.deepEqual(await response.json(), { code: "NOT_FOUND" });
  }
  const operator = await context.request.get("/instances?FRONTEND_MODE=live");
  assert.equal(operator.status(), 404, "Preview operator route must return HTTP 404 even with live UI enabled.");
  assert.equal(operator.headers()["set-cookie"], undefined);
}

function startFrontend(port, environment) {
  const processChild = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: resolve("."), env: { ...process.env, NODE_ENV: "production", ...environment },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  const capture = chunk => { output = `${output}${chunk}`.slice(-8_000); };
  processChild.stdout.on("data", capture);
  processChild.stderr.on("data", capture);
  return processChild;
}

async function waitForFrontend(origin, processChild) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (processChild.exitCode !== null) throw new Error(`Next.js test server exited with code ${processChild.exitCode}.`);
    try {
      if ((await fetch(origin, { signal: AbortSignal.timeout(1_000), redirect: "error" })).ok) return;
    } catch { /* The local server is still starting. */ }
    await delay(100);
  }
  throw new Error("Next.js test server did not become ready within 20 seconds.");
}

async function availablePort() {
  const server = createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
}

function listen(server) {
  return new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate a loopback test port."));
      resolvePort(address.port);
    });
  });
}

async function stopFrontend(processChild) {
  if (!processChild || processChild.exitCode !== null || processChild.signalCode !== null) return;
  processChild.kill(process.platform === "win32" ? "SIGKILL" : "SIGTERM");
  if (await waitForExit(processChild, 2_000)) return;
  processChild.kill("SIGKILL");
  if (!(await waitForExit(processChild, 2_000))) throw new Error(`Could not stop Next.js test server process ${processChild.pid}.`);
}

function waitForExit(processChild, timeout) {
  if (processChild.exitCode !== null || processChild.signalCode !== null) return Promise.resolve(true);
  return Promise.race([once(processChild, "exit").then(() => true), delay(timeout).then(() => false)]);
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolveClose, reject) => {
    server.close(error => error ? reject(error) : resolveClose());
    server.closeAllConnections?.();
  });
}

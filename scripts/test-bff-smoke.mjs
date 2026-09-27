import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createBackendFixture } from "../tests/fixtures/backend.mjs";

const bffAuthSecret = "test-only-bff-authentication-secret-value";
const bffSessionSecret = "test-only-frontend-session-secret-value";
const serviceTokenSecret = "test-only-service-token-secret-value";
const serviceTokenIssuer = "ciscoku-frontend-test";
const serviceTokenAudience = "ciscoku-backend-test";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const instanceId = "7850ac98-88b2-4d2f-953d-3f2d5b204205";
const submittedFlag = "CTF{black_box_bff_test}";

const fixture = createBackendFixture({
  bffAuthSecret,
  serviceTokenSecret,
  serviceTokenIssuer,
  serviceTokenAudience,
});
let frontendProcess;
let frontendOutput = "";

try {
  const backendPort = await listenOnAvailablePort(fixture.server);
  const frontendPort = await availablePort();
  const backendOrigin = `http://127.0.0.1:${backendPort}`;
  const frontendOrigin = `http://127.0.0.1:${frontendPort}`;

  frontendProcess = startFrontend(frontendPort, {
    BACKEND_URL: backendOrigin,
    BFF_PUBLIC_ORIGIN: frontendOrigin,
    BFF_AUTH_SECRET: bffAuthSecret,
    BFF_SESSION_SECRET: bffSessionSecret,
    BACKEND_SERVICE_TOKEN_SECRET: serviceTokenSecret,
    SERVICE_TOKEN_ISSUER: serviceTokenIssuer,
    SERVICE_TOKEN_AUDIENCE: serviceTokenAudience,
  });
  await waitForFrontend(frontendOrigin, frontendProcess);
  await verifyBff(frontendOrigin);
  process.stdout.write("BFF smoke test passed through the built frontend and loopback backend.\n");
} catch (error) {
  if (frontendOutput) process.stderr.write(`Next.js test server output:\n${frontendOutput}\n`);
  throw error;
} finally {
  await stopFrontend(frontendProcess);
  await closeServer(fixture.server);
}

async function verifyBff(frontendOrigin) {
  const request = (path, options) =>
    fetch(new URL(path, frontendOrigin), {
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      ...options,
    });

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, undefined, true),
    body: JSON.stringify({
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    }),
  });
  const loginBody = await expectJson(login, 200);
  assert.deepEqual(loginBody, {
    authenticated: true,
    user: { displayName: "Loopback Learner", emailVerified: true },
  });
  assert.doesNotMatch(JSON.stringify(loginBody), /sessionToken|allowedScopes|userId/);

  const setCookie = login.headers.get("set-cookie");
  assert.ok(setCookie?.includes("ciscoku.backend-session="));
  assert.ok(setCookie.includes("HttpOnly"));
  assert.match(setCookie, /SameSite=Lax/i);
  assert.ok(!setCookie.includes("A".repeat(43)));
  const cookie = setCookie.split(";", 1)[0];

  const session = await request("/api/auth/session", {
    headers: { Cookie: cookie },
  });
  assert.deepEqual(await expectJson(session, 200), loginBody);

  const create = await request("/api/instances", {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, cookie, true, "create:smoke:0001"),
    body: JSON.stringify({ challengeId }),
  });
  const created = await expectJson(create, 202);
  assert.equal(created.instance.id, instanceId);
  assert.equal(created.instance.status, "pending");
  assert.ok(!("url" in created.instance));

  const poll = await request(`/api/instances/${instanceId}`, {
    headers: { Cookie: cookie },
  });
  const polled = await expectJson(poll, 200);
  assert.equal(polled.status, "pending");
  assert.ok(!("url" in polled));

  const extend = await request(`/api/instances/${instanceId}/extend`, {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, cookie, false, "extend:smoke:0001"),
  });
  await expectJson(extend, 202);

  const submission = await request("/api/submissions", {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, cookie, true),
    body: JSON.stringify({ challengeId, instanceId, flag: submittedFlag }),
  });
  const submissionBody = await expectJson(submission, 200);
  assert.deepEqual(submissionBody, {
    correct: true,
    points: 100,
    recorded: true,
    source: "database",
  });
  assert.ok(!JSON.stringify(submissionBody).includes(submittedFlag));

  const destroy = await request(`/api/instances/${instanceId}`, {
    method: "DELETE",
    headers: mutationHeaders(frontendOrigin, cookie, false, "destroy:smoke:0001"),
  });
  await expectJson(destroy, 202);

  const backendCount = fixture.requests().length;
  const identityBody = await request("/api/instances", {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, cookie, true, "create:smoke:0002"),
    body: JSON.stringify({ challengeId, userId: "not-allowed" }),
  });
  assert.deepEqual(await expectJson(identityBody, 400), { code: "INVALID_REQUEST" });

  const crossOrigin = await request("/api/instances", {
    method: "POST",
    headers: mutationHeaders("https://attacker.test", cookie, true, "create:smoke:0003"),
    body: JSON.stringify({ challengeId }),
  });
  assert.deepEqual(await expectJson(crossOrigin, 403), { code: "FORBIDDEN" });
  assert.equal(fixture.requests().length, backendCount);

  fixture.setScenario("error");
  const rateLimited = await request(`/api/instances/${instanceId}`, {
    headers: { Cookie: cookie },
  });
  assert.deepEqual(await expectJson(rateLimited, 429), { code: "RATE_LIMITED" });
  fixture.setScenario("healthy");

  const protectedRequests = fixture
    .requests()
    .filter(({ url }) => url.startsWith("/v1/instances") || url === "/v1/submissions");
  assert.equal(protectedRequests.length, 5);
  assert.ok(
    protectedRequests.every(({ headers }) => headers.authorization === "[redacted]"),
  );
  assert.ok(protectedRequests.every(({ body }) => !body.includes('"userId"')));
  assert.ok(!JSON.stringify(fixture.requests()).includes(submittedFlag));
  assert.equal(
    protectedRequests.find(({ url }) => url === "/v1/submissions")?.body,
    JSON.stringify({ challengeId, instanceId, flag: "[redacted]" }),
  );

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: mutationHeaders(frontendOrigin, cookie, false),
  });
  assert.equal(logout.status, 204);
  assert.equal(logout.headers.get("cache-control"), "no-store");
  assert.ok(logout.headers.get("set-cookie")?.includes("ciscoku.backend-session="));
}

function mutationHeaders(origin, cookie, hasJsonBody, idempotencyKey) {
  const headers = {
    Origin: origin,
    "Sec-Fetch-Site": origin.startsWith("http://127.0.0.1:")
      ? "same-origin"
      : "cross-site",
  };
  if (cookie) headers.Cookie = cookie;
  if (hasJsonBody) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return headers;
}

async function expectJson(response, expectedStatus) {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type")?.split(";", 1)[0], "application/json");
  return response.json();
}

function startFrontend(port, environment) {
  const child = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: resolve("."),
      env: { ...process.env, NODE_ENV: "production", ...environment },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const capture = (chunk) => {
    frontendOutput = `${frontendOutput}${chunk}`.slice(-8_000);
  };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  return child;
}

async function waitForFrontend(origin, child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js test server exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(100);
  }
  throw new Error("Next.js test server did not become ready within 20 seconds.");
}

async function availablePort() {
  const server = createServer();
  const port = await listenOnAvailablePort(server);
  await closeServer(server);
  return port;
}

function listenOnAvailablePort(server) {
  return new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate a loopback test port."));
        return;
      }
      resolvePort(address.port);
    });
  });
}

async function stopFrontend(child) {
  if (!child || child.exitCode !== null) return;

  child.kill(process.platform === "win32" ? "SIGKILL" : "SIGTERM");
  if (await waitForExit(child, 2_000)) return;

  child.kill("SIGKILL");
  if (!(await waitForExit(child, 2_000))) {
    throw new Error(`Could not stop Next.js test server process ${child.pid}.`);
  }
}

function waitForExit(child, timeout) {
  if (child.exitCode !== null) return Promise.resolve(true);
  return Promise.race([
    once(child, "exit").then(() => true),
    delay(timeout).then(() => false),
  ]);
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
    server.closeAllConnections?.();
  });
}

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "@playwright/test";

// Credentials enter only through the caller's ignored environment file.
// This verifier never logs credentials, session cookies, mail links, or flags.
const backendOrigin = process.env.BACKEND_URL ?? "http://127.0.0.1:4000";
const frontendOrigin = process.env.LIVE_FRONTEND_ORIGIN ?? "http://127.0.0.1:3200";
const email = process.env.LIVE_PLAYER_EMAIL ?? process.env.SEED_PLAYER_EMAIL ?? process.env.PHASE3_PLAYER_EMAIL;
const password = process.env.LIVE_PLAYER_PASSWORD ?? process.env.SEED_PLAYER_PASSWORD ?? process.env.PHASE3_PLAYER_PASSWORD;
assert.ok(email && password, "Configure a disposable LIVE_PLAYER_EMAIL/PASSWORD or seeded player in an ignored environment file.");
const readiness = await fetch(new URL("/readyz", backendOrigin), { signal: AbortSignal.timeout(5000) });
assert.equal(readiness.status, 200, "Backend PostgreSQL must be ready.");
const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", new URL(frontendOrigin).port], {
  env: { ...process.env, BACKEND_URL: backendOrigin, BFF_PUBLIC_ORIGIN: frontendOrigin,
    BFF_SESSION_SECRET: process.env.BFF_SESSION_SECRET ?? randomBytes(32).toString("base64url"), NODE_ENV: "production" },
  windowsHide: true, stdio: "ignore",
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Verification frontend exited during startup.");
    try { ready = (await fetch(new URL("/login", frontendOrigin), { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Starting. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "Verification frontend did not start.");
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.name));
  await page.goto(new URL("/login", frontendOrigin).href);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const loginResponse = page.waitForResponse(response => response.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  assert.equal((await loginResponse).status(), 200, "Live login must succeed.");
  await page.waitForURL(new URL("/labs", frontendOrigin).href);
  const session = await context.request.get(new URL("/api/auth/session", frontendOrigin).href);
  assert.equal((await session.json()).authenticated, true);
  const cookie = (await context.cookies()).find(value => value.name === "ciscoku.backend-session");
  assert.ok(cookie?.httpOnly);
  assert.equal(cookie.sameSite, "Lax");
  assert.ok(!(await page.evaluate(() => document.cookie)).includes("ciscoku.backend-session"));
  await page.reload();
  assert.equal((await (await context.request.get(new URL("/api/auth/session", frontendOrigin).href)).json()).authenticated, true);
  const logout = await context.request.post(new URL("/api/auth/logout", frontendOrigin).href, { headers: { Origin: frontendOrigin } });
  assert.equal(logout.status(), 204);
  assert.equal((await (await context.request.get(new URL("/api/auth/session", frontendOrigin).href)).json()).authenticated, false);
  assert.deepEqual(errors, []);
  process.stdout.write("Live backend authentication passed: login, HttpOnly cookie, refresh, and logout.\n");
} finally {
  await browser?.close();
  child.kill();
}

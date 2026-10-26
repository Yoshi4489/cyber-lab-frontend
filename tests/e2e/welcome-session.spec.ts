import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { backendFixtureAddress } from "../fixtures/backend-origin.mjs";

const fixtureOrigin = backendFixtureAddress().origin;
const activeKey = "ciscoku:active-instance:v1";
const challengeId = "88888888-8888-4888-8888-888888888888";
const instanceRoute = "**/api/instances/*";
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function login(page: Page, email = "learner@example.test") {
  await page.goto("/login?next=%2Flabs%2Fwelcome%2Fsession");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/welcome\/session$/);
  await expect(page.getByRole("button", { name: "Spawn Instance", exact: true })).toBeEnabled();
}
async function start(page: Page) {
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10_000 });
  const saved = await page.evaluate(key => localStorage.getItem(key), activeKey);
  return saved ? JSON.parse(saved) as { instanceId: string; challengeId: string } : null;
}
async function captures(page: Page, info: TestInfo, state: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.getByLabel("Color theme", { exact: true }).selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const target = page.getByTestId("lab-target");
    if (await target.count()) {
      const foreground = await page.locator("body").evaluate(node => getComputedStyle(node).color);
      await expect(target).toHaveCSS("color", foreground);
      await expect(target).toHaveCSS("-webkit-text-fill-color", foreground);
      await expect(target).toHaveCSS("opacity", "1");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`session-${state}-${theme}.png`), fullPage: true, animations: "disabled" });
  }
}

test.beforeEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/welcome`); });
test.afterEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/healthy`); });

test("Welcome reveals only a ready page, restores its absolute expiry, extends, and stops", async ({ page }, info) => {
  const laterCalls: string[] = [];
  page.on("request", request => { if (/\/api\/(submissions|profile|leaderboard)/.test(request.url())) laterCalls.push(request.url()); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const preparing = deferred(), ready = deferred(), firstRead = deferred(), secondRead = deferred();
  let reads = 0;
  await page.route(instanceRoute, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    if (++reads === 1) { firstRead.resolve(); await preparing.promise; }
    else if (reads === 2) { secondRead.resolve(); await ready.promise; }
    await route.fulfill({ response });
  });
  const createdResponse = page.waitForResponse(response => response.url().endsWith("/api/instances") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).focus();
  await expect(page.getByRole("button", { name: "Spawn Instance", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  const created = (await (await createdResponse).json()).instance;
  await firstRead.promise;
  await expect(page.getByTestId("lab-status")).toHaveText("pending");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Extend 30 minutes" })).toBeDisabled();
  await captures(page, info, "pending");
  preparing.resolve(); await secondRead.promise;
  await expect(page.getByTestId("lab-status")).toHaveText("provisioning");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await captures(page, info, "provisioning");
  ready.resolve();
  await expect(page.getByTestId("lab-status")).toHaveText("running");
  await expect(page.getByRole("link", { name: "Open Welcome page" })).toHaveAttribute("href", `https://welcome.example.test/labs/${created.id}/`);
  await expect(page.getByTestId("lab-target")).toHaveAttribute("rel", "noopener noreferrer");
  await captures(page, info, "running");
  await page.getByTestId("lab-target").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Extend 30 minutes" })).toBeFocused();
  await page.unroute(instanceRoute);
  const restored = deferred(), restoreRead = deferred();
  let expiresAt = "";
  await page.route(instanceRoute, async route => {
    const response = await route.fetch();
    expiresAt = (await response.json()).expiresAt;
    restoreRead.resolve(); await restored.promise;
    await route.fulfill({ response });
  }, { times: 1 });
  await page.reload(); await restoreRead.promise;
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByText("Checking your lab session…")).toBeVisible();
  restored.resolve();
  await expect(page.getByTestId("lab-target")).toBeVisible();
  expect(expiresAt).toBe(created.expiresAt);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), activeKey)).toEqual({ instanceId: created.id, challengeId });
  const extended = page.waitForResponse(response => response.url().endsWith("/extend"));
  await page.getByRole("button", { name: "Extend 30 minutes" }).click();
  expect(Date.parse((await (await extended).json()).instance.expiresAt)).toBe(Date.parse(created.expiresAt) + 1_800_000);
  await page.getByRole("button", { name: "Stop Lab", exact: true }).click();
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByTestId("lab-status")).toHaveText("stopped");
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  await expect(page.getByLabel("Recovered flag", { exact: true })).toHaveCount(0);
  expect(laterCalls).toEqual([]);
});

test("Welcome explains asynchronous capacity failure without a target link", async ({ page, request }, info) => {
  await request.post(`${fixtureOrigin}/scenario/welcome-capacity`);
  await login(page);
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("failed");
  await expect(page.getByText("There is no free space for this instance right now. Try again later.")).toBeVisible();
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Spawn Instance", exact: true })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  await captures(page, info, "failed");
});

test("storage denial retains same-tab ownership and the idempotency key after a lost acceptance", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Storage denied"); };
    Storage.prototype.setItem = () => { throw new Error("Storage denied"); };
  });
  await login(page);
  const keys: string[] = [];
  await page.route("**/api/instances", async route => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    const response = await route.fetch();
    if (keys.length === 1) await route.abort("failed");
    else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByText("The server could not be reached. Check your connection and retry.")).toBeVisible();
  await page.getByRole("button", { name: "Retry instance status" }).click();
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10_000 });
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  await expect(page.getByText("This browser cannot remember the instance after leaving this page. Keep this session open.")).toBeVisible();
  await page.route(instanceRoute, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "INTERNAL_ERROR" }) }), { times: 1 });
  await page.clock.fastForward(15_001);
  await expect(page.getByText("The server could not complete the request.")).toBeVisible();
  await page.getByRole("button", { name: "Retry instance status" }).click();
  await expect(page.getByTestId("lab-target")).toBeVisible();
  await expect(page.getByTestId("lab-status")).toHaveText("running");
});

test("rate limits require a deliberate retry after cooldown and reuse the create key", async ({ page }) => {
  await page.clock.install(); await login(page);
  const keys: string[] = [];
  await page.route("**/api/instances", async route => {
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    if (keys.length === 1) await route.fulfill({ status: 429, headers: { "Retry-After": "2" }, contentType: "application/json", body: JSON.stringify({ code: "RATE_LIMITED" }) });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry instance status" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Spawn Instance", exact: true })).toBeDisabled();
  await page.clock.fastForward(3_000);
  await expect(page.getByRole("button", { name: "Retry instance status" })).toBeEnabled();
  expect(keys).toHaveLength(1);
  await page.getByRole("button", { name: "Retry instance status" }).click();
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("pending");
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
});

test("a create response from before sign-out cannot attach to another learner", async ({ page, isMobile }) => {
  await login(page);
  const accepted = deferred(), release = deferred();
  let oldId = "";
  await page.route("**/api/instances", async route => {
    const response = await route.fetch(); oldId = (await response.json()).instance.id;
    accepted.resolve(); await release.promise;
    await route.fulfill({ response }).catch(() => {});
  }, { times: 1 });
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await accepted.promise;
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await login(page, "learner-b@example.test"); release.resolve();
  await expect(page.getByTestId("lab-status")).toHaveText("Not started");
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  const current = await start(page);
  expect(current?.instanceId).not.toBe(oldId);
});

test("an old owner restoration cannot cross an authenticated-to-authenticated account change", async ({ page }) => {
  await login(page); const old = await start(page);
  const arrived = deferred(), release = deferred();
  await page.route(instanceRoute, async route => {
    const response = await route.fetch(); arrived.resolve(); await release.promise;
    await route.fulfill({ response }).catch(() => {});
  }, { times: 1 });
  await page.reload(); await arrived.promise;
  await login(page, "learner-b@example.test"); release.resolve();
  await expect(page.getByTestId("lab-status")).toHaveText("Not started");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  expect((await start(page))?.instanceId).not.toBe(old?.instanceId);
});

test("restoration rejects mismatched owner-read payloads and expired links disappear locally", async ({ page }) => {
  await page.clock.install();
  await login(page); const owned = await start(page);
  await page.route(instanceRoute, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), id: "99999999-9999-4999-8999-999999999999" } });
  }, { times: 1 });
  await page.reload();
  await expect(page.getByText("The server returned an unexpected response. Please retry.")).toBeVisible();
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry instance status" }).click();
  await expect(page.getByTestId("lab-target")).toHaveAttribute("href", `https://welcome.example.test/labs/${owned?.instanceId}/`);
  await page.clock.fastForward(3_601_000);
  await expect(page.getByText("Time is up. Waiting for the server to confirm expiry.")).toBeVisible();
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Extend 30 minutes" })).toBeDisabled();
});

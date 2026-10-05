import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const origin = "http://127.0.0.1:3100";
const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
async function signIn(context: BrowserContext) {
  const response = await context.request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: { email: "learner@example.test", password: "correct-horse-battery-staple" },
  });
  expect(response.status()).toBe(200);
}
async function start(page: Page) {
  await page.goto("/labs/intro-web/session");
  await page.getByRole("button", { name: "Start Lab", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("pending");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10000 });
}

test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4101/scenario/lifecycle");
});
test.afterEach(async ({ request }) => {
  await request.post("http://127.0.0.1:4101/scenario/healthy");
});

test("guest login returns to the lab; start, poll, extend and stop use the BFF", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const mutations: { method: string; key?: string; body: string | null }[] = [];
  page.on("request", request => {
    if (request.url().includes("/api/instances") && request.method() !== "GET") {
      mutations.push({ method: request.method(), key: request.headers()["idempotency-key"], body: request.postData() });
    }
  });
  await page.goto("/labs/intro-web");
  await page.getByRole("link", { name: "Start Lab", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/intro-web\/session$/);
  await page.getByRole("button", { name: "Start Lab", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("pending");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10000 });
  await expect(page.getByTestId("lab-target")).toHaveAttribute("href", "https://lab.example.test");
  const extended = page.waitForResponse(response => response.url().endsWith("/extend"));
  await page.getByRole("button", { name: "Extend 30 minutes" }).click();
  const extension = await (await extended).json();
  expect(Date.parse(extension.instance.expiresAt) - Date.parse(extension.instance.createdAt)).toBe(5400000);
  await page.getByRole("button", { name: "Stop Lab" }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("stopping");
  await expect(page.getByTestId("lab-target")).toHaveCount(0);
  await expect(page.getByTestId("lab-status")).toHaveText("stopped", { timeout: 10000 });
  expect(await page.evaluate(() => localStorage.getItem("ciscoku:active-instance:v1"))).toBeNull();
  expect(mutations.map(value => value.method)).toEqual(["POST", "POST", "DELETE"]);
  for (const mutation of mutations) {
    expect(mutation.key).toMatch(/^(create|extend|destroy):[A-Za-z0-9._:-]+$/);
    expect(mutation.body ?? "").not.toContain("userId");
  }
  expect(JSON.parse(mutations[0]!.body!)).toEqual({ challengeId });
  expect(mutations[1]!.body).toBeNull();
  expect(mutations[2]!.body).toBeNull();
  expect(new Set(mutations.map(value => value.key)).size).toBe(3);
  expect(errors).toEqual([]);
});

test("reload revalidates the remembered ID; unmount cleans polling", async ({ page, context }) => {
  await signIn(context);
  await start(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ciscoku:active-instance:v1")!));
  expect(Object.keys(saved).sort()).toEqual(["challengeId", "instanceId"]);
  await page.reload();
  await expect(page.getByTestId("lab-status")).toHaveText("running");
  await page.goto("/labs");
  let polls = 0;
  page.on("request", request => { if (request.method() === "GET" && request.url().includes("/api/instances/")) polls++; });
  await page.clock.install();
  await page.clock.fastForward(20000);
  expect(polls).toBe(0);
});

test("storage denial leaves a live session usable with a visible warning", async ({ page, context }) => {
  await signIn(context);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked"); };
  });
  await start(page);
  await expect(page.getByText(/cannot remember the instance/)).toBeVisible();
  await page.getByRole("button", { name: "Stop Lab" }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("stopped", { timeout: 10000 });
});

test("a lost create response retries the same idempotency key", async ({ page, context }) => {
  await signIn(context);
  let calls = 0;
  const keys: string[] = [];
  await page.route("**/api/instances", async route => {
    keys.push(route.request().headers()["idempotency-key"]!);
    calls++;
    if (calls === 1) { await route.fetch(); await route.abort(); }
    else await route.continue();
  });
  await page.goto("/labs/intro-web/session");
  await page.getByRole("button", { name: "Start Lab", exact: true }).click();
  await expect(page.getByRole("region", { name: "Lab session" }).getByRole("alert")).toContainText("UNREACHABLE");
  await page.getByRole("button", { name: "Retry instance status" }).click();
  await page.getByRole("button", { name: "Start Lab", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10000 });
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
});

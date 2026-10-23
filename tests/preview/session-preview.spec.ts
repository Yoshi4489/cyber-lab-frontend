import { expect, test, type Page } from "@playwright/test";

const key = "ciscoku:learner:v1";
async function enter(page: Page, name = "session_owl") {
  await page.goto("/login?next=%2Flabs%2Fcookie-monster%2Fsession");
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
}
async function start(page: Page) {
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("pending");
  await expect(page.getByTestId("demo-status")).toHaveText("running");
}
async function holdAdmission(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>(started => {
      void navigator.locks.request("ciscoku:preview-session", () => {
        started();
        return new Promise<void>(release => { (window as Window & { releasePreviewLock?: () => void }).releasePreviewLock = release; });
      });
    });
  });
}
async function releaseAdmission(page: Page) {
  await page.evaluate(() => (window as Window & { releasePreviewLock?: () => void }).releasePreviewLock?.());
}

test("start, extend, refresh, finish and replay keep one illustrative reward", async ({ page }, testInfo) => {
  const apiCalls: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  await page.route("**/api/**", route => route.abort());
  await enter(page);
  await start(page);
  const original = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).activeSession.instance, key);
  await page.getByRole("button", { name: "Extend 30 minutes", exact: true }).click();
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).activeSession.instance.expiresAt, key)).toBe(new Date(Date.parse(original.expiresAt) + 1_800_000).toISOString());
  await page.reload();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Extend 30 minutes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Extend 30 minutes", exact: true })).toBeDisabled();
  await expect(page.getByRole("timer")).toContainText("1:");
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: testInfo.outputPath("demo-running-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("stopped");
  await expect(page.getByRole("status").filter({ hasText: "first completion" })).toContainText("+100");
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await expect(page.getByRole("button", { name: "Replay demo", exact: true })).toBeEnabled();
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: testInfo.outputPath("demo-complete-dark.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("button", { name: "Replay demo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "already earned for this lab" })).toContainText("+0");
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(Object.keys(saved.completions)).toEqual(["cookie-monster"]);
  expect(saved.activeSession).toBeNull();
  expect(apiCalls).toEqual([]);
});

test("one active demo spans labs; stop and saved expiry release it", async ({ page }) => {
  await enter(page);
  await start(page);
  await page.goto("/labs/cipher-zero/session");
  await expect(page.getByRole("heading", { name: "One discovery at a time." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to active demo" })).toHaveAttribute("href", "/labs/cookie-monster/session");
  await expect(page.getByRole("button", { name: "Start demo", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Stop demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("stopping");
  await expect(page.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
  await start(page);
  const expiry = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).activeSession.instance.expiresAt, key);
  await page.clock.install();
  await page.clock.setSystemTime(new Date(Date.parse(expiry) + 1000));
  await page.reload();
  await expect(page.getByTestId("demo-status")).toHaveText("expired");
  await expect(page.getByRole("button", { name: "Finish demo", exact: true })).toHaveCount(0);
  expect((await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).activeSession).toBeNull();
  await expect(page.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
});

test("migration drops legacy sessions while signout and reset preserve bookmarks and theme", async ({ page, isMobile }) => {
  await page.goto("/labs");
  await page.getByRole("button", { name: "Save Cookie Monster", exact: true }).click();
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({
    version: 1, username: "legacy_owl", signedIn: true, completions: { "cookie-monster": Date.now(), unknown: Date.now() },
    sessions: { "cookie-monster": { startedAt: Date.now(), expiresAt: Date.now() + 99_999_999 } },
  })), key);
  await page.goto("/labs/cookie-monster/session");
  await expect(page.getByTestId("demo-status")).toHaveText("Not started");
  await page.getByRole("button", { name: "Replay demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const signedOut = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(signedOut.version).toBe(2);
  expect(signedOut.signedIn).toBe(false);
  expect(signedOut.activeSession).toBeNull();
  expect(Object.keys(signedOut.completions)).toEqual(["cookie-monster"]);
  expect(signedOut.commands).toEqual({});
  await page.goto("/guide");
  await page.getByRole("button", { name: "Reset demo progress" }).click();
  await page.getByRole("button", { name: "Yes, reset demo" }).click();
  await page.goto("/saved");
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue("dark");
  expect((await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)).completions).toEqual({});
});

test("concurrent browser tabs serialize starts and follow identity changes", async ({ page, context }) => {
  await enter(page);
  const second = await context.newPage();
  await second.goto("/labs/cipher-zero/session");
  await expect(second.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
  // Hold admission until both actual click handlers have queued their command;
  // otherwise the first tab's storage event can remove the other start button
  // before its click is dispatched, which tests navigation rather than a race.
  await holdAdmission(page);
  await Promise.all([
    page.getByRole("button", { name: "Start demo", exact: true }).click(),
    second.getByRole("button", { name: "Start demo", exact: true }).click(),
  ]);
  await releaseAdmission(page);
  await expect.poll(async () => page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).commands).length, key)).toBe(1);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(state.activeSession).not.toBeNull();
  expect(Object.values(state.commands).filter((command: unknown) => (command as { fingerprint: string }).fingerprint.includes("challengeId"))).toHaveLength(1);
  await second.goto("/signup");
  await second.getByLabel("Username", { exact: true }).fill("different_owl");
  await second.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("Not started");
  const changed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(changed.username).toBe("different_owl");
  expect(changed.activeSession).toBeNull();
  expect(changed.commands).toEqual({});
  expect(changed.completions).toEqual({});
});

test("queued commands are cancelled after another tab signs out and back in", async ({ page, context, isMobile }) => {
  const second = await context.newPage();
  for (const nextName of ["different_owl", "queued_owl"]) {
    await enter(page, "queued_owl");
    const epoch = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).identityEpoch, key);
    await second.goto("/labs/cookie-monster/session");
    await expect(second.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
    await holdAdmission(page);
    await page.getByRole("button", { name: "Start demo", exact: true }).click();
    if (isMobile) await second.getByRole("button", { name: "Open navigation" }).click();
    await second.getByRole("button", { name: "Sign out", exact: true }).click();
    await second.goto("/login");
    await second.getByLabel("Username", { exact: true }).fill(nextName);
    await second.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(second).toHaveURL(/\/dashboard$/);
    await releaseAdmission(page);
    await expect(page.getByRole("alert").filter({ hasText: "Your demo sign-in changed" })).toBeVisible();
    const current = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
    expect(current.username).toBe(nextName);
    expect(current.identityEpoch).not.toBe(epoch);
    expect(current.activeSession).toBeNull();
    expect(current.commands).toEqual({});
  }
});

test("storage denial preserves simulated completion within the current tab", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage blocked"); }; });
  await enter(page, "temporary_session");
  await start(page);
  await expect(page.getByText(/Your browser could not save changes/)).toBeVisible();
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "first completion" })).toContainText("+100");
  await page.getByRole("button", { name: "Replay demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "already earned for this lab" })).toContainText("+0");
});

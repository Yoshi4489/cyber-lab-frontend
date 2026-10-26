import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { backendFixtureAddress } from "../fixtures/backend-origin.mjs";

const fixtureOrigin = backendFixtureAddress().origin;
async function login(page: Page, email = "learner@example.test") {
  await page.goto("/login?next=%2Fdashboard");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function capture(page: Page, info: TestInfo, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).click();
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}
test.beforeEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/welcome`); });
test.afterEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/healthy`); });

test("Welcome account and catalog journey is harmless and leads to its live session", async ({ page, isMobile }, info) => {
  const laterCalls: string[] = [];
  page.on("request", request => { if (/\/api\/(submissions|profile|leaderboard)/.test(request.url())) laterCalls.push(request.url()); });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/signup?next=%2Fdashboard");
  await expect(page.getByText("Public registration is currently closed.")).toBeVisible();
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("ordinary-wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Email or password was not recognized");
  expect((await page.context().cookies()).find(cookie => cookie.name === "ciscoku.backend-session")).toBeUndefined();
  expect(await (await page.request.get("/api/auth/session")).json()).toEqual({ authenticated: false });
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Loopback Learner");
  await page.getByLabel("Color theme", { exact: true }).selectOption("light");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Loopback Learner");
  await page.getByRole("link", { name: "Welcome", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome.");
  await expect(page.getByRole("region", { name: "Welcome introduction" })).toContainText("no puzzle to solve, hidden step, or vulnerability");
  await expect(page.getByRole("link", { name: "Spawn Instance", exact: true })).toHaveAttribute("href", "/labs/welcome/session");
  await capture(page, info, "welcome-light");
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await capture(page, info, "welcome-dark");
  await page.goto("/labs/welcome/session");
  await expect(page).toHaveURL(/\/labs\/welcome\/session$/);
  await expect(page.getByRole("button", { name: "Spawn Instance", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Recovered flag", { exact: true })).toHaveCount(0);
  await page.goto("/guide");
  await page.getByLabel("Color theme", { exact: true }).selectOption("light");
  await expect(page.getByRole("button", { name: "Reset demo progress" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your curiosity.");
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue("light");
  expect((await (await page.request.get("/api/auth/session")).json()).authenticated).toBe(false);
  expect(laterCalls).toEqual([]);
});

test("two learner sessions restore distinct real identities and logout does not affect the other", async ({ page, browser, isMobile }) => {
  const secondContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100", viewport: page.viewportSize() ?? undefined, isMobile, hasTouch: isMobile });
  try {
    const second = await secondContext.newPage();
    await login(page);
    await login(second, "learner-b@example.test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Loopback Learner");
    await expect(second.getByRole("heading", { level: 1 })).toContainText("Second Learner");
    const longName = "L".repeat(64);
    await second.route("**/api/auth/session", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ authenticated: true, user: { displayName: longName, emailVerified: true } }) }));
    await second.reload();
    await expect(second.getByRole("heading", { level: 1 })).toContainText(longName);
    expect(await second.getByRole("heading", { level: 1 }).evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await second.unroute("**/api/auth/session");
    await page.reload(); await second.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Loopback Learner");
    await expect(second.getByRole("heading", { level: 1 })).toContainText("Second Learner");
    expect(await second.evaluate(() => document.cookie)).not.toContain("ciscoku.backend-session");
    expect((await secondContext.cookies()).find(cookie => cookie.name === "ciscoku.backend-session")?.httpOnly).toBe(true);
    expect((await page.request.post("/api/auth/logout", { headers: { Origin: "http://127.0.0.1:3100" } })).status()).toBe(204);
    await page.reload(); await second.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your curiosity.");
    await expect(second.getByRole("heading", { level: 1 })).toContainText("Second Learner");
  } finally { await secondContext.close(); }
});

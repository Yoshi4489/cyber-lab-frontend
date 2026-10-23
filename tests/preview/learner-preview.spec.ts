import { expect, test } from "@playwright/test";
import { CompactEncrypt } from "jose";
import { createHash } from "node:crypto";

test("sample catalog filters, saves, and presents editorial briefings", async ({ page }, testInfo) => {
  await page.goto("/labs");
  await expect(page.getByTestId("lab-card")).toHaveCount(12);
  await expect(page.getByText("Demo catalog · sample content and illustrative XP. No targets or real scores.")).toBeVisible();
  await page.getByRole("button", { name: "Web security", exact: true }).click();
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Easy");
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await expect(page.getByTestId("lab-card")).toContainText("Cookie Monster");
  await page.getByRole("textbox", { name: "Search labs" }).fill("not-a-lab");
  await expect(page.getByRole("heading", { name: "No labs found" })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByLabel("Sort labs").selectOption("points");
  await expect(page.getByTestId("lab-card").first()).toContainText("Access Denied");
  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.getByTestId("lab-grid")).toHaveAttribute("data-layout", "list");
  await page.getByRole("button", { name: "Save Cookie Monster", exact: true }).click();
  await page.goto("/saved");
  await page.reload();
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Cookie Monster", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cookie Monster." })).toBeVisible();
  await expect(page.getByText("DEMO LAB · SAMPLE CONTENT", { exact: true })).toBeVisible();
  await expect(page.getByText("100 demo XP", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview session", exact: true })).toHaveAttribute("href", "/login?next=%2Flabs%2Fcookie-monster%2Fsession");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("preview-briefing.png"), fullPage: true });
});

test("username-only entry returns to the session preview and local navigation signs out", async ({ page, isMobile }) => {
  await page.goto("/login?next=%2Flabs%2Fcookie-monster%2Fsession");
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByLabel("Username", { exact: true }).fill("bad name");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#username-error")).toContainText("Use 2–24");
  await page.getByLabel("Username", { exact: true }).fill("preview_owl");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/cookie-monster\/session$/);
  await expect(page.getByRole("region", { name: "Demo session" })).toContainText("There is no real challenge to attack in this preview.");
  await page.reload();
  await expect(page.getByRole("button", { name: "Start demo", exact: true })).toBeVisible();
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByText("Demo learner · this browser", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your curiosity.");
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue("dark");
  expect((await page.context().cookies()).find(cookie => cookie.name === "ciscoku.backend-session")).toBeUndefined();
});

test("both entry routes validate local return destinations and malformed storage", async ({ page }) => {
  for (const route of ["/login?next=https://attacker.test", "/signup?next=//attacker.test"]) {
    await page.goto(route);
    await page.evaluate(() => localStorage.setItem("ciscoku:learner:v1", '{"version":99}'));
    await page.reload();
    await page.getByLabel("Username", { exact: true }).fill("safe_owl");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/labs$/);
  }
  await page.goto("/signup?lab=cookie-monster");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/cookie-monster$/);
});

test("preview pages make no browser API calls and do not process old live cookies", async ({ page, context }) => {
  const key = createHash("sha256").update("test-only-frontend-session-secret-value").digest();
  const sealed = await new CompactEncrypt(new TextEncoder().encode(JSON.stringify({
    sessionToken: "A".repeat(43), absoluteExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  }))).setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "ciscoku-backend-session" }).encrypt(key);
  await context.addCookies([{ name: "ciscoku.backend-session", value: sealed, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => route.abort());
  for (const path of ["/", "/labs", "/labs/cookie-monster", "/labs/first-steps/session", "/saved", "/dashboard", "/leaderboard", "/profile", "/paths", "/guide", "/login", "/signup"]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  for (const path of ["/verify-email?token=old-secret", "/forgot-password", "/reset-password?token=old-secret"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "A username is all you need." })).toBeVisible();
    await expect(page.locator("input")).toHaveCount(0);
    await expect(page.getByText("old-secret")).toHaveCount(0);
  }
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
  expect((await context.cookies()).find(cookie => cookie.name === "ciscoku.backend-session")?.value).toBe(sealed);
});

test("direct API methods return no-store 404 even with live configuration and cookie", async ({ request }) => {
  const paths: [string, string][] = [
    ["GET", "/api/catalog"], ["GET", "/api/backend-status"], ["GET", "/api/auth/session"],
    ...["login", "logout", "verification/request", "verification/confirm", "password-reset/request", "password-reset/confirm"].map(path => ["POST", `/api/auth/${path}`] as [string, string]),
    ["POST", "/api/instances"], ["GET", "/api/instances/7850ac98-88b2-4d2f-953d-3f2d5b204205"],
    ["DELETE", "/api/instances/7850ac98-88b2-4d2f-953d-3f2d5b204205"],
    ["POST", "/api/instances/7850ac98-88b2-4d2f-953d-3f2d5b204205/extend"], ["POST", "/api/submissions"],
  ];
  for (const [method, path] of paths) {
    const response = await request.fetch(path + "?FRONTEND_MODE=live", { method, headers: { Cookie: "ciscoku.backend-session=old-live-session", Origin: "http://127.0.0.1:3100" } });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ code: "NOT_FOUND" });
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
  const operator = await request.get("/instances");
  expect(operator.status()).toBe(404);
});

test("storage denial keeps username entry usable in the current tab", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage blocked"); }; });
  await page.goto("/signup");
  await page.getByLabel("Username", { exact: true }).fill("temporary_owl");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hey, temporary_owl.");
  await expect(page.getByText(/Your browser could not save changes/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Cookie Monster", exact: true })).toBeVisible();
});

test("theme, reduced motion, keyboard focus and mobile navigation remain usable", async ({ page, isMobile }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(246, 248, 245)");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByLabel("Username", { exact: true }).focus();
  await expect(page.getByLabel("Username", { exact: true })).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("preview-entry-light.png"), fullPage: true });
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(18, 25, 20)");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.screenshot({ path: testInfo.outputPath("preview-entry-dark.png"), fullPage: true });
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  }
});

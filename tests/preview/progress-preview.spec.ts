import { expect, test, type Page } from "@playwright/test";
import { labs } from "../../src/features/catalog/data";

const key = "ciscoku:learner:v1";
async function enter(page: Page, name = "progress_owl", next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Username", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
}
async function seed(page: Page, completions: Record<string, unknown>, username = "progress_owl") {
  await page.goto("/profile");
  await page.evaluate(({ key, completions, username }) => localStorage.setItem(key, JSON.stringify({
    version: 2, identityEpoch: null, username, signedIn: true, completions,
    activeSession: null, lastSession: null, commands: {},
  })), { key, completions, username });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(username);
}
function metric(page: Page, name: string) {
  return page.getByRole("region", { name: "Demo learning progress" }).locator("div").filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.locator("strong") }).first().locator("strong");
}
async function expectOneCompletion(page: Page) {
  await expect(metric(page, "Demo XP earned")).toHaveText("100");
  await expect(metric(page, "Labs completed")).toHaveText("1");
  await expect(metric(page, "Badges unlocked")).toHaveText("1");
  await expect(page.getByRole("region", { name: "Completed demo labs" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Completed demo labs" })).toContainText("Cookie Monster");
  await expect(page.getByRole("region", { name: "Demo milestones" })).toContainText("Unlocked");
}

test("finish and replay agree across dashboard, Profile and fictional rankings without API calls", async ({ page }) => {
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => route.abort());
  await enter(page, "progress_owl", "/labs/cookie-monster/session");
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "first completion" })).toContainText("+100");
  await page.goto("/dashboard");
  await expectOneCompletion(page);
  await expect(page.getByText("Today's goal complete", { exact: true })).toBeVisible();
  await expect(page.getByTestId("lab-card")).toHaveCount(3);
  await expect(page.getByTestId("lab-card").filter({ hasText: "Cookie Monster" })).toHaveCount(0);
  await page.goto("/profile");
  await expectOneCompletion(page);
  await expect(page.getByText("Your demo profile · read only", { exact: true })).toBeVisible();
  await expect(page.locator("main input, main form")).toHaveCount(0);
  await page.getByRole("link", { name: "See the fictional rankings", exact: true }).click();
  const current = page.getByRole("row").filter({ has: page.getByText("You", { exact: true }) });
  await expect(current).toContainText("progress_owl");
  await expect(current.getByRole("cell").last()).toHaveText("100");
  await expect(current.getByRole("cell").nth(2)).toHaveText("1");
  await page.getByRole("link", { name: "See your demo profile", exact: true }).click();
  await page.getByRole("region", { name: "Completed demo labs" }).getByRole("link", { name: "Cookie Monster" }).click();
  await page.getByRole("link", { name: "Preview session", exact: true }).click();
  await page.getByRole("button", { name: "Replay demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "already earned for this lab" })).toContainText("+0");
  await page.goto("/profile");
  await expectOneCompletion(page);
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test("sign-out hides local identity, same username restores progress and a new username starts fresh", async ({ page, isMobile }) => {
  await seed(page, { "cookie-monster": Date.now() });
  await expectOneCompletion(page);
  if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your demo profile starts here." })).toBeVisible();
  await expect(page.getByRole("region", { name: "Demo learning progress" })).toHaveCount(0);
  await page.goto("/leaderboard");
  await expect(page.getByText("You", { exact: true })).toHaveCount(0);
  await enter(page, "progress_owl", "/profile");
  await expectOneCompletion(page);
  await enter(page, "fresh_owl", "/profile");
  await expect(metric(page, "Demo XP earned")).toHaveText("0");
  await expect(page.getByText("No demo labs completed yet.", { exact: false })).toBeVisible();
});

test("reset clears every progress view while preserving saved labs and theme", async ({ page }) => {
  await seed(page, { "cookie-monster": Date.now() });
  await page.goto("/labs");
  await page.getByRole("button", { name: "Save Cookie Monster", exact: true }).click();
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await page.goto("/guide");
  await page.getByRole("button", { name: "Reset demo progress", exact: true }).click();
  await page.getByRole("button", { name: "Yes, reset demo", exact: true }).click();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your demo profile starts here." })).toBeVisible();
  await enter(page, "progress_owl", "/profile");
  await expect(metric(page, "Demo XP earned")).toHaveText("0");
  await expect(metric(page, "Badges unlocked")).toHaveText("0");
  await page.goto("/dashboard");
  await expect(metric(page, "Labs completed")).toHaveText("0");
  await expect(page.getByText("Your first step awaits", { exact: true })).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByRole("row").filter({ has: page.getByText("You", { exact: true }) }).getByRole("cell").last()).toHaveText("0");
  await page.goto("/saved");
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue("dark");
});

test("unknown and malformed completions are ignored; a fictional namesake stays separate", async ({ page }) => {
  await seed(page, { "cookie-monster": Date.now(), "first-steps": "bad", "cipher-zero": -1, unknown: Date.now() }, "hello_otter");
  await expectOneCompletion(page);
  await page.goto("/leaderboard");
  const namesakes = page.getByRole("row").filter({ has: page.getByRole("rowheader").filter({ hasText: "hello_otter" }) });
  await expect(namesakes).toHaveCount(2);
  for (const row of await namesakes.all()) {
    await expect(row.getByRole("cell").first()).toHaveText("#7");
    await expect(row.getByRole("cell").last()).toHaveText("100");
  }
  await expect(page.getByText("You", { exact: true })).toHaveCount(1);
});

test("storage denial keeps Profile, dashboard and rankings consistent during client navigation", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Storage blocked"); }; });
  await enter(page, "temporary_progress", "/labs/cookie-monster/session");
  await page.getByRole("button", { name: "Start demo", exact: true }).click();
  await expect(page.getByTestId("demo-status")).toHaveText("running");
  await page.getByRole("button", { name: "Finish demo", exact: true }).click();
  await page.getByRole("link", { name: "View your dashboard" }).click();
  await expectOneCompletion(page);
  // Client-side links retain the documented in-memory fallback when storage is denied.
  await page.getByRole("link", { name: "See your demo profile", exact: true }).click();
  await expectOneCompletion(page);
  await expect(page.getByText(/Your browser could not save changes/)).toBeVisible();
  await page.getByRole("link", { name: "See the fictional rankings", exact: true }).click();
  await expect(page.getByRole("row").filter({ has: page.getByText("You", { exact: true }) }).getByRole("cell").last()).toHaveText("100");
  await page.getByRole("link", { name: "See your demo profile", exact: true }).click();
  await page.getByRole("link", { name: "Go to dashboard", exact: true }).click();
  await expectOneCompletion(page);
  await expect(page.getByText(/Your browser could not save changes/)).toBeVisible();
});

test("progress screens fit each viewport and theme with keyboard access and reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await seed(page, Object.fromEntries(labs.slice(0, 6).map((lab, index) => [lab.slug, Date.now() - index * 86_400_000])), "long_curiosity_owl_12345");
  for (const theme of ["light", "dark"]) {
    await page.getByLabel("Color theme", { exact: true }).selectOption(theme);
    for (const path of ["/profile", "/dashboard", "/leaderboard"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await page.getByRole("heading", { level: 1 }).click();
      await page.screenshot({ path: testInfo.outputPath(`progress-${path.slice(1)}-${theme}.png`), fullPage: true });
    }
  }
});

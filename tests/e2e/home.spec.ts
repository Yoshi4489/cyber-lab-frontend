import { expect, test } from "@playwright/test";

test("live home uses only the real account even when old demo state exists", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ciscoku:learner:v1", JSON.stringify({ version: 1, username: "old_demo_owl", signedIn: true, completions: { "cookie-monster": Date.now() } })));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your curiosity.");
  await page.getByRole("link", { name: "Sign in to start" }).click();
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs$/);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back,Loopback Learner.");
  await expect(page.getByRole("main")).not.toContainText("old_demo_owl");
  await expect(page.getByRole("region", { name: "Demo learning progress" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Loopback Learner");
});

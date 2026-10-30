import { expect, test } from "@playwright/test";

test("live dashboard has published recommendations and no demo totals", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Sign in to start" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Intro Web", exact: true })).toBeVisible();
  await expect(page.getByTestId("home-progress")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText("demo XP");
});

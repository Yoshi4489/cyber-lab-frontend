import { expect, test } from "@playwright/test";

test("demo leaderboard stays separate from authenticated lab activity", async ({
  page,
}) => {
  await page.goto("/leaderboard");
  await expect(
    page.getByText(/This is not a live university leaderboard/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Join the demo" }).click();
  await page.getByLabel("Username", { exact: true }).fill("ranking_owl");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.goto("/leaderboard");
  const row = page.getByRole("row").filter({ hasText: "ranking_owl" });
  await expect(row).toContainText("#8");
  await page.goto("/labs/intro-web");
  await expect(page.getByRole("link", { name: "Start Lab" })).toHaveAttribute("href", "/login?next=%2Flabs%2Fintro-web%2Fsession");
  await page.goto("/leaderboard");
  await expect(row).toContainText("#8");
  await expect(row.getByRole("cell").last()).toHaveText("0");
});

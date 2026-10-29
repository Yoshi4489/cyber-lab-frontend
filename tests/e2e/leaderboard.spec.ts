import { expect, test } from "@playwright/test";

test("live rankings show only backend rows and signed-out Profile asks for sign-in", async ({ page }) => {
  const profileCalls: string[] = [];
  page.on("request", request => { if (/\/api\/profile/.test(request.url())) profileCalls.push(request.url()); });
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leaderboard");
  const rows = page.getByRole("table").getByRole("row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText("Loopback Learner");
  await expect(rows.nth(1)).toContainText("100");
  await expect(page.getByRole("main")).not.toContainText("demo XP");

  await page.goto("/profile");
  await expect(page.getByText("Sign in to see your progress.")).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login?next=%2Fprofile");
  expect(profileCalls).toEqual([]);
});

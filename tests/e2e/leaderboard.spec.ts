import { expect, test } from "@playwright/test";

test("unfinished live rankings and Profile have honest placeholders without scores", async ({ page }) => {
  const progressCalls: string[] = [];
  page.on("request", request => { if (/\/api\/(profile|leaderboard)/.test(request.url())) progressCalls.push(request.url()); });
  for (const [path, heading] of [["/leaderboard", "Rankings are on their way."], ["/profile", "Your profile is taking shape."]]) {
    await page.goto(path!);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading!);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("main")).not.toContainText("demo XP");
    await expect(page.getByRole("main")).toContainText("does not show totals yet");
    await expect(page.getByRole("link", { name: "Explore published labs" })).toBeVisible();
  }
  expect(progressCalls).toEqual([]);
});

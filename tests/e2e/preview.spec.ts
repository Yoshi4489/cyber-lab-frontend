import { expect, test } from "@playwright/test";

test("live paths and profile explain unfinished features without sample progress", async ({
  page,
}) => {
  for (const [route, heading] of [["/paths", "Learning paths are growing."], ["/profile", "Your profile is taking shape."]] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("main")).not.toContainText("demo XP");
    await page.getByRole("link", { name: "Explore published labs" }).click();
    await expect(page).toHaveURL(/\/labs$/);
  }
  await page.goto("/paths/web-security");
  await expect(page).toHaveURL(/\/paths$/);
});

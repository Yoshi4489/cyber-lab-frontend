import { expect, test } from "@playwright/test";

test("live guide explains real sessions and never exposes demo reset", async ({ page }) => {
  await page.goto("/guide");
  const main = page.getByRole("main");
  await expect(main).toContainText("operator-provided account");
  await expect(main).toContainText("harmless introduction");
  await expect(main).toContainText("Open Welcome page appears only when it is running");
  await expect(page.getByRole("button", { name: "Reset demo progress" })).toHaveCount(0);
  await expect(main).not.toContainText("Finish demo");
  await expect(main).not.toContainText("fictional");
});

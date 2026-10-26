import { expect, test } from "@playwright/test";

test("live signup keeps registration closed and uses real login with a safe local return", async ({ page }) => {
  await page.goto("/signup?next=%2Flabs%2Fintro-web%2Fsession");
  await expect(page.getByText("Public registration is currently closed.")).toBeVisible();
  await expect(page.getByLabel("Username", { exact: true })).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/intro-web\/session$/);
});

test("live login rejects unsafe return destinations and clears old session mutation keys", async ({ page }) => {
  await page.goto("/signup?next=https://attacker.test");
  await page.evaluate(() => {
    localStorage.setItem("ciscoku:active-instance:v1", JSON.stringify({ instanceId: crypto.randomUUID(), challengeId: crypto.randomUUID() }));
    sessionStorage.setItem("ciscoku:mutation:create:old", "create:old");
    sessionStorage.setItem("unrelated", "keep");
  });
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs$/);
  expect(await page.evaluate(() => ({ remembered: localStorage.getItem("ciscoku:active-instance:v1"), mutation: sessionStorage.getItem("ciscoku:mutation:create:old"), unrelated: sessionStorage.getItem("unrelated") }))).toEqual({ remembered: null, mutation: null, unrelated: "keep" });
});

import { expect, test } from "@playwright/test";

test("theme follows the system, persists an override, and responds to system changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 248, 245)",
  );
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  await page.reload();
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue(
    "dark",
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 25, 20)",
  );
  await page.getByLabel("Color theme", { exact: true }).selectOption("system");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 248, 245)",
  );
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 25, 20)",
  );
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  expect(errors).toEqual([]);
});

test("account navigation signs out through the BFF and preserves theme", async ({
  page,
  isMobile,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs$/);
  await page.getByLabel("Color theme", { exact: true }).selectOption("dark");
  if (isMobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByText("Loopback Learner", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your curiosity.",
  );
  await expect(page.getByLabel("Color theme", { exact: true })).toHaveValue("dark");
  expect(await (await page.request.get("/api/auth/session")).json()).toEqual({ authenticated: false });
});

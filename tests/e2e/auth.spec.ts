import { expect, test } from "@playwright/test";

test("real BFF login restores its HttpOnly session and logout clears it", async ({ page, context }) => {
  await page.goto("/login?next=https://attacker.test");
  await page.getByLabel("Email", { exact: true }).fill("learner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs$/);
  const cookie = (await context.cookies()).find(cookie => cookie.name === "ciscoku.backend-session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("ciscoku.backend-session");
  await page.reload();
  expect(await (await context.request.get("/api/auth/session")).json()).toMatchObject({ authenticated: true });
  const logout = await context.request.post("/api/auth/logout", { headers: { Origin: "http://127.0.0.1:3100" } });
  expect(logout.status()).toBe(204);
  expect(await (await context.request.get("/api/auth/session")).json()).toEqual({ authenticated: false });
});

test("verification and reset use generic acknowledgements and reject invalid links", async ({ page }) => {
  for (const path of ["/verify-email", "/forgot-password"]) {
    await page.goto(path);
    await page.getByLabel("Email", { exact: true }).fill("unknown@example.test");
    await page.getByRole("button", { name: "Send link" }).click();
    await expect(page.getByRole("status")).toContainText("If the account is eligible");
  }
  await page.goto("/reset-password?token=invalid");
  await expect(page.getByText("This link is invalid. Request a new link.")).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await page.goto("/verify-email?token=" + "A".repeat(43));
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
});

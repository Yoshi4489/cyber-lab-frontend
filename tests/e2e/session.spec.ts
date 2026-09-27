import { expect, test, type Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/labs/cookie-monster");
  await page.getByRole("link", { name: "Start Lab" }).click();
  await page.getByLabel("Username", { exact: true }).fill("campus_fox");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/cookie-monster$/);
  await page.getByRole("button", { name: "Start Lab" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
}

async function sessionExpiry(page: Page, slug: string) {
  return page.evaluate(
    ({ storageKey, sessionSlug }) => {
      const stored = window.localStorage.getItem(storageKey);
      const learner = JSON.parse(stored ?? "null") as {
        sessions?: Record<string, { expiresAt?: unknown }>;
      } | null;
      const expiresAt = learner?.sessions?.[sessionSlug]?.expiresAt;
      if (typeof expiresAt !== "number") {
        throw new Error("Expected a persisted demo session expiry");
      }
      return expiresAt;
    },
    { storageKey: "ciscoku:learner:v1", sessionSlug: slug },
  );
}

test("guest can start a demo, finish, and replay without duplicate XP", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") requests.push(request.url());
  });
  await enter(page);
  await expect(
    page.getByRole("button", { name: "Lab access coming later" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Finish Lab", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "One small step. Nicely done." }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Lab session" })).toContainText(
    "100Total demo XP",
  );
  await page.reload();
  await page.getByRole("button", { name: "Start Lab" }).click();
  await page.getByRole("button", { name: "Finish Lab", exact: true }).click();
  await expect(page.getByRole("region", { name: "Lab session" })).toContainText(
    "100Total demo XP",
  );
  await page.getByRole("link", { name: "See your progress" }).click();
  await expect(
    page.getByRole("progressbar", { name: "Progress to next level" }),
  ).toHaveAttribute("value", "100");
  await expect(
    page.getByRole("progressbar", {
      name: "Web security progress",
      exact: true,
    }),
  ).toHaveAttribute("value", "1");
  await expect(
    page.getByText("Today's goal complete", { exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
});

test("countdown survives refresh and expired demos award no XP", async ({
  page,
}) => {
  await page.clock.install();
  await enter(page);
  await page.clock.fastForward(61_000);
  const before = await sessionExpiry(page, "cookie-monster");
  await page.reload();
  await expect(page.getByRole("timer")).toBeVisible();
  expect(await sessionExpiry(page, "cookie-monster")).toBe(before);
  await page.clock.fastForward(25 * 60_000);
  await expect(
    page.getByRole("heading", { name: "Time for a fresh start." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finish Lab", exact: true }),
  ).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("progressbar", { name: "Progress to next level" }),
  ).toHaveAttribute("value", "0");
});

test("storage denial keeps demo usable with a visible warning", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked");
    };
  });
  await enter(page);
  await expect(
    page.getByText(/Your browser could not save changes/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish Lab", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "One small step. Nicely done." }),
  ).toBeVisible();
});

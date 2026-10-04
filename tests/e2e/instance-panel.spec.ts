import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const challengeId = "f5d66313-2997-45af-94d7-8bcad4d9fd4f";
const origin = "http://127.0.0.1:3100";
const idempotencyKeyPattern = /^(create|extend|destroy):[A-Za-z0-9._:-]+$/;

/**
 * Establishes a backend session the way the BFF requires: a same-origin
 * mutation that returns the sealed cookie. The context request shares its
 * cookie jar with the page, so navigation inherits the session.
 */
async function signIn(context: BrowserContext) {
  const response = await context.request.post("/api/auth/login", {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
    },
    data: {
      email: "learner@example.test",
      password: "correct-horse-battery-staple",
    },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    authenticated: true,
    user: { displayName: "Loopback Learner", emailVerified: true },
  });
}

function recordMutations(page: Page) {
  const mutations: {
    method: string;
    url: string;
    key: string | undefined;
    body: string | null;
  }[] = [];
  page.on("request", (request) => {
    if (request.method() === "GET") return;
    mutations.push({
      method: request.method(),
      url: request.url(),
      key: request.headers()["idempotency-key"],
      body: request.postData(),
    });
  });
  return mutations;
}

/**
 * Next.js injects its own `role="alert"` route announcer into every page, so a
 * panel error is only unambiguous when the locator is scoped to the panel.
 */
function panelAlert(page: Page) {
  return page
    .getByRole("region", { name: "Instance lifecycle" })
    .getByRole("alert");
}

test("spawns, polls, extends, and destroys an instance through the BFF", async ({
  page,
  context,
}) => {
  await signIn(context);
  const mutations = recordMutations(page);

  await page.goto("/instances");
  await expect(
    page.getByRole("heading", { name: "Instance control" }),
  ).toBeVisible();

  await page.getByLabel("Challenge ID").fill(challengeId);
  await page.getByRole("button", { name: "Spawn", exact: true }).click();

  await expect(page.getByTestId("instance-status")).toHaveText("pending");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText("withheld until running")).toBeVisible();
  await expect(page.getByTestId("instance-target")).toHaveCount(0);

  await page.getByRole("button", { name: "Extend" }).click();
  await expect(
    page.getByText("Extension accepted by the backend."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Destroy" }).click();
  await expect(
    page.getByText("Destruction accepted by the backend."),
  ).toBeVisible();

  const lifecycle = mutations.filter(({ url }) => url.includes("/api/instances"));
  expect(lifecycle.map(({ method }) => method)).toEqual([
    "POST",
    "POST",
    "DELETE",
  ]);
  for (const mutation of lifecycle) {
    expect(mutation.key).toMatch(idempotencyKeyPattern);
    expect(mutation.body ?? "").not.toContain("userId");
  }
  expect(new Set(lifecycle.map(({ key }) => key)).size).toBe(3);

  const [spawn, extend, destroy] = lifecycle;
  expect(JSON.parse(spawn?.body ?? "null")).toEqual({ challengeId });
  expect(extend?.body).toBeNull();
  expect(destroy?.body).toBeNull();

  // The sealed session stays out of reach of page scripts.
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "ciscoku.backend-session",
  );
});

test("refuses lifecycle actions without a backend session", async ({ page }) => {
  await page.goto("/instances");
  await page.getByLabel("Challenge ID").fill(challengeId);
  await page.getByRole("button", { name: "Spawn", exact: true }).click();

  const alert = panelAlert(page);
  await expect(alert).toContainText("UNAUTHORIZED");
  await expect(alert).toContainText("backend session");
  await expect(page.getByTestId("instance-status")).toHaveCount(0);
});

test("rejects a malformed challenge id before calling the BFF", async ({
  page,
}) => {
  const mutations = recordMutations(page);

  await page.goto("/instances");
  await page.getByLabel("Challenge ID").fill("not-a-uuid");
  await page.getByRole("button", { name: "Spawn", exact: true }).click();

  await expect(panelAlert(page)).toContainText("INVALID_REQUEST");
  expect(mutations.filter(({ url }) => url.includes("/api/instances"))).toEqual(
    [],
  );
});

test("stays unlinked from the demo navigation", async ({ page }) => {
  for (const path of ["/", "/labs", "/dashboard", "/guide"]) {
    await page.goto(path);
    await expect(page.locator('a[href="/instances"]')).toHaveCount(0);
  }
});

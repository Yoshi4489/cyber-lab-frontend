import { expect, test, type Page } from "@playwright/test";
import { backendFixtureAddress } from "../fixtures/backend-origin.mjs";

const fixtureOrigin = backendFixtureAddress().origin;
const challengeId = "88888888-8888-4888-8888-888888888888";
const flag = "FLAG{WELCOME_TO_CISCO_FAMILY}";

async function login(page: Page, email: string) {
  await page.goto("/login?next=%2Flabs%2Fwelcome%2Fsession");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/labs\/welcome\/session$/);
}
async function start(page: Page): Promise<{ id: string; url: string }> {
  await page.getByRole("button", { name: "Spawn Instance", exact: true }).click();
  await expect(page.getByTestId("lab-status")).toHaveText("running", { timeout: 10_000 });
  const url = await page.getByTestId("lab-target").getAttribute("href");
  const id = (await page.getByRole("definition").first().innerText()).trim();
  return { id, url: url! };
}
/** Same-origin BFF calls from one learner's own browser session. */
function bff(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(async ([method, path, body]) => {
    const response = await fetch(path, {
      method, credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Idempotency-Key": `isolation:${crypto.randomUUID()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.text() };
  }, [method, path, body] as const);
}

test.beforeEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/welcome`); });
test.afterEach(async ({ request }) => { await request.post(`${fixtureOrigin}/scenario/healthy`); });

test("two learners keep separate instances, foreign operations are denied, and stopping A keeps B", async ({ page, browser, isMobile }) => {
  const otherContext = await browser.newContext({ baseURL: "http://127.0.0.1:3100", viewport: page.viewportSize() ?? undefined, isMobile, hasTouch: isMobile });
  try {
    const b = await otherContext.newPage();
    await login(page, "learner@example.test");
    await login(b, "learner-b@example.test");
    const instanceA = await start(page);
    const instanceB = await start(b);
    expect(instanceA.id).not.toBe(instanceB.id);
    expect(instanceA.url).not.toBe(instanceB.url);

    for (const [method, path, body] of [
      ["GET", `/api/instances/${instanceA.id}`],
      ["POST", `/api/instances/${instanceA.id}/extend`],
      ["DELETE", `/api/instances/${instanceA.id}`],
      ["POST", "/api/submissions", { challengeId, instanceId: instanceA.id, flag }],
    ] as const) {
      const response = await bff(b, method, path, body);
      expect(response.status, `${method} ${path}`).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ code: "NOT_FOUND" });
      expect(response.body).not.toContain(instanceA.url);
    }
    await page.reload();
    await expect(page.getByTestId("lab-status")).toHaveText("running");
    await expect(page.getByTestId("lab-target")).toHaveAttribute("href", instanceA.url);

    await page.getByRole("button", { name: "Stop Lab", exact: true }).click();
    await expect(page.getByTestId("lab-status")).toHaveText("stopped");
    await expect(page.getByLabel("Flag", { exact: true })).toHaveCount(0);
    const stoppedSubmission = await bff(page, "POST", "/api/submissions", { challengeId, instanceId: instanceA.id, flag });
    expect(stoppedSubmission.status).toBe(404);

    await b.reload();
    await expect(b.getByTestId("lab-status")).toHaveText("running");
    await expect(b.getByTestId("lab-target")).toHaveAttribute("href", instanceB.url);
    await b.getByLabel("Flag", { exact: true }).fill(flag);
    await b.getByRole("button", { name: "Submit flag", exact: true }).click();
    await expect(b.getByTestId("flag-result")).toHaveText("Correct! You earned 10 points.");
  } finally { await otherContext.close(); }
});

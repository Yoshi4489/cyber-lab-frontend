import { expect, test } from "@playwright/test";

test("catalog shows loading, recoverable errors, and honest empty data", async ({ page, request }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/catalog", async route => { await gate; await route.abort(); });
  await page.goto("/labs");
  await expect(page.getByText("Loading labs…", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("UNREACHABLE");
  await expect(page.getByTestId("lab-card")).toHaveCount(0);
  await page.unroute("**/api/catalog");
  await page.getByRole("button", { name: "Retry loading labs" }).click();
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  try {
    await request.post("http://127.0.0.1:4101/scenario/empty-catalog");
    await page.reload();
    await expect(page.getByRole("heading", { name: "No labs found" })).toBeVisible();
    await expect(page.getByTestId("lab-card")).toHaveCount(0);
  } finally { await request.post("http://127.0.0.1:4101/scenario/healthy"); }
});

test("catalog combines search, category and difficulty; empty state can recover", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/labs");
  await expect(
    page.getByRole("heading", { name: "Find your next discovery." }),
  ).toBeVisible();
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Web security", exact: true }).click();
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Easy");
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Intro Web" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search labs" }).fill("not-a-lab");
  await expect(
    page.getByRole("heading", { name: "No labs found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await page.getByLabel("Sort labs").selectOption("points");
  await expect(page.getByTestId("lab-card").first()).toContainText(
    "Intro Web",
  );
  expect(errors).toEqual([]);
});

test("bookmarks persist across navigation and reload, then can be removed", async ({
  page,
}) => {
  await page.goto("/labs");
  await page
    .getByRole("button", { name: "Save Intro Web", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave Intro Web", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved");
  await expect(page.getByTestId("lab-card")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Intro Web" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Unsave Intro Web", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Keep your next challenge close." }),
  ).toBeVisible();
});

test("catalog links lead to backend briefings with real authentication", async ({
  page,
}) => {
  await page.goto("/labs");
  await page.getByRole("link", { name: "Intro Web", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Intro Web.",
  );
  await expect(
    page.getByRole("heading", { name: "A little context before you begin." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Lab" })).toHaveAttribute(
    "href",
    "/login?next=%2Flabs%2Fintro-web%2Fsession",
  );
  await page
    .getByRole("button", { name: "Save Intro Web", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unsave Intro Web", exact: true }),
  ).toBeVisible();
  const response = await page.goto("/labs/does-not-exist");
  // Next.js returns 200 for a streamed notFound response, 404 before streaming.
  expect([200, 404]).toContain(response?.status());
  await expect(
    page.getByRole("heading", { name: "This trail goes quiet." }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("navigation and layout work at the current viewport", async ({
  page,
  isMobile,
}) => {
  await page.goto("/labs");
  if (isMobile) {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "Learning paths" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Learning paths are growing." }),
    ).toBeVisible();
    await menu.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
  } else {
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByTestId("lab-grid")).toHaveAttribute(
      "data-layout",
      "list",
    );
    await page.getByRole("button", { name: "Grid view" }).click();
    await expect(page.getByTestId("lab-grid")).toHaveAttribute(
      "data-layout",
      "grid",
    );
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Learning paths" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Learning paths are growing." }),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("connection check reaches the backend through the server adapter", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:4101/scenario/healthy");
  await page.goto("/guide");
  await page
    .getByText("Maintainer tools: optional backend connection check", {
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByRole("status")).toContainText(
    "The backend API is reachable",
  );
  const response = await request.get("/api/backend-status");
  expect(await response.json()).toEqual({ status: "reachable" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("connection boundary rejects wrong services, errors, and redirects without exposing upstream data", async ({
  request,
}) => {
  try {
    for (const scenario of ["invalid", "error", "redirect"]) {
      await request.post(`http://127.0.0.1:4101/scenario/${scenario}`);
      const response = await request.get("/api/backend-status");
      expect(await response.json()).toEqual({ status: "unavailable" });
    }
  } finally {
    await request.post("http://127.0.0.1:4101/scenario/healthy");
  }
});

import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";
test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));
test("research case works without selected offers, persists on reload and isolates sessions", async ({
  page,
  browser,
}) => {
  await page.goto("/?view=market");
  await page
    .getByRole("textbox", { name: "Ingredient or category" })
    .fill("Rice");
  await page.getByRole("button", { name: "Research a question", exact: true }).click();
  await page
    .getByRole("textbox", { name: "What would you like to find out?" })
    .fill("Compare pack sizes before requesting delivery terms");
  await page.getByRole("button", { name: "Save research question" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Compare pack sizes before requesting delivery terms",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/view=followup.*case=/);
  const followupUrl = page.url();
  const { runLocalConvex } = await import("./e2e-local");
  const status = JSON.parse(runLocalConvex(["run", "sourcing:status", "{}"]));
  const investigate = page.getByRole("button", { name: "Investigate this question", exact: true });
  if (status.enabled) await expect(investigate).toBeEnabled();
  else await expect(investigate).toBeDisabled();
  async function inspectActivityDetails() {
    await page.getByRole("button", { name: "Activity", exact: true }).click();
    const history = page.getByRole("region", { name: "Case history", exact: true });
    await expect(history).toBeVisible();
    const details = history.getByRole("button", { name: "View details", exact: true }).first();
    await details.focus();
    await details.press("Enter");
    await expect(details).toHaveAttribute("aria-expanded", "true");
    await expect(details).toBeFocused();
    await expect(history.getByText(/Sourcing case created/)).toBeVisible();
    await details.press("Enter");
    await expect(details).toHaveAttribute("aria-expanded", "false");
    await expect(details).toBeFocused();
    const panel = history.locator(".disclosure-panel").first();
    await expect(panel).toHaveAttribute("aria-hidden", "true");
    await expect(panel).toHaveAttribute("inert", "");
    await expect(panel).toHaveCSS("height", "0px");
  }
  await inspectActivityDetails();
  await page.reload();
  await expect(page).toHaveURL(followupUrl);
  await expect(page.getByRole("heading", { name: "Compare pack sizes before requesting delivery terms", exact: true })).toBeVisible();
  await inspectActivityDetails();
  const other = await browser.newContext();
  await connectOnlyToLocalBackend(other);
  const isolated = await other.newPage();
  await isolated.goto("/?view=overview");
  await expect(isolated.getByRole("heading", { name: "Start with what your kitchen needs." })).toBeVisible();
  await isolated.goto(followupUrl);
  await expect(isolated.getByRole("heading", { name: "This follow-up isn’t available." })).toBeVisible();
  await expect(isolated.getByRole("heading", { name: "Compare pack sizes before requesting delivery terms", exact: true })).toHaveCount(0);
  await other.close();
});
test("case layout remains readable and actions stop while offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=market");
  await page
    .getByRole("textbox", { name: "Ingredient or category" })
    .fill("Rice");
  await page.getByRole("button", { name: "Research a question", exact: true }).click();
  await page
    .getByRole("textbox", { name: "What would you like to find out?" })
    .fill("Find a clear pack price and keep delivery pending");
  await page.getByRole("button", { name: "Save research question" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Find a clear pack price and keep delivery pending",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/view=followup.*case=/);
  await expect(page.getByRole("group", { name: "Follow-up sections" })).toBeVisible();
  await expect(page.locator("#market-main")).toBeHidden();
  for (const width of [390, 320, 1920]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .locator(".sourcing-case")
      .screenshot({ path: `test-results/sourcing-${width}.png` });
  }
  await context.setOffline(true);
  await expect(page.getByRole("region", { name: "Next step for this case" })).toContainText("You are offline");
  await expect(page.getByRole("button", { name: "Investigate this question", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await page.getByRole("button", { name: "Research a question", exact: true }).click();
  await page.getByRole("textbox", { name: "What would you like to find out?" }).fill("Another question while offline");
  await expect(page.getByRole("button", { name: "Save research question" })).toBeDisabled();
  await context.setOffline(false);
});

test("reviewed new evidence returns to the same case comparison and preserves its history", async ({
  page,
  context,
}) => {
  const { runLocalConvex } = await import("./e2e-local");
  const { createHash } = await import("node:crypto");
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { extractionExample, extractionSource } =
    await import("../fixtures/extraction");
  const { draftValues, extractionToPurchase } =
    await import("../src/domain/extraction");
  const token = createHash("sha256").update(crypto.randomUUID()).digest("hex");
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const values = {
    ...draftValues(extractionExample),
    packageContent: "18",
    packageUnit: "kg",
    price: "85",
  };
  function sourceRun() {
    const directory = mkdtempSync(join(tmpdir(), "case-research-e2e-"));
    try {
      const path = join(directory, "research.json");
      writeFileSync(
        path,
        JSON.stringify([
          {
            ownerHash: createHash("sha256").update(token).digest("hex"),
            clientId: crypto.randomUUID(),
            ingredient: "Arroz",
            region: "Lima",
            observedAt: new Date().toISOString(),
            createdAt: Date.now(),
            status: "complete",
            error: null,
            discarded: 0,
            warning: false,
            simulated: true,
            sources: [
              {
                url: "https://example.com/rice",
                title: "Synthetic rice source",
                description: "E2E fixture",
                markdown: extractionSource.text,
                contentTruncated: false,
                extraction: extractionExample,
                extractionStatus: "complete",
                extractionAttempts: 1,
                extractionError: null,
                analysis: {
                  kind: "product",
                  summary: "Synthetic source",
                  evidence: ["Saco: S/ 80.00"],
                  warnings: ["Package weight requires review"],
                },
              },
            ],
          },
        ]),
      );
      runLocalConvex(["import", "--append", "--table", "researchRuns", path]);
      return run("research:list", { token })[0].id;
    } finally {
      rmSync(directory, { recursive: true });
    }
  }
  const firstId = sourceRun(),
    secondId = sourceRun();
  const seed = extractionToPurchase(
    { ...extractionSource, id: `${firstId}:0` },
    extractionExample,
    values,
    true,
  );
  const saved = run("comparisons:save", {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request: { ...seed.request, quantity: 10 },
    offers: seed.offers,
    selectedOfferId: null,
    webReviews: [{ runId: firstId, sourceIndex: 0, values, confirmed: true }],
  });
  const dir = mkdtempSync(join(tmpdir(), "case-e2e-"));
  try {
    const path = join(dir, "case.json");
    writeFileSync(
      path,
      JSON.stringify([
        {
          ownerHash: createHash("sha256").update(token).digest("hex"),
          ingredient: "Arroz",
          region: "Lima",
          objective: "Review the latest price",
          comparisonId: saved.id,
          status: "complete",
          revision: 1,
          steps: 1,
          runs: 1,
          researchRunIds: [secondId],
          summary: "Synthetic new evidence awaiting review",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]),
    );
    runLocalConvex(["import", "--append", "--table", "sourcingCases", path]);
  } finally {
    rmSync(dir, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?view=market");
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await page.locator("#overview-work").getByRole("listitem").filter({ hasText: "Review the latest price" })
    .getByRole("button", { name: "Arroz", exact: true }).click();
  await expect(page).toHaveURL(/view=followup.*case=/);
  await expect(page.getByRole("region", { name: "Next step for this case" })).toContainText("Comparison needs confirmation");
  await page.getByRole("group", { name: "Follow-up sections" }).getByRole("button", { name: "Sources", exact: true }).click();
  const [caseRow] = run("sourcing:list", { token });
  const caseRuns = run("sourcing:research", { token, caseId: caseRow.id });
  const latestIndex = caseRuns.findIndex((item: { id: string }) => item.id === secondId);
  expect(latestIndex).toBeGreaterThanOrEqual(0);
  await page.locator(".sourcing-reviews").getByRole("button", { name: "Searches in this follow-up (2)", exact: true }).click();
  await page.locator(".sourcing-reviews")
    .getByRole("button", { name: new RegExp(`^Search ${latestIndex + 1} · Arroz · Lima`) }).click();
  await page
    .locator(".sourcing-reviews")
    .getByRole("button", { name: "Review offer", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Package unit", { exact: true }).click();
  await dialog.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Package size", { exact: true }).fill("18");
  await dialog.getByLabel("Price per package", { exact: true }).fill("90");
  await dialog
    .getByLabel(
      "I reviewed the source and confirm the data, including my corrections",
    )
    .check();
  await dialog
    .getByRole("button", { name: "Keep reviewed offer", exact: true })
    .click();
  await page.getByRole("button", { name: "Save findings", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Findings saved with this follow-up." })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Sources", exact: true }).click();
  await page
    .locator(".sourcing-reviews")
    .getByRole("button", { name: "Compare 1 reviewed offer", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("earlier evidence remains in history");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Review updated comparison" })
    .click();
  await expect(
    page.getByLabel("Required quantity", { exact: true }),
  ).toHaveValue("10");
  await page
    .getByRole("button", { name: "Save comparison changes", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: true,
    }),
  ).toBeVisible();
  const [updated] = run("comparisons:list", { token });
  expect(updated.id).toBe(saved.id);
  expect(updated.revision).toBe(2);
  expect(updated.offers[0].priceCents).toBe(9000);
  expect(updated.sources[`${firstId}:0`]).toEqual(
    saved.sources[`${firstId}:0`],
  );
  expect(
    run("sourcing:get", { token, caseId: caseRow.id }).events.some(
      (event: { kind: string }) => event.kind === "comparison_saved",
    ),
  ).toBe(true);
});

test("a waiting case reacts to a later supplier reply and opens that conversation", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  const { runLocalConvex } = await import("./e2e-local");
  const { createHash } = await import("node:crypto");
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { riceRequest, riceOffers } = await import("../fixtures/procurement");
  const token = createHash("sha256").update(crypto.randomUUID()).digest("hex");
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const caseId = run("sourcing:create", {
    token,
    ingredient: "Arroz",
    region: "Lima",
    objective: "Wait for delivery terms",
  });
  const saved = run("comparisons:save", {
    token,
    sourcingCaseId: caseId,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  const folder = mkdtempSync(join(tmpdir(), "case-wait-e2e-"));
  const seed = (table: string, doc: object) => {
    const path = join(folder, `${table}.json`);
    writeFileSync(path, JSON.stringify([doc]));
    runLocalConvex(["import", "--append", "--table", table, path]);
  };
  try {
    seed("quotationRequests", {
      ownerHash: createHash("sha256").update(token).digest("hex"),
      clientId: crypto.randomUUID(),
      comparisonId: saved.id,
      recipient: null,
      inboxId: null,
      subject: "Delivery terms inquiry",
      text: "Synthetic request for delivery terms.",
      state: "sent",
      revision: 3,
      idempotencyKey: crypto.randomUUID(),
      receipt: {
        messageId: crypto.randomUUID(),
        threadId: crypto.randomUUID(),
      },
      failure: null,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      simulated: true,
    });
    const request = run("quotationMail:list", { token })[0];
    await context.addInitScript(
      (value) => localStorage.setItem("procurement-demo-session-v1", value),
      token,
    );
    await page.goto("/?view=market");
    await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
    await page.locator("#overview-work").getByRole("listitem").filter({ hasText: "Wait for delivery terms" })
      .getByRole("button", { name: "Arroz", exact: true }).click();
    await expect(page).toHaveURL(/view=followup.*case=/);
    const next = page.getByRole("region", { name: "Next step for this case" });
    await expect(next).toContainText("Waiting for the supplier");
    await next.getByRole("button", { name: "View sent message" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Delivery terms inquiry",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("group", { name: "Follow-up sections" }).getByRole("button", { name: "Overview", exact: true }).click();
    await next.getByRole("button", { name: "View sent message" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Delivery terms inquiry",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("group", { name: "Follow-up sections" }).getByRole("button", { name: "Overview", exact: true }).click();
    seed("quotationReplies", {
      requestId: request.id,
      eventId: crypto.randomUUID(),
      messageId: crypto.randomUUID(),
      threadId: request.receipt.threadId,
      from: "demo@example.test",
      text: "Synthetic supplier reply: delivery needs confirmation.",
      receivedAt: new Date().toISOString(),
    });
    await expect(next).toContainText("A supplier replied");
    await next.getByRole("button", { name: "Review supplier reply" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Synthetic supplier reply: delivery needs confirmation.",
    );
    await expect(
      page.getByRole("button", { name: "Review as new offer" }),
    ).toBeVisible();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

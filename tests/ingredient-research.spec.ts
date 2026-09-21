import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import {
  assertLocalWebSocketUrl,
  connectOnlyToLocalBackend,
  runLocalConvex,
} from "./e2e-local";

test("a resumed AI proposal requires ambiguous-row review, preserves provenance, and supports one or several selections", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const directory = mkdtempSync(join(tmpdir(), "ingredient-reading-"));
  try {
    const file = join(directory, "reading.json");
    writeFileSync(
      file,
      JSON.stringify([
        {
          ownerHash: createHash("sha256").update(token).digest("hex"),
          clientId: randomUUID(),
          contentHash: "a".repeat(64),
          status: "complete",
          error: null,
          createdAt: Date.now(),
          rows: [
            {
              id: "rice",
              ingredient: "Long-grain white rice",
              original: "Long-grain white rice — 40 lb",
              reference: "Page 1, line 1",
              documentHash: "a".repeat(64),
              needsReview: false,
            },
            {
              id: "flour",
              ingredient: "",
              original: "All-purpose fl… — 25 lb",
              reference: "Page 1, line 2",
              documentHash: "a".repeat(64),
              needsReview: true,
            },
          ],
        },
      ]),
    );
    runLocalConvex([
      "import",
      "--append",
      "--table",
      "ingredientExtractions",
      file,
    ]);
  } finally {
    rmSync(directory, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?view=overview");
  await page
    .getByRole("button", { name: "Import ingredient list", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByText("Resume a recent list reading", { exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Review reading", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: /^Ingredient 2/ })
    .fill("All-purpose flour");
  await dialog
    .getByRole("button", { name: "Confirm 2 ingredients", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Review each flagged ingredient",
  );
  await dialog
    .getByRole("button", { name: "I checked this row", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirm 2 ingredients", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Research selected · 2", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /All-purpose flour/ }).uncheck();
  await expect(
    page.getByRole("button", { name: "Research selected · 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /All-purpose flour/ }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save list", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "List saved", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Saved lists (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Open list", exact: true }).click();
  await page
    .getByRole("button", { name: "View list source", exact: true })
    .click();
  await expect(dialog).toContainText("Long-grain white rice — 40 lb");
  await expect(dialog).toContainText("All-purpose fl… — 25 lb");
  await expect(dialog).toContainText("Original file SHA-256");
  await page.keyboard.press("Escape");
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: "Messages", exact: true }),
    ).toBeVisible();
  }
  // No provider mock is used in this browser test: the server gate remains disabled.
  await expect(
    page.getByRole("button", { name: "Research selected · 2", exact: true }),
  ).toBeDisabled();
});

test("PDF originals render locally alongside editable rows on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page.getByText("Ingredient lists", { exact: true }).click();
  await page
    .getByLabel("Ingredient intake")
    .getByRole("button", { name: "Import ingredient list", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Ingredient file")
    .setInputFiles("public/examples/quote-demo-us.pdf");
  await dialog
    .getByLabel("Transcribe ingredients")
    .fill("Long-grain white rice");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  const original = dialog.getByRole("img", {
    name: "Original ingredient list, PDF page 1",
  });
  await expect(original).toBeVisible();
  await expect(dialog.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: /^Ingredient 1/ }),
  ).toHaveValue("Long-grain white rice");
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(original).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("retrying an unconfirmed launch keeps its identity, but replacing an identical list starts a new request", async ({
  page,
}) => {
  const requests: Array<{ clientId: string; rows: unknown[] }> = [];
  await page.routeWebSocket(/.*/, (socket) => {
    assertLocalWebSocketUrl(socket.url());
    const server = socket.connectToServer();
    const batchQueries = new Set<number>();
    let version = { querySet: 0, identity: 0, ts: "AAAAAAAAAAA=" };
    server.onMessage((message) => {
      let response;
      try {
        response = JSON.parse(String(message));
      } catch {
        socket.send(message);
        return;
      }
      if (response.type === "Transition") {
        version = response.endVersion;
        for (const update of response.modifications ?? []) {
          if (
            update.type === "QueryUpdated" &&
            batchQueries.has(update.queryId)
          )
            update.value.enabled = true;
        }
      }
      socket.send(JSON.stringify(response));
    });
    socket.onMessage((message) => {
      let data;
      try {
        data = JSON.parse(String(message));
      } catch {
        server.send(message);
        return;
      }
      if (data.type === "ModifyQuerySet") {
        for (const query of data.modifications ?? []) {
          if (
            query.type === "Add" &&
            query.udfPath === "ingredientBatches:list"
          )
            batchQueries.add(query.queryId);
          if (query.type === "Remove") batchQueries.delete(query.queryId);
        }
      }
      if (
        data.type !== "Mutation" ||
        data.udfPath !== "ingredientBatches:create"
      ) {
        server.send(message);
        return;
      }
      // Simulated mutation responses only: no research or provider call is forwarded.
      requests.push(data.args[0]);
      socket.send(
        JSON.stringify({
          type: "MutationResponse",
          requestId: data.requestId,
          logLines: [],
          ...(requests.length === 1
            ? { success: false, result: "Simulated interrupted confirmation" }
            : { success: true, result: "simulated-batch", ts: version.ts }),
        }),
      );
      // Convex resolves successful mutations after observing their committed query version.
      if (requests.length > 1)
        socket.send(
          JSON.stringify({
            type: "Transition",
            startVersion: version,
            endVersion: version,
            modifications: [],
          }),
        );
    });
  });
  await page.goto("/?view=overview");
  async function enterList(replace: boolean) {
    await page
      .getByRole("button", {
        name: replace ? "Replace ingredient list" : "Import ingredient list",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Type or paste ingredients").fill("Rice");
    await dialog
      .getByRole("button", { name: "Review ingredients", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Confirm 1 ingredient", exact: true })
      .click();
  }
  await enterList(false);
  await page
    .getByRole("button", { name: "Research selected · 1", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Starting was not confirmed",
  );
  await page
    .getByRole("button", { name: "Research selected · 1", exact: true })
    .click();
  await expect(
    page.getByText("Your research is saved in Overview.", { exact: false }),
  ).toBeVisible();
  expect(requests[1].clientId).toBe(requests[0].clientId);
  await enterList(true);
  await page
    .getByRole("button", { name: "Research selected · 1", exact: true })
    .click();
  await expect(
    page.getByText("Your research is saved in Overview.", { exact: false }),
  ).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[2].rows).toEqual(requests[1].rows);
  expect(requests[2].clientId).not.toBe(requests[1].clientId);
});

test("batch attention appears once and keeps exact evidence, comparison and reply actions", async ({
  page,
  context,
}, info) => {
  await connectOnlyToLocalBackend(context);
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const seed = (table: string, rows: object[], replace = false) => {
    const directory = mkdtempSync(join(tmpdir(), "batch-attention-"));
    try {
      const file = join(directory, "rows.json");
      writeFileSync(file, JSON.stringify(rows));
      runLocalConvex([
        "import",
        replace ? "--replace" : "--append",
        "--yes",
        "--table",
        table,
        file,
      ]);
    } finally {
      rmSync(directory, { recursive: true });
    }
  };
  const token = createHash("sha256").update(randomUUID()).digest("hex"),
    hash = createHash("sha256").update(token).digest("hex"),
    now = Date.now();
  const study = run("studies:save", {
    token,
    clientId: randomUUID(),
    id: null,
    expectedRevision: 0,
    term: "Arroz",
    region: "Lima",
    selectedIds: ["distributor-c"],
  });
  const rice = run("sourcing:create", {
    token,
    studyId: study.id,
    objective: "Find rice suppliers",
  });
  const flour = run("sourcing:create", {
    token,
    ingredient: "Harina",
    region: "Lima",
    objective: "Find flour suppliers",
  });
  const reserved = run("research:reserveSearch", {
    token,
    clientId: randomUUID(),
    ingredient: "Arroz",
    region: "Lima",
  });
  run("research:finishSearch", {
    id: reserved.run.id,
    simulated: true,
    discarded: 0,
    warning: false,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Synthetic rice supplier",
        description: "Test evidence",
        markdown: "Synthetic public rice details",
        contentTruncated: false,
      },
    ],
  });
  seed("ingredientBatches", [
    {
      ownerHash: hash,
      clientId: randomUUID(),
      title: "Reviewed kitchen list",
      region: "Lima",
      sourceKind: "manual",
      active: false,
      generation: 1,
      createdAt: now,
      updatedAt: now,
      rows: [
        { ingredient: "Arroz", caseId: rice },
        { ingredient: "Harina", caseId: flour },
      ].map((r, i) => ({
        ...r,
        id: String(i),
        original: r.ingredient,
        reference: `Line ${i + 1}`,
        needsReview: false,
        state: "settled",
      })),
    },
  ]);
  const batchId = run("ingredientBatches:list", { token }).batches[0].id;
  // Preserve the disposable local dataset while attaching these two fixture cases.
  const cases = JSON.parse(
    runLocalConvex([
      "data",
      "sourcingCases",
      "--format",
      "json",
      "--limit",
      "1000",
    ]),
  );
  seed(
    "sourcingCases",
    cases.map((c: { _id: string }) =>
      c._id === rice
        ? {
            ...c,
            batchId,
            status: "complete",
            researchRunIds: [reserved.run.id],
            sourceProgress: [
              { url: "https://supplier.test/rice", interpreted: false },
            ],
          }
        : c._id === flour
          ? { ...c, batchId, status: "failed" }
          : c,
    ),
    true,
  );
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?view=overview&example=pe");
  const overview = page.locator("#overview-main"),
    group = overview.getByRole("region", { name: "Ingredient list research" });
  const riceRow = group
    .locator(".batch-progress-row")
    .filter({ hasText: "Arroz" });
  await expect(group.locator(".batch-progress-row")).toHaveCount(2);
  await expect(
    overview.getByRole("button", {
      name: "2 Needs your attention",
      exact: true,
    }),
  ).toBeVisible();
  await expect(overview.locator(".overview-attention li")).toHaveCount(0);
  await expect(
    overview.getByRole("button", { name: "Review findings", exact: true }),
  ).toHaveCount(1);
  await expect(
    group.getByRole("button", { name: "Review research", exact: true }),
  ).toHaveCount(1);
  await riceRow
    .getByRole("button", { name: "Review findings", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`run=${reserved.run.id}.*case=${rice}`),
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  const comparison = run("comparisons:save", {
    token,
    sourcingCaseId: rice,
    clientId: randomUUID(),
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers.map((offer, i) =>
      i ? offer : { ...offer, freightCents: null },
    ),
    selectedOfferId: null,
  });
  await riceRow
    .getByRole("button", { name: "Review comparison", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`comparison=${comparison.id}`));
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  seed("quotationRequests", [
    {
      ownerHash: hash,
      clientId: randomUUID(),
      studyId: study.id,
      recipient: null,
      inboxId: null,
      subject: "Synthetic rice question",
      text: "Confirm rice delivery",
      state: "sent",
      simulated: true,
      revision: 1,
      idempotencyKey: randomUUID(),
      receipt: null,
      failure: null,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const requestId = run("quotationMail:list", { token })[0].id;
  seed("quotationReplies", [
    {
      requestId,
      eventId: randomUUID(),
      messageId: randomUUID(),
      threadId: randomUUID(),
      from: "test@example.test",
      receivedAt: new Date().toISOString(),
      text: "Synthetic reply: delivery is PEN 8.",
    },
  ]);
  await expect(
    riceRow.getByText("A supplier replied", { exact: true }),
  ).toBeVisible();
  await expect(
    overview.getByRole("button", {
      name: "Review supplier reply",
      exact: true,
    }),
  ).toHaveCount(1);
  for (const width of [1920, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await group.screenshot({
      path: info.outputPath(`batch-attention-${width}.png`),
    });
  }
  await riceRow
    .getByRole("button", { name: "Review supplier reply", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`case=${rice}.*message=${requestId}`),
  );
});

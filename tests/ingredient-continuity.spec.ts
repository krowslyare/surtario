import { expect, test, type Page } from "@playwright/test";
import { assertLocalWebSocketUrl } from "./e2e-local";

// Override only the named query/mutation responses. All other subscriptions use
// the isolated local backend. No research mutation or file reaches a provider.
async function simulate(page: Page, values: Record<string, unknown>, launch?: (args: { clientId: string; rows: { id: string; ingredient: string }[] }) => void) {
  const publishers: Array<() => void> = [];
  await page.routeWebSocket(/.*/, (socket) => {
    assertLocalWebSocketUrl(socket.url());
    const server = socket.connectToServer();
    const queries = new Map<number, string>();
    let version = { querySet: 0, identity: 0, ts: "AAAAAAAAAAA=" };
    const publish = () => socket.send(JSON.stringify({
      type: "Transition", startVersion: version, endVersion: version,
      modifications: [...queries].filter(([, path]) => path in values).map(([queryId, path]) => ({
        type: "QueryUpdated", queryId, value: values[path], logLines: [],
      })),
    }));
    publishers.push(publish);
    server.onMessage((message) => {
      const response = JSON.parse(String(message));
      if (response.type === "Transition") {
        version = response.endVersion;
        for (const update of response.modifications ?? []) {
          const path = queries.get(update.queryId);
          if (update.type === "QueryUpdated" && path && path in values) update.value = values[path];
        }
      }
      socket.send(JSON.stringify(response));
    });
    socket.onMessage((message) => {
      const request = JSON.parse(String(message));
      if (request.type === "ModifyQuerySet") {
        for (const query of request.modifications ?? []) {
          if (query.type === "Add") queries.set(query.queryId, query.udfPath);
          else queries.delete(query.queryId);
        }
      }
      if (request.type === "Mutation" && request.udfPath === "ingredientBatches:create") {
        if (!launch) throw new Error("Unexpected research launch");
        launch(request.args[0]);
        socket.send(JSON.stringify({ type: "MutationResponse", requestId: request.requestId, success: true, result: "simulated-batch", ts: version.ts, logLines: [] }));
        publish();
      } else server.send(message);
    });
  });
  return () => publishers.forEach((publish) => publish());
}

test("launching one ingredient keeps the other three available after research finishes", async ({ page }, info) => {
  const state = { enabled: true, remaining: 10, busy: false, batches: [] };
  const requests: Array<{ clientId: string; rows: { id: string; ingredient: string }[] }> = [];
  const publish = await simulate(page, { "ingredientBatches:list": state }, (request) => {
    requests.push(request);
    state.busy = true;
    state.remaining -= request.rows.length;
  });
  await page.goto("/?view=overview");
  await page.getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type or paste ingredients").fill("Rice\nFlour\nVegetable oil\nRed onions");
  await dialog.getByRole("button", { name: "Review ingredients", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm 4 ingredients", exact: true }).click();
  const rows = page.locator(".ingredient-selection-row");
  await rows.filter({ hasText: "Rice" }).getByRole("button").click();
  await expect(rows).toHaveCount(4);
  await expect(rows.filter({ hasText: "Rice" })).toContainText("Research saved in Overview");
  await expect(rows.filter({ hasText: "Rice" }).getByRole("checkbox")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Research selected · 3" })).toBeDisabled();
  await page.getByRole("navigation").getByRole("button", { name: "Messages", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await expect(rows.filter({ hasText: "Rice" })).toContainText("Research saved in Overview");
  state.busy = false;
  publish();
  const remaining = page.getByRole("button", { name: "Research selected · 3", exact: true });
  await expect(remaining).toBeEnabled();
  await page.getByRole("checkbox", { name: "Select all", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Select all", exact: true }).check();
  await expect(remaining).toBeEnabled();
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`remaining-${width}.png`), fullPage: true });
  }
  await remaining.click();
  await expect(page.getByText("Research saved in Overview", { exact: true })).toHaveCount(4);
  expect(requests.map((r) => r.rows.map((row) => row.ingredient))).toEqual([["Rice"], ["Flour", "Vegetable oil", "Red onions"]]);
  expect(requests[0].clientId).not.toBe(requests[1].clientId);
});

const image = { name: "kitchen.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") };

test("a lost reading response recovers the same request and displays its saved proposal", async ({ page }) => {
  const values: Record<string, unknown> = {
    "ingredientExtraction:status": { enabled: true, siteUrl: "http://127.0.0.1:3271" },
    "ingredientExtraction:get": null,
  };
  const publish = await simulate(page, values);
  const ids: string[] = [];
  await page.route("**/ingredient-list/read", async (route) => {
    ids.push(route.request().headers()["x-request-id"]);
    if (ids.length === 1) await route.abort("failed");
    else {
      values["ingredientExtraction:get"] = {
        status: "complete", rows: [{ id: "rice", ingredient: "Rice", original: "Rice — 40 lb", reference: "Line 1", needsReview: false }],
      };
      publish();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"accepted":true}', headers: { "Access-Control-Allow-Origin": "*" } });
    }
  });
  await page.goto("/?view=overview");
  await page.getByRole("button", { name: "Import ingredient list", exact: true }).click();
  await page.getByLabel("Ingredient file (optional)", { exact: true }).setInputFiles(image);
  await page.getByRole("button", { name: "Read list with AI", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Recover this reading");
  await page.getByRole("button", { name: "Recover this reading", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Ingredient 1/ })).toHaveValue("Rice");
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
});

for (const status of ["failed", "complete"] as const) {
  test(`a confirmed ${status} reading with no rows permits an explicit new reading`, async ({ page }) => {
    const values: Record<string, unknown> = {
      "ingredientExtraction:status": { enabled: true, siteUrl: "http://127.0.0.1:3271" },
      "ingredientExtraction:get": null,
    };
    const publish = await simulate(page, values);
    const ids: string[] = [];
    await page.route("**/ingredient-list/read", async (route) => {
      ids.push(route.request().headers()["x-request-id"]);
      values["ingredientExtraction:get"] = { status, rows: [], error: status === "failed" ? "Confirmed test failure" : null };
      publish();
      // A late HTTP failure must not overwrite the already confirmed server result.
      await route.abort("failed");
    });
    await page.goto("/?view=overview");
    await page.getByRole("button", { name: "Import ingredient list", exact: true }).click();
    await page.getByLabel("Ingredient file (optional)", { exact: true }).setInputFiles(image);
    await page.getByRole("button", { name: "Read list with AI", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(status === "failed" ? "Confirmed test failure" : "No ingredients could be read");
    await expect(page.getByRole("alert")).not.toContainText("Recover this reading");
    await page.getByRole("button", { name: "Read list again", exact: true }).click();
    await expect.poll(() => ids.length).toBe(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
}

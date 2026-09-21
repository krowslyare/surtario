import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";
const run = (name: string, args: object) => JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
function seed(table: string, row: object) {
  const directory = mkdtempSync(join(tmpdir(), "overview-"));
  try { const file = join(directory, "rows.json"); writeFileSync(file, JSON.stringify([row])); runLocalConvex(["import", "--append", "--table", table, file]); }
  finally { rmSync(directory, { recursive: true }); }
}
test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));

test("overview reacts to a reply, opens its exact conversation, records the decision and survives reload", async ({ page, context }, info) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const study = run("studies:save", { token, clientId: randomUUID(), id: null, expectedRevision: 0, term: "Arroz", region: "Lima", selectedIds: ["distributor-c"] });
  const caseId = run("sourcing:create", { token, studyId: study.id, objective: "Confirm rice delivery" });
  const offers = riceOffers.map((offer, i) => i ? offer : { ...offer, priceCents: 4000, freightCents: null });
  const comparison = run("comparisons:save", { token, sourcingCaseId: caseId, clientId: randomUUID(), id: null, expectedRevision: 0, request: riceRequest, offers, selectedOfferId: null });
  seed("quotationRequests", { ownerHash: createHash("sha256").update(token).digest("hex"), clientId: randomUUID(), studyId: study.id, recipient: null, inboxId: null,
    subject: "Synthetic overview delivery question", text: "Confirm delivery for rice.", state: "sent", simulated: true, revision: 1, idempotencyKey: randomUUID(), receipt: null, failure: null, createdAt: Date.now(), updatedAt: Date.now() });
  const requestId = run("quotationMail:list", { token })[0].id;
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  const queries = new Set<string>();
  page.on("websocket", socket => socket.on("framesent", frame => {
    const message = JSON.parse(String(frame.payload));
    if (message.type === "ModifyQuerySet") for (const query of message.modifications ?? []) if (query.type === "Add") queries.add(query.udfPath);
  }));
  await page.goto("/?view=overview&example=pe");
  const overview = page.locator("#overview-main");
  const work = overview.locator(".overview-work-list > li");
  await expect(work).toHaveCount(1);
  expect([...queries].filter(name => ["research:list", "studies:list", "comparisons:list", "quotationMail:list", "documents:list", "sourcing:research"].includes(name))).toEqual([]);
  await expect(overview.getByRole("button", { name: "1 Waiting for suppliers", exact: true })).toBeVisible();
  seed("quotationReplies", { requestId, eventId: randomUUID(), messageId: randomUUID(), threadId: randomUUID(), from: "test@example.test", receivedAt: new Date().toISOString(), text: "El flete es PEN 8 por pedido." });
  await expect(work.getByText("A supplier replied", { exact: true })).toBeVisible();
  await expect(overview.getByRole("button", { name: "0 Waiting for suppliers", exact: true })).toBeVisible();
  await expect(overview.getByRole("button", { name: "1 Needs your attention", exact: true })).toBeVisible();
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`overview-${width}.png`), fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await work.getByRole("button", { name: "Review supplier reply", exact: true }).press("Enter");
  await expect(page).toHaveURL(new RegExp(`case=${caseId}.*message=${requestId}`));
  await page.getByRole("button", { name: "Use reply to confirm delivery", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Confirm delivery from this reply", exact: true });
  await confirm.getByLabel("Offer to update", { exact: true }).selectOption(offers[0].id);
  await confirm.getByLabel("Delivery per order (PEN)", { exact: true }).fill("8");
  await confirm.getByLabel("Exact phrase confirming delivery", { exact: true }).fill("El flete es PEN 8 por pedido.");
  await confirm.getByRole("checkbox", { name: /I confirm this reply gives/ }).check();
  await confirm.getByRole("button", { name: "Confirm delivery and save", exact: true }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 48.00");
  await page.getByRole("button", { name: "Back to follow-up", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await expect(work).toHaveCount(1);
  await expect(work.getByText("A supplier replied", { exact: true })).toHaveCount(0);
  await expect(overview.locator(".overview-outcomes")).toContainText("PEN 48.00");
  await page.reload();
  await expect(overview.locator(".overview-outcomes")).toContainText("PEN 48.00");
  await expect(work.getByRole("button", { name: "Review supplier reply", exact: true })).toHaveCount(0);
  await overview.getByRole("button", { name: "Open updated comparison", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`comparison=${comparison.id}`));
  await page.getByLabel("Required quantity", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Back to overview", exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("20");
  const saved = run("comparisons:list", { token })[0];
  run("comparisons:save", { token, id: saved.id, clientId: randomUUID(), expectedRevision: saved.revision, request: { ...saved.request, quantity: 20 }, offers: saved.offers, selectedOfferId: null });
  await page.getByRole("button", { name: "Back to overview", exact: true }).click();
  await expect(overview.getByText("Saved outcome · a newer comparison revision exists", { exact: true })).toBeVisible();
  await expect(overview.locator(".overview-outcomes")).toContainText("PEN 48.00");
});

test("reviewed research clears its reminder across reload and another browser session sees none of the work", async ({ page, context, browser }) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const reserved = run("research:reserveSearch", { token, clientId: randomUUID(), ingredient: "Rice", region: "Portland, OR, US" });
  run("research:finishSearch", { id: reserved.run.id, simulated: true, discarded: 0, warning: false, sources: [{ url: "https://supplier.test/rice", title: "Synthetic overview source", description: "Test-only evidence", markdown: "Review this test source", contentTruncated: false }] });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=overview");
  await page.locator(".overview-work-list").getByRole("button", { name: "Review findings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Synthetic overview source", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark findings reviewed", exact: true }).click();
  await expect(page.getByText("These findings are marked as reviewed.", { exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("button", { name: "0 Needs your attention", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "0 Needs your attention", exact: true })).toBeVisible();
  expect(run("research:list", { token })).toHaveLength(1);
  const isolated = await browser.newContext();
  await connectOnlyToLocalBackend(isolated);
  const otherPage = await isolated.newPage();
  await otherPage.goto(new URL("/?view=overview", page.url()).href);
  await expect(otherPage.getByRole("heading", { name: "Start with what your kitchen needs.", exact: true })).toBeVisible();
  await isolated.close();
});

test("opening a study refresh restores its study context and browser Back returns once to Overview", async ({ page, context }) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const study = run("studies:save", { token, clientId: randomUUID(), id: null, expectedRevision: 0, term: "Rice", region: "Portland, OR, US", selectedIds: ["us-catalog-a"] });
  const refresh = run("research:reserveSearch", { token, clientId: randomUUID(), studyId: study.id, ingredient: "Rice", region: "Portland, OR, US" });
  run("research:finishSearch", { id: refresh.run.id, simulated: true, discarded: 0, warning: false, sources: [{ url: "https://supplier.test/refreshed-rice", title: "Fresh rice evidence", description: "Test-only update", markdown: "New rice supplier page", contentTruncated: false }] });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market&example=pe");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article").first().getByRole("button", { name: "Add to study", exact: true }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await page.locator("#overview-work").getByRole("button", { name: "Review findings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fresh rice evidence", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "My study 1", exact: true }).click();
  await expect(page.getByRole("article")).toContainText("Cascade Pantry");
  await expect(page.getByRole("article")).toContainText("USD");
  await page.goBack();
  await expect(page).toHaveURL(/view=overview/);
  expect(run("studies:list", { token })).toHaveLength(1);
  expect(run("research:list", { token })).toHaveLength(1);
});

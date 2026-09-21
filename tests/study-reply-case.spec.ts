import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

for (const webCandidate of [false, true]) test(`a reply opened from a ${webCandidate ? "web candidate" : "sample distributor"} updates its existing case comparison`, async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  let prospectId: string | undefined;
  if (webCandidate) {
    const reserved = run("research:reserveSearch", { token, clientId: randomUUID(), ingredient: "Arroz", region: "Lima" });
    run("research:finishSearch", { id: reserved.run.id, sources: [{ url: "https://supplier.test/rice", title: "Arroz distributor", description: "Synthetic rice source", markdown: null, contentTruncated: false }], discarded: 0, warning: false, simulated: true });
    prospectId = run("prospects:save", {token, runId: reserved.run.id, sourceIndex: 0, supplier: "Synthetic candidate", contact: "", confirmed: true}).id;
  }
  const study = run("studies:save", {
    token, clientId: randomUUID(), id: null, expectedRevision: 0,
    term: "Arroz", region: "Lima", selectedIds: webCandidate ? [] : ["distributor-c"], ...(prospectId ? {prospectIds: [prospectId]} : {}),
  });
  const caseId = run("sourcing:create", {
    token, studyId: study.id, objective: "Compare the supplier reply with the saved offers",
  });
  const comparison = run("comparisons:save", {
    token, sourcingCaseId: caseId, clientId: randomUUID(), id: null,
    expectedRevision: 0, request: riceRequest, offers: riceOffers.map((offer,index) => index === 1 ? {...offer,freightCents:null} : offer),
    selectedOfferId: riceOffers[0].id,
  });
  const messageId = randomUUID();
  const directory = mkdtempSync(join(tmpdir(), "study-reply-case-"));
  let requestId: string;
  try {
    const seed = (table: string, document: object) => {
      const path = join(directory, `${table}.json`);
      writeFileSync(path, JSON.stringify([document]));
      runLocalConvex(["import", "--append", "--table", table, path]);
    };
    const threadId = randomUUID();
    seed("quotationRequests", {
      ownerHash: createHash("sha256").update(token).digest("hex"),
      clientId: randomUUID(), ...(prospectId ? {prospectId} : {studyId: study.id, resultId: "distributor-c"}),
      recipient: null, inboxId: null, subject: "Synthetic study reply",
      text: "Synthetic inquiry for rice package terms.", state: "sent",
      simulated: true, revision: 3, idempotencyKey: randomUUID(),
      receipt: { messageId: randomUUID(), threadId }, failure: null,
      // Existing conversation predates the new question and its 30-second cooldown.
      createdAt: Date.now() - 60_000, updatedAt: Date.now() - 60_000,
    });
    requestId = run("quotationMail:list", { token })[0].id;
    seed("quotationReplies", {
      requestId, eventId: randomUUID(), messageId, threadId,
      from: "demo@example.test", receivedAt: new Date().toISOString(),
      text: "Distribuidor Respuesta: arroz blanco, saco de 18 kg a PEN 85. El flete es PEN 8 por pedido.",
    });
  } finally {
    rmSync(directory, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value), token,
  );
  await page.goto("/?view=market&example=pe");
  await page.getByRole("button", { name: /^My study/ }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open saved case comparison", exact: true })).toBeVisible();
  await expect(page.getByText("1 selected option in this study", {exact: true})).toBeVisible();
  await expect(page.getByRole("button", {name: "Open saved case comparison", exact: true})).toBeEnabled();
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await page.locator("#overview-work")
    .getByRole("listitem").filter({ hasText: "Compare the supplier reply with the saved offers" })
    .getByRole("button", { name: "Review supplier reply", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("view") === "followup"
    && url.searchParams.get("case") === caseId && url.searchParams.get("message") === requestId);
  const followupUrl = `/?view=followup&example=pe&case=${caseId}&message=${requestId}`;
  const mail = page.getByRole("dialog");
  await expect(mail).toContainText("Synthetic study reply");
  await expect(mail).toContainText("Distribuidor Respuesta: arroz blanco");
  // This supplier conversation must not offer actions for another supplier.
  await expect(mail.getByRole("button", {name: "Prepare delivery question"})).toHaveCount(0);
  await expect(mail.getByRole("button", {name: "Prepare minimum proposal"})).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to overview", exact: true }).click();
  await page.getByRole("button", { name: /^My study/ }).click();
  await expect(page.getByRole("button", { name: "Open saved case comparison", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Open saved case comparison", exact: true }).click();
  await expect(page.getByRole("button", {name: "Prepare delivery question"})).toBeVisible();
  await page.getByRole("button", {name: "Prepare delivery question"}).click();
  await expect(page.getByRole("dialog")).toContainText("Proveedor B");
  await page.keyboard.press("Escape");
  expect(run("quotationMail:list", {token}).find((request: {comparisonId?: string}) => request.comparisonId === comparison.id)?.decisionAction.kind).toBe("delivery");
  // Recover the same conversation directly without restoring or replacing the market study.
  await page.goto(followupUrl);
  await expect(page.getByRole("dialog")).toContainText("Synthetic study reply");
  await page.getByRole("button", { name: "Review as new offer", exact: true }).click();
  const review = page.getByRole("dialog");
  await review.getByLabel("Supplier", { exact: true }).fill("Distribuidor Respuesta");
  await review.getByLabel("Ingredient", { exact: true }).fill(riceRequest.ingredient);
  await review.getByLabel("Specification", { exact: true }).fill(riceRequest.specification);
  await review.getByLabel("Package size", { exact: true }).fill("18");
  await review.getByLabel("Package unit", { exact: true }).selectOption("kg");
  await review.getByLabel("Price per package", { exact: true }).fill("85");
  await review.getByLabel("Currency", { exact: true }).selectOption("PEN");
  await review.getByLabel("I confirm these details represent an offer in this reply").check();
  await review.getByRole("button", { name: "Continue with new offer", exact: true }).click();
  const merge = page.getByRole("dialog", { name: "Update the case comparison", exact: true });
  await merge.getByRole("checkbox").check();
  await merge.getByRole("button", { name: "Review updated comparison", exact: true }).click();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: "Save comparison changes", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  const saved = run("comparisons:list", { token });
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(comparison.id);
  expect(saved[0].revision).toBe(2);
  expect(saved[0].offers.map((offer: { id: string }) => offer.id)).toEqual([
    ...riceOffers.map((offer) => offer.id), `reply:${requestId!}:${messageId}`,
  ]);
  expect(saved[0].selectedOfferId).toBeNull();
  if (webCandidate) {
    await page.goto(followupUrl);
    await expect(page.getByRole("dialog")).toContainText("Synthetic study reply");
    await page.getByRole("button", {name: "Use reply to confirm delivery", exact: true}).click();
    const delivery = page.getByRole("dialog", {name: "Confirm delivery from this reply", exact: true});
    await delivery.getByLabel("Offer to update", {exact: true}).selectOption(`reply:${requestId!}:${messageId}`);
    await delivery.getByLabel("Delivery per order (PEN)", {exact: true}).fill("8");
    await delivery.getByLabel("Exact phrase confirming delivery", {exact: true}).fill("El flete es PEN 8 por pedido.");
    await delivery.getByRole("checkbox").check();
    await delivery.getByRole("button", {name: "Confirm delivery and save", exact: true}).click();
    await expect(page.getByLabel("Required quantity", {exact: true})).toHaveValue("10");
    await expect(page.getByRole("button", {name: "Save comparison changes", exact: true})).toBeVisible();
    expect(run("quotationMail:list", {token})).toHaveLength(2);
    const updated = run("comparisons:list", {token});
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(comparison.id);
    expect(updated[0].offers.at(-1).freightCents).toBe(800);
  }
  const detail = run("sourcing:get", { token, caseId });
  expect(detail.case.comparisonId).toBe(comparison.id);
  expect(detail.events.some((event: { kind: string }) => event.kind === "mail_reviewed")).toBe(true);
});

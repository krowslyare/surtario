import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("a reply opened directly from a study updates its existing case comparison", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const study = run("studies:save", {
    token, clientId: randomUUID(), id: null, expectedRevision: 0,
    term: "Arroz", region: "Lima", selectedIds: ["distributor-c"],
  });
  const caseId = run("sourcing:create", {
    token, studyId: study.id, objective: "Compare the supplier reply with the saved offers",
  });
  const comparison = run("comparisons:save", {
    token, sourcingCaseId: caseId, clientId: randomUUID(), id: null,
    expectedRevision: 0, request: riceRequest, offers: riceOffers,
    selectedOfferId: riceOffers[1].id,
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
      clientId: randomUUID(), studyId: study.id, resultId: "distributor-c",
      recipient: null, inboxId: null, subject: "Synthetic study reply",
      text: "Synthetic inquiry for rice package terms.", state: "sent",
      simulated: true, revision: 3, idempotencyKey: randomUUID(),
      receipt: { messageId: randomUUID(), threadId }, failure: null,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    requestId = run("quotationMail:list", { token })[0].id;
    seed("quotationReplies", {
      requestId, eventId: randomUUID(), messageId, threadId,
      from: "demo@example.test", receivedAt: new Date().toISOString(),
      text: "Distribuidor Respuesta: arroz blanco, saco de 18 kg a PEN 85. Entrega por confirmar.",
    });
  } finally {
    rmSync(directory, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value), token,
  );
  await page.goto("/?view=market&example=pe");
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open saved case comparison", exact: true })).toBeVisible();
  // Keep the case panel closed: this is the independent study mail entry point.
  await expect(page.getByRole("button", { name: "Open research case", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View request", exact: true }).click();
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
  const detail = run("sourcing:get", { token, caseId });
  expect(detail.case.comparisonId).toBe(comparison.id);
  expect(detail.events.some((event: { kind: string }) => event.kind === "mail_reviewed")).toBe(true);
});

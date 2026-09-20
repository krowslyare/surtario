import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { usRiceOffers, usRiceRequest } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

const session = () => createHash("sha256").update(randomUUID()).digest("hex");
const run = (name: string, args: object) => JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
function seed(table: string, documents: object[]) {
  const folder = mkdtempSync(join(tmpdir(), "messages-e2e-"));
  try {
    const path = join(folder, `${table}.json`);
    writeFileSync(path, JSON.stringify(documents));
    runLocalConvex(["import", "--append", "--table", table, path]);
  } finally { rmSync(folder, { recursive: true }); }
}
function requestDocument(token: string, subject: string, state: "sent" | "draft" | "uncertain", link: { comparisonId?: string; studyId?: string; resultId?: string }, updatedAt: number) {
  return {
    ownerHash: createHash("sha256").update(token).digest("hex"), clientId: randomUUID(), ...link,
    recipient: "supplier@example.test", inboxId: null, subject, text: "Please confirm rice package prices and delivery.",
    state, revision: 3, idempotencyKey: randomUUID(), simulated: true,
    receipt: state === "sent" ? { messageId: randomUUID(), threadId: randomUUID() } : null,
    failure: null, createdAt: updatedAt, updatedAt,
  };
}
function receive(request: { id: string; receipt: { threadId: string } }) {
  const messageId = randomUUID();
  seed("quotationReplies", [{ requestId: request.id, messageId, eventId: randomUUID(), threadId: request.receipt.threadId,
    from: "supplier@example.test", receivedAt: new Date().toISOString(),
    text: "Reply supplier: long-grain white rice, 25 lb bag at USD 20. Delivery and minimum order are not confirmed.",
  }]);
  return messageId;
}
async function reviewReply(page: Page) {
  await page.getByRole("button", { name: "Review as new offer", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare offer from reply", exact: true });
  await dialog.getByLabel("Supplier", { exact: true }).fill("Reply supplier");
  await dialog.getByLabel("Ingredient", { exact: true }).fill(usRiceRequest.ingredient);
  await dialog.getByLabel("Specification", { exact: true }).fill(usRiceRequest.specification);
  await dialog.getByLabel("Package size", { exact: true }).fill("25");
  await dialog.getByLabel("Package unit", { exact: true }).selectOption("lb");
  await dialog.getByLabel("Price per package", { exact: true }).fill("20");
  await dialog.getByLabel("Currency", { exact: true }).selectOption("USD");
  await dialog.getByLabel("I confirm these details represent an offer in this reply").check();
  await dialog.getByRole("button", { name: "Continue with new offer", exact: true }).click();
}

test("Messages receives replies reactively and changes a linked comparison only after review and save", async ({ page, context }) => {
  test.setTimeout(90_000);
  await connectOnlyToLocalBackend(context);
  const token = session();
  const caseId = run("sourcing:create", { token, ingredient: "Rice", region: "Portland, OR, US", objective: "Confirm supplier terms" });
  const comparison = run("comparisons:save", { token, sourcingCaseId: caseId, clientId: randomUUID(), id: null, expectedRevision: 0, request: usRiceRequest, offers: usRiceOffers, selectedOfferId: null });
  const now = Date.now();
  seed("quotationRequests", [
    requestDocument(token, "Waiting on rice terms", "sent", { comparisonId: comparison.id }, now - 120_000),
    requestDocument(token, "Unsent rice inquiry", "draft", { comparisonId: comparison.id }, now - 60_000),
    requestDocument(token, "Unconfirmed dispatch", "uncertain", { comparisonId: comparison.id }, now - 30_000),
  ]);
  const request = run("quotationMail:list", { token }).find((item: { subject: string }) => item.subject === "Waiting on rice terms");
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  const marketOffer = page.getByRole("article").filter({ hasText: "Cascade Pantry Supply" });
  await marketOffer.getByRole("button", { name: "Add to study", exact: true }).click();
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await expect(page).toHaveURL(/view=messages/);
  const main = page.locator("#messages-main");
  const rows = main.getByRole("list", { name: "Supplier messages" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Send unconfirmed");
  await main.getByRole("button", { name: "Drafts (1)", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Draft · not sent");
  await main.getByRole("button", { name: "Waiting (1)", exact: true }).click();
  await expect(rows).toHaveCount(1);
  const messageId = receive(request);
  await expect(main.getByRole("button", { name: "Waiting (0)", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Messages 1 reply to review", exact: true })).toBeVisible();
  expect(run("comparisons:list", { token })[0].offers).toEqual(usRiceOffers);
  expect(run("quotationMail:list", { token }).find((item: { id: string }) => item.id === request.id).replies[0].extractionStatus).toBe("idle");
  await main.getByRole("button", { name: "All (3)", exact: true }).click();
  await expect(rows.first()).toContainText("Waiting on rice terms");
  await rows.first().getByRole("button").click();
  const mail = page.getByRole("dialog");
  await expect(mail).toContainText("supplier@example.test");
  await expect(mail).toContainText("25 lb bag at USD 20");
  // Collapsing a reply should visibly travel through intermediate heights,
  // without recentering the entire dialog or leaving hidden actions focusable.
  const replyToggle = mail.getByRole("button", { name: "Latest reply", exact: true });
  await mail.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  const motion = await replyToggle.evaluate(async trigger => {
    const panel = document.getElementById(trigger.getAttribute("aria-controls")!)!;
    const heading = trigger.closest("dialog")!.querySelector(".dialog-head")!;
    const frames: { height: number; top: number }[] = [];
    const start = performance.now();
    frames.push({ height: panel.getBoundingClientRect().height, top: heading.getBoundingClientRect().top });
    (trigger as HTMLButtonElement).click();
    await new Promise<void>(resolve => {
      function sample() {
        frames.push({ height: panel.getBoundingClientRect().height, top: heading.getBoundingClientRect().top });
        if (performance.now() - start < 350) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    return frames;
  });
  expect(motion.some(frame => frame.height > 1 && frame.height < motion[0].height - 1)).toBe(true);
  expect(motion.at(-1)!.height).toBeLessThan(1);
  expect(Math.max(...motion.map(frame => frame.top)) - Math.min(...motion.map(frame => frame.top))).toBeLessThan(1);
  await expect(mail.getByRole("button", { name: "Review as new offer", exact: true })).toHaveCount(0);
  await replyToggle.press("Enter");
  await expect(replyToggle).toHaveAttribute("aria-expanded", "true");
  await expect(mail.getByRole("button", { name: "Review as new offer", exact: true })).toBeVisible();
  const sent = mail.getByRole("button", { name: "Sent request", exact: true });
  await expect(mail.getByRole("button", { name: "Copy for WhatsApp", exact: true })).toHaveCount(0);
  await sent.click();
  await expect(mail.getByRole("region", { name: "Sent request", exact: true }).getByRole("button", { name: "Copy for WhatsApp", exact: true })).toBeVisible();
  await sent.press("Space");
  await expect(sent).toBeFocused();
  await expect(mail.getByRole("button", { name: "Copy for WhatsApp", exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await mail.getByRole("button", { name: "Request history", exact: true }).click();
  await expect(mail.getByRole("region", { name: "Request history", exact: true })).toContainText("Prepared");
  expect(await mail.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(mail.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
  await mail.getByRole("button", { name: "Request history", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await mail.getByRole("button", { name: "Open supplier follow-up", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`view=followup&case=${caseId}`));
  await expect(page.getByRole("dialog", { name: "Supplier conversation", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to messages", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Waiting on rice terms");
  await page.keyboard.press("Escape");
  await main.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await expect(marketOffer.getByRole("button", { name: "In my study", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Messages 1 reply to review", exact: true }).click();
  await main.getByRole("button", { name: "Replies (1)", exact: true }).click();
  await rows.getByRole("button").click();
  await reviewReply(page);
  const merge = page.getByRole("dialog", { name: "Update your comparison", exact: true });
  await merge.getByRole("checkbox").check();
  await merge.getByRole("button", { name: "Review updated comparison", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`comparison=${comparison.id}.*fromMessage=${request.id}`));
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue(String(usRiceRequest.quantity));
  expect(run("comparisons:list", { token })[0].offers).toEqual(usRiceOffers);
  await page.getByRole("button", { name: "Save comparison changes", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  const saved = run("comparisons:list", { token })[0];
  expect(saved.offers).toHaveLength(3);
  expect(saved.offers.at(-1).id).toBe(`reply:${request.id}:${messageId}`);
  expect(saved.offers.at(-1).freightCents).toBeNull();
  await page.getByRole("button", { name: "Back to messages", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "View saved offer", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Review as new offer", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(rows.filter({ hasText: "Waiting on rice terms" })).toContainText("Reply details saved");
  await expect(page.getByRole("button", { name: "Messages", exact: true })).toBeVisible();
  await page.reload();
  await expect(rows.filter({ hasText: "Waiting on rice terms" })).toContainText("Reply details saved");
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("a study-only reply can create an offer and recover its saved comparison from Messages", async ({ page, context }) => {
  test.setTimeout(60_000);
  await connectOnlyToLocalBackend(context);
  const token = session();
  const study = run("studies:save", { token, clientId: randomUUID(), id: null, expectedRevision: 0, term: "Rice", region: "Portland, OR, US", selectedIds: ["us-distributor-c"] });
  seed("quotationRequests", [requestDocument(token, "Rice pack quotation", "sent", { studyId: study.id, resultId: "us-distributor-c" }, Date.now() - 60_000)]);
  const request = run("quotationMail:list", { token })[0];
  receive(request);
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto(`/?view=messages&message=${request.id}`);
  await expect(page.getByRole("dialog")).toContainText("Northwest Restaurant Goods");
  await reviewReply(page);
  await expect(page).toHaveURL(new RegExp(`view=comparison&fromMessage=${request.id}`));
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Save comparison", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to messages", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "View saved offer", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("dialog").getByRole("button", { name: "Open linked comparison", exact: true }).click();
  const saved = run("comparisons:list", { token })[0];
  await expect(page).toHaveURL(new RegExp(`comparison=${saved.id}.*fromMessage=${request.id}`));
  await expect(page.getByRole("button", { name: "Save comparison changes", exact: true })).toBeVisible();
  await page.getByLabel("Required quantity", { exact: true }).fill("53");
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("53");
});

test("Messages has an honest empty state and does not reveal another session's conversation", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const owner = session();
  const comparison = run("comparisons:save", { token: owner, clientId: randomUUID(), id: null, expectedRevision: 0, request: usRiceRequest, offers: usRiceOffers, selectedOfferId: null });
  seed("quotationRequests", [requestDocument(owner, "Private session subject", "draft", { comparisonId: comparison.id }, Date.now())]);
  const request = run("quotationMail:list", { token: owner })[0];
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), session());
  await page.goto(`/?view=messages&message=${request.id}`);
  await expect(page.getByRole("heading", { name: "Your supplier conversations start here" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("This conversation isn’t available in this browser");
  await expect(page.getByText("Private session subject")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("#messages-main").getByRole("button", { name: "Explore suppliers", exact: true }).click();
  await expect(page.locator("#market-main")).toBeVisible();
});

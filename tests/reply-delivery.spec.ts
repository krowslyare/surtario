import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import {
  assertLocalWebSocketUrl,
  connectOnlyToLocalBackend,
  runLocalConvex,
} from "./e2e-local";

for (const delayed of [false, true]) {
  test(`delivery reply preserves evidence and ${delayed ? "a newer draft after a delayed response" : "the recalculated comparison"}`, async ({
    page,
    context,
  }, testInfo) => {
    await connectOnlyToLocalBackend(context);
    const token = createHash("sha256").update(randomUUID()).digest("hex");
    const run = (name: string, args: object) =>
      JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
    const study = run("studies:save", {
      token,
      clientId: randomUUID(),
      id: null,
      expectedRevision: 0,
      term: "Arroz",
      region: "Lima",
      selectedIds: ["distributor-c"],
    });
    const caseId = run("sourcing:create", {
      token,
      studyId: study.id,
      objective: "Confirm delivery before choosing a rice supplier",
    });
    // For 10 kg: A costs PEN 40 + an unknown delivery charge; B costs PEN 50.
    // After confirming PEN 8 delivery, A's full order costs PEN 48.
    const offers = riceOffers.map((offer, index) =>
      index === 0
        ? { ...offer, priceCents: 4000, freightCents: null }
        : { ...offer },
    );
    const comparison = run("comparisons:save", {
      token,
      sourcingCaseId: caseId,
      clientId: randomUUID(),
      id: null,
      expectedRevision: 0,
      request: riceRequest,
      offers,
      selectedOfferId: riceOffers[1].id,
    });
    const before = run("comparisons:list", { token })[0];
    const messageId = randomUUID();
    const replyText = "El flete es PEN 8 por pedido.";
    const receivedAt = new Date().toISOString();
    const directory = mkdtempSync(join(tmpdir(), "reply-delivery-"));
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
        clientId: randomUUID(),
        comparisonId: comparison.id,
        recipient: null,
        inboxId: null,
        subject: "Synthetic rice delivery clarification",
        text: "Please confirm delivery per order for Proveedor A.",
        state: "sent",
        simulated: true,
        revision: 3,
        idempotencyKey: randomUUID(),
        receipt: { messageId: randomUUID(), threadId },
        failure: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      requestId = run("quotationMail:list", { token })[0].id;
      seed("quotationReplies", {
        requestId,
        eventId: randomUUID(),
        messageId,
        threadId,
        from: "demo@example.test",
        receivedAt,
        text: replyText,
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
    await context.addInitScript(
      (value) => localStorage.setItem("procurement-demo-session-v1", value),
      token,
    );
    let hold = false;
    const pending: Array<() => void> = [];
    await page.routeWebSocket(/.*/, (socket) => {
      assertLocalWebSocketUrl(socket.url());
      const server = socket.connectToServer();
      server.onMessage((message) => {
        if (hold) pending.push(() => socket.send(message));
        else socket.send(message);
      });
    });
    await page.goto("/?view=comparison&example=pe");
    await page
      .getByRole("button", { name: "Saved comparisons (1)", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open comparison", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View request", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Use reply to confirm delivery",
        exact: true,
      })
      .click();
    const review = page.getByRole("dialog", {
      name: "Confirm delivery from this reply",
      exact: true,
    });
    const save = review.getByRole("button", {
      name: "Confirm delivery and save",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await review
      .getByLabel("Offer to update", { exact: true })
      .selectOption(offers[0].id);
    await review
      .getByLabel("Delivery per order (PEN)", { exact: true })
      .fill("8");
    const quote = review.getByLabel("Exact phrase confirming delivery", {
      exact: true,
    });
    await quote.fill("Delivery is free.");
    const approval = review.getByRole("checkbox", {
      name: /I confirm this reply gives/,
    });
    await approval.check();
    await expect(save).toBeDisabled();
    await expect(
      review.getByText("Copy the exact phrase from the reply above.", {
        exact: true,
      }),
    ).toBeVisible();
    await quote.fill(replyText);
    await expect(approval).not.toBeChecked();
    await expect(save).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await review.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await review.screenshot({
      path: testInfo.outputPath("delivery-review-mobile.png"),
    });
    await approval.check();
    hold = delayed;
    await save.click();
    if (delayed) {
      await expect.poll(() => pending.length).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
      await page.getByLabel("Required quantity").fill("20");
      hold = false;
      for (const deliver of pending) deliver();
      await expect(
        page.getByText(
          "Delivery was saved to the previous comparison. Your current draft is preserved.",
        ),
      ).toBeVisible();
      await expect(page.getByLabel("Required quantity")).toHaveValue("20");
    }
    if (!delayed) {
      const result = page.getByRole("dialog", {
        name: "Delivery saved",
        exact: true,
      });
      await expect(
        result.getByRole("heading", { name: "Before", exact: true }),
      ).toBeVisible();
      await expect(
        result.getByRole("heading", { name: "Now", exact: true }),
      ).toBeVisible();
      await expect(result.getByRole("status")).toContainText("Proveedor A");

      await result.screenshot({
        path: testInfo.outputPath("delivery-saved-mobile.png"),
      });
    }
    const saved = run("comparisons:list", { token });
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(comparison.id);
    expect(saved[0].revision).toBe(before.revision + 1);
    expect(saved[0].request).toEqual(before.request);
    expect(saved[0].offers).toEqual([
      { ...offers[0], freightCents: 800 },
      offers[1],
    ]);
    expect(saved[0].selectedOfferId).toBeNull();
    expect(saved[0].sources[offers[1].id]).toEqual(
      before.sources[offers[1].id],
    );
    const evidence = run("quotationMail:listDeliveryConfirmations", {
      token,
      comparisonId: comparison.id,
    });
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      requestId: requestId!,
      messageId,
      offerId: offers[0].id,
      freightCents: 800,
      evidenceQuote: replyText,
      receivedAt,
      comparisonRevision: before.revision + 1,
      before: { recommendedOfferId: null },
      after: { recommendedOfferId: offers[0].id },
    });
    expect(
      evidence[0].after.alternatives.map(
        (offer: { totalCents: number }) => offer.totalCents,
      ),
    ).toEqual([4800, 5000]);
    const detail = run("sourcing:get", { token, caseId });
    expect(detail.case.comparisonId).toBe(comparison.id);
    expect(
      detail.events.filter(
        (event: { kind: string }) => event.kind === "delivery_confirmed",
      ),
    ).toHaveLength(1);

    if (!delayed)
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Done", exact: true })
        .click();
    await page.reload();
    await page
      .getByRole("button", { name: "Saved comparisons (1)", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open comparison", exact: true })
      .click();
    await page
      .getByRole("button", { name: "View request", exact: true })
      .click();
    const recovered = page.getByRole("dialog");
    await expect(
      recovered.getByRole("heading", {
        name: "Delivery confirmed",
        exact: true,
      }),
    ).toBeVisible();
    await expect(recovered.locator("blockquote")).toHaveText(replyText);
    await expect(
      recovered.getByText(/After confirmation:.*Proveedor A/),
    ).toBeVisible();
    await expect(
      recovered.getByRole("button", {
        name: "Use reply to confirm delivery",
        exact: true,
      }),
    ).toHaveCount(0);
  });
}

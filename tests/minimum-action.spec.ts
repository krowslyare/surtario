import { test, expect } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { usRiceOffers, usRiceRequest } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

for (const accepted of [true, false])
  test(`minimum proposal ${accepted ? "accepted" : "unchanged"} stays in its case and survives reload`, async ({
    page,
    context,
  }, testInfo) => {
    await connectOnlyToLocalBackend(context);
    const token = createHash("sha256").update(randomUUID()).digest("hex");
    const run = (name: string, args: object) =>
      JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
    const caseId = run("sourcing:create", {
      token,
      ingredient: "Rice",
      region: "Portland, OR, US",
      objective: "Review the minimum against the budget",
    });
    const comparison = run("comparisons:save", {
      token,
      sourcingCaseId: caseId,
      clientId: randomUUID(),
      id: null,
      expectedRevision: 0,
      request: usRiceRequest,
      offers: usRiceOffers.map((o, i) =>
        i === 0 ? { ...o, minimumPackages: 5 } : o,
      ),
      selectedOfferId: null,
    });
    await context.addInitScript(
      (value) => localStorage.setItem("procurement-demo-session-v1", value),
      token,
    );
    await page.goto("/?view=overview");
    await page.locator("#overview-work").getByRole("listitem").filter({ hasText: "Review the minimum against the budget" })
      .getByRole("button", { name: "Rice", exact: true }).click();
    await expect(page).toHaveURL(/view=followup.*case=/);
    await page
      .getByRole("button", { name: /(?:Open case|Review) comparison/, exact: true })
      .click();
    const advisor = page.getByRole("region", { name: "Purchasing advisor" });
    await advisor.getByText("Budget and preferences").click();
    await advisor.getByLabel("Available budget").fill("50");
    await page
      .getByRole("button", { name: "Prepare minimum proposal" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("minimum of 2 packs");
    await expect(dialog).not.toContainText("Supplier B");
    await page.keyboard.press("Escape");
    const request = run("quotationMail:list", { token })[0];
    const directory = mkdtempSync(join(tmpdir(), "minimum-reply-"));
    const reply = `We confirm a minimum of ${accepted ? 2 : 5} packs; other terms unchanged.`;
    try {
      const file = join(directory, "reply.json");
      writeFileSync(
        file,
        JSON.stringify([
          {
            requestId: request.id,
            eventId: randomUUID(),
            messageId: randomUUID(),
            threadId: "synthetic-thread",
            from: "demo@example.test",
            text: reply,
            receivedAt: new Date().toISOString(),
          },
        ]),
      );
      runLocalConvex([
        "import",
        "--append",
        "--table",
        "quotationReplies",
        file,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    await advisor.getByLabel("Available budget").fill("500");
    await page
      .getByRole("button", { name: "View request", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use reply to confirm minimum" })
      .click();
    await expect(page.getByRole("dialog")).toContainText("Budget USD 50.00");
    await page
      .getByLabel("Minimum packs", { exact: true })
      .fill(accepted ? "2" : "5");
    await page.getByLabel("Exact phrase confirming minimum").fill(reply);
    await page
      .getByLabel(
        "I confirm this reply gives the minimum number of packs for this offer.",
        { exact: false },
      )
      .check();
    await page
      .getByRole("button", { name: "Confirm minimum and save" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Minimum saved" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Supplier B");
    await expect(page.getByRole("dialog")).toContainText(
      accepted ? "5 → 2" : "5 → 5",
    );
    await expect(page.getByRole("dialog")).toContainText(
      accepted ? "USD 105.00 → USD 45.00" : "USD 105.00 → USD 105.00",
    );
    await expect(page.getByRole("dialog")).toContainText(
      accepted
        ? "Supplier A is now within your budget."
        : "Supplier A still exceeds your budget.",
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Supplier B remains the recommended option.",
    );
    if (accepted) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [1920, 320, 390]) {
        await page.setViewportSize({
          width,
          height: width === 1920 ? 1080 : 844,
        });
        await expect(page.getByRole("dialog")).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .getByRole("dialog")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`minimum-${width}.png`),
        });
      }
    }
    await page.getByRole("button", { name: "Done", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("total-0")).toHaveText(
      accepted ? "USD 45.00" : "USD 105.00",
    );
    const comparisonUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(comparisonUrl);
    await expect(page.getByTestId("total-0")).toHaveText(
      accepted ? "USD 45.00" : "USD 105.00",
    );
    const saved = run("comparisons:list", { token })[0];
    expect(saved.offers[0]).toEqual({
      ...comparison.offers[0],
      minimumPackages: accepted ? 2 : 5,
    });
    expect(saved.selectedOfferId).toBeNull();
    expect(
      run("sourcing:get", { token, caseId }).events.some(
        (e: { kind: string }) => e.kind === "minimum_confirmed",
      ),
    ).toBe(true);
  });

test("saved follow-up opens a case brief exposing unconfirmed delivery with complete numeric terms", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const run = (name: string, args: object) =>
    JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const caseId = run("sourcing:create", {
    token,
    ingredient: "Rice",
    region: "Portland, OR, US",
    objective: "Check delivery availability",
  });
  run("comparisons:save", {
    token,
    sourcingCaseId: caseId,
    clientId: randomUUID(),
    id: null,
    expectedRevision: 0,
    request: usRiceRequest,
    offers: usRiceOffers.map((o) => ({ ...o, deliveryConfirmed: false })),
    selectedOfferId: null,
  });
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?view=overview");
  const savedFollowup = page.locator("#overview-work").getByRole("listitem").filter({ hasText: "Check delivery availability" });
  await expect(savedFollowup).toContainText("Portland, OR, US");
  await savedFollowup.getByRole("button", { name: "Rice", exact: true }).click();
  await expect(page).toHaveURL(/view=followup.*case=/);
  const brief = page.getByRole("region", { name: "Case decision brief" });
  await expect(brief).toContainText(
    "Supplier A: Required delivery is not confirmed.",
  );
  await expect(brief).not.toContainText("Review the recommendation");
  await brief.getByText("Other conditions (1)", { exact: true }).click();
  await expect(brief).toContainText(
    "Supplier B: Required delivery is not confirmed.",
  );
});

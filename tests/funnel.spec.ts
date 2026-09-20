import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";
const run = (name: string, args: object) => JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));

test("unpriced result prepares a recoverable inquiry and reviewed reply without sending", async ({ page, context }) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await expect(page.getByRole("complementary", { name: "Study summary" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Your cases" })).toBeHidden();
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article", { name: "Result: Northwest Restaurant Goods · fictional example", exact: true }).getByRole("button", { name: "Prepare inquiry" }).click();
  const draft = page.getByRole("dialog", { name: "Review quote request", exact: true });
  await expect(draft).toContainText("Northwest Restaurant Goods");
  await expect(draft).toContainText("Portland, OR, US");
  await expect(draft.getByRole("button", { name: "Send test request" })).toBeDisabled();
  const request = run("quotationMail:list", { token })[0];
  expect(request.state).toBe("draft");
  expect(run("sourcing:list", { token })).toHaveLength(1);
  await page.reload();
  const hub = page.getByRole("region", { name: "Continue your work", exact: true });
  await expect(hub.getByRole("listitem")).toHaveCount(1);
  await hub.getByRole("button", { name: "Review inquiry", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Review quote request", exact: true })).toContainText("Northwest Restaurant Goods");
  // Inject a synthetic inbound reply through the local test fixture; no provider call.
  const directory = mkdtempSync(join(tmpdir(), "funnel-reply-"));
  try {
    const path = join(directory, "reply.json");
    writeFileSync(path, JSON.stringify([{ requestId: request.id, eventId: randomUUID(), messageId: randomUUID(), threadId: randomUUID(), from: "demo@example.test", receivedAt: new Date().toISOString(), text: "Northwest: long-grain white rice, 25 lb bag for USD 20. Delivery and taxes pending." }]));
    runLocalConvex(["import", "--append", "--table", "quotationReplies", path]);
  } finally { rmSync(directory, { recursive: true }); }
  await page.reload();
  await hub.getByRole("button", { name: "Review reply", exact: true }).click();
  await page.getByRole("button", { name: "Review as new offer", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Prepare offer from reply", exact: true });
  await review.getByLabel("Supplier", { exact: true }).fill("Northwest");
  await review.getByLabel("Ingredient", { exact: true }).fill("Rice");
  await review.getByLabel("Specification", { exact: true }).fill("Long-grain white rice");
  await review.getByLabel("Package size", { exact: true }).fill("25");
  await review.getByLabel("Package unit", { exact: true }).selectOption("lb");
  await review.getByLabel("Price per package", { exact: true }).fill("20");
  await review.getByLabel("Currency", { exact: true }).selectOption("USD");
  await review.getByRole("checkbox").check();
  await review.getByRole("button", { name: "Continue with new offer", exact: true }).click();
  await page.getByLabel("Required quantity").fill("40");
  await page.getByRole("button", { name: "Save comparison", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  await page.goto("/?view=market");
  await expect(hub.getByRole("listitem")).toHaveCount(1);
  const saved = run("comparisons:list", { token });
  expect(saved).toHaveLength(1);
  expect(saved[0].offers[0].priceCents).toBe(2000);
  expect(saved[0].offers[0].freightCents).toBeNull();
  expect(run("sourcing:list", { token })[0].comparisonId).toBe(saved[0].id);
  expect(run("quotationMail:list", { token })).toHaveLength(1);
});

test("direct calculation retains pending terms, exact package arithmetic and recovery", async ({ page }, testInfo) => {
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article", { name: "Result: Cascade Pantry Supply · fictional example", exact: true }).getByRole("button", { name: "Calculate purchase" }).click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await page.getByLabel("Required quantity").fill("40");
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await page.getByRole("button", { name: "Edit Cascade Pantry Supply · fictional example", exact: true }).click();
  await page.getByLabel("Minimum packs", { exact: true }).fill("1");
  await page.getByLabel("Delivery per order", { exact: true }).fill("4");
  await page.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page.getByRole("option", { name: "Final amounts, including tax", exact: true }).click();
  await page.getByLabel("The supplier can deliver when I need it").check();
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(page.getByTestId("total-0")).toHaveText("USD 44.00");
  const offer = page.getByRole("article", { name: "Offer from Cascade Pantry Supply · fictional example", exact: true });
  await expect(offer).toContainText("10 lb");
  await page.getByRole("button", { name: "Save comparison", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  await page.goto("/?view=market");
  await page.reload();
  const hub = page.getByRole("region", { name: "Continue your work", exact: true });
  await expect(hub.getByRole("listitem")).toHaveCount(1);
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const brand = await page.locator(".market-topbar .brand").boundingBox();
    const navigation = await page.getByRole("navigation", { name: "Main navigation" }).boundingBox();
    expect(brand && navigation && (navigation.y >= brand.y + brand.height || navigation.x >= brand.x + brand.width)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`continuity-${width}.png`), fullPage: true });
  }
  // The global continuity dialog must close before the comparison opens.
  await page.getByRole("button", { name: "Continue your work", exact: true }).click();
  await page.getByRole("dialog", { name: "Your recent work", exact: true }).getByRole("button", { name: "Resume calculation", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Your recent work", exact: true })).toBeHidden();
  await expect(page.getByLabel("Required quantity")).toHaveValue("40");
  await expect(page.getByTestId("total-0")).toHaveText("USD 44.00");
  await expect(offer).toContainText("10 lb");
});

for (const intent of ["inquiry", "research"] as const) {
  test(`public candidate continues ${intent} with reviewed context and recovers the original search`, async ({ page, context }) => {
    const token = createHash("sha256").update(randomUUID()).digest("hex");
    const reserved = run("research:reserveSearch", { token, clientId: randomUUID(), ingredient: "Rice", region: "Portland, OR, US" });
    // Synthetic evidence exercises the public-source branch without calling a provider.
    run("research:finishSearch", {
      id: reserved.run.id, simulated: false, discarded: 0, warning: false,
      sources: ["Test rice supplier", "Unselected source"].map((title, index) => ({
        url: `https://supplier.test/rice-${index}`, title, description: "Synthetic E2E source", markdown: null, contentTruncated: false,
      })),
    });
    await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
    await page.goto("/?view=market");
    const hub = page.getByRole("region", { name: "Continue your work", exact: true });
    await hub.getByRole("button", { name: "Review sources", exact: true }).click();
    const source = page.locator(".research-sources > article").filter({ hasText: "Test rice supplier" });
    if (intent === "research") await source.getByText("More options", { exact: true }).click();
    await source.getByRole("button", { name: intent === "inquiry" ? "Prepare inquiry" : "Research missing details", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Review potential distributor", exact: true });
    await expect(review.getByLabel("Potential distributor name")).toHaveValue("Test rice supplier");
    await review.getByLabel("Potential distributor name").fill("Reviewed rice distributor");
    await review.getByLabel("Contact found (optional)").fill("sales@supplier.test");
    await review.getByRole("checkbox").check();
    await review.getByRole("button", { name: intent === "inquiry" ? "Save and prepare inquiry" : "Save and continue research", exact: true }).click();
    if (intent === "inquiry") {
      await expect(page.getByRole("dialog", { name: "Review quote request", exact: true })).toContainText("Reviewed rice distributor");
    } else {
      await expect(page.getByRole("heading", { name: /Find public product specifications/ })).toBeVisible();
    }
    const savedCases = run("sourcing:list", { token });
    expect(savedCases).toHaveLength(1);
    expect(savedCases[0]).toMatchObject({ status: "idle", steps: 0, researchRunIds: [] });
    expect(run("quotationMail:list", { token })).toHaveLength(intent === "inquiry" ? 1 : 0);
    await page.reload();
    await expect(hub.getByRole("listitem")).toHaveCount(1);
    await hub.getByRole("button", { name: "Review source search", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Unselected source", exact: true })).toBeVisible();
    expect(run("research:list", { token })).toHaveLength(1);
    // A reopened source must reuse the saved candidate, including corrected fields.
    await source.getByText("More options", { exact: true }).click();
    await source.getByRole("button", { name: "View saved candidate", exact: true }).click();
    await expect(review.getByLabel("Potential distributor name")).toHaveValue("Reviewed rice distributor");
    await expect(review.getByLabel("Contact found (optional)")).toHaveValue("sales@supplier.test");
    await review.getByRole("button", { name: "Close", exact: true }).click();
    await source.getByRole("button", { name: "Prepare inquiry", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Review quote request", exact: true })).toContainText("Reviewed rice distributor");
    expect(run("prospects:list", { token })).toHaveLength(1);
  });
}

test("failed search remains an error until the user explicitly opens the demo", async ({ page, context }) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const reserved = run("research:reserveSearch", { token, clientId: randomUUID(), ingredient: "Rice", region: "Portland, OR, US" });
  run("research:failSearch", { id: reserved.run.id });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await page.getByRole("region", { name: "Continue your work", exact: true }).getByRole("button", { name: "Review sources", exact: true }).click();
  const results = page.getByRole("region", { name: "Web research", exact: true });
  await expect(results.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("article", { name: /Result: Cascade Pantry/ })).toHaveCount(0);
  await results.getByRole("button", { name: "Explore demo catalog", exact: true }).click();
  await expect(page.getByRole("article", { name: /Result: Cascade Pantry/ })).toBeVisible();
  expect(run("research:list", { token })[0].status).toBe("failed");
});

test("continuity keeps independent work separate and its bounded list keyboard accessible", async ({ page, context }, testInfo) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  const hub = page.getByRole("region", { name: "Continue your work", exact: true });
  await expect(hub.getByRole("heading", { name: "No saved work yet" })).toBeVisible();
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await hub.screenshot({ path: testInfo.outputPath(`continuity-empty-${width}.png`) });
  }
  run("sourcing:create", { token, ingredient: "Rice", region: "Portland, OR, US", objective: "Find smaller packs" });
  run("sourcing:create", { token, ingredient: "Rice", region: "Portland, OR, US", objective: "Check delivery schedule" });
  for (const ingredient of ["Lentils", "Limes", "Bread flour", "Chicken", "Chickpeas", "Cooking oil"]) {
    run("sourcing:create", { token, ingredient, region: "Portland, OR, US", objective: "Review available package sizes and published prices" });
  }
  await expect(hub.getByRole("listitem")).toHaveCount(8);
  await expect(hub.getByText("8 saved items", { exact: true })).toBeVisible();
  await expect(hub.getByRole("listitem").filter({ has: page.getByText("Rice", { exact: true }) })).toHaveCount(2);
  const scroll = hub.getByRole("group", { name: "Saved work", exact: true });
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await scroll.evaluate(element => element.clientHeight <= 360 && element.scrollHeight > element.clientHeight)).toBe(true);
    await hub.screenshot({ path: testInfo.outputPath(`continuity-many-${width}.png`) });
  }
  await scroll.focus();
  await scroll.press("End");
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const resume = hub.getByRole("listitem").filter({ hasText: "Find smaller packs" }).getByRole("button", { name: "Continue research", exact: true });
  await resume.focus();
  await expect(resume).toBeInViewport();
  await resume.press("Enter");
  await expect(page.getByRole("heading", { name: "Find smaller packs", exact: true })).toBeVisible();
});


test("resuming a different ingredient clears only the working selection", async ({ page, context }) => {
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const reserved = run("research:reserveSearch", { token, clientId: randomUUID(), ingredient: "Lentils", region: "Portland, OR, US" });
  run("research:finishSearch", {
    id: reserved.run.id, simulated: false, discarded: 0, warning: false,
    sources: [{ url: "https://supplier.test/lentils", title: "Test lentil supplier", description: "Synthetic E2E source", markdown: null, contentTruncated: false }],
  });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article", { name: "Result: Cascade Pantry Supply · fictional example", exact: true }).getByRole("button", { name: "Add to study", exact: true }).click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved (1)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue your work", exact: true }).click();
  await page.getByRole("dialog", { name: "Your recent work", exact: true }).getByRole("button", { name: "Review sources", exact: true }).click();
  await expect(page.getByRole("button", { name: "My study", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Test lentil supplier", exact: true }).waitFor();
  await page.getByRole("button", { name: "Prepare inquiry", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review potential distributor", exact: true });
  await review.getByRole("checkbox").check();
  await review.getByRole("button", { name: "Save and prepare inquiry", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Review quote request", exact: true })).toContainText("Lentils");
  const studies = run("studies:list", { token });
  expect(studies).toHaveLength(2);
  expect(studies.some((study: { selectedIds: string[] }) => study.selectedIds.length === 1)).toBe(true);
});

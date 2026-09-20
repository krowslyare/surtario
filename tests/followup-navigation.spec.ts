import { test, expect } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";
import { usRiceRequest, usRiceOffers } from "../fixtures/procurement";

test("follow-up is a recoverable destination and preserves the market draft", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const run = (name: string, args: object) => JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const caseId = run("sourcing:create", { token, ingredient: "Rice", region: "Portland, OR, US", objective: "Confirm delivery before choosing a supplier" });
  const comparison = run("comparisons:save", { token, sourcingCaseId: caseId, clientId: randomUUID(), id: null, expectedRevision: 0, request: usRiceRequest, offers: usRiceOffers.map(offer => ({ ...offer, deliveryConfirmed: false })), selectedOfferId: null });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article").filter({ hasText: "Cascade Pantry Supply" }).getByRole("button", { name: "Add to study", exact: true }).click();
  await page.getByRole("button", { name: "Continue your work", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Open follow-up", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`view=followup&case=${caseId}`));
  const followup = page.locator("#followup-main");
  await expect(followup.getByRole("heading", { name: "Rice", exact: true })).toBeVisible();
  await expect(page.locator("#market-main")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Take the research further" })).toHaveCount(0);
  await followup.getByRole("button", { name: "Other conditions (1)" }).press("Enter");
  await expect(followup.getByRole("button", { name: "Other conditions (1)" })).toHaveAttribute("aria-expanded", "true");
  await followup.getByRole("button", { name: /Open (case )?comparison/, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`comparison=${comparison.id}.*fromCase=${caseId}`));
  await page.getByRole("button", { name: "Back to follow-up", exact: true }).click();
  await expect(followup).toBeVisible();
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await expect(page.locator("#market-main")).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Cascade Pantry Supply" }).getByRole("button", { name: "In my study", exact: true })).toBeVisible();
  await page.goForward();
  await expect(followup).toBeVisible();
  await page.reload();
  await expect(followup.getByRole("heading", { name: "Confirm delivery before choosing a supplier", exact: true })).toBeVisible();
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await followup.getByRole("button", { name: "Messages", exact: true }).click();
  await expect(followup.getByText(/No messages yet/)).toBeVisible();
  await followup.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(followup.getByRole("region", { name: "Case history" })).toBeVisible();
  await expect(followup.getByRole("region", { name: "Next step for this case" })).toBeHidden();
  await page.goto("/?view=followup&case=unavailable");
  await expect(page.getByRole("heading", { name: "This follow-up isn’t available." })).toBeVisible();
});

test("browser Back restores the correct unsaved comparison rather than a later one", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const comparison = JSON.parse(runLocalConvex(["run", "comparisons:save", JSON.stringify({ token, clientId: randomUUID(), id: null, expectedRevision: 0, request: { ...usRiceRequest, quantity: 75 }, offers: usRiceOffers, selectedOfferId: null })]));
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=comparison");
  await page.getByLabel("Required quantity", { exact: true }).click();
  await page.getByLabel("Required quantity", { exact: true }).fill("53");
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("53");
  await page.getByRole("button", { name: "Back to market study", exact: true }).click();
  await page.getByRole("button", { name: "Resume calculation", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`comparison=${comparison.id}`));
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("75");
  await page.goBack();
  await expect(page.locator("#market-main")).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("53");
  await expect(page).not.toHaveURL(/comparison=/);
  await page.reload();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue("53");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await expect(page.getByLabel("Required quantity", { exact: true })).toHaveValue(String(usRiceRequest.quantity));
});


test("research question opens in context, preserves the market on cancel and navigates only after saving", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  const offer = page.getByRole("article").filter({ hasText: "Cascade Pantry Supply" });
  await offer.getByRole("button", { name: "Add to study", exact: true }).click();
  const entry = page.getByRole("button", { name: "Research a question", exact: true });
  await expect(page.locator(".market-results-heading")).toContainText("Research a question");
  // An unsubmitted search edit must not change the research question's context.
  await page.getByRole("button", { name: "Change search", exact: true }).click();
  await page.getByRole("textbox", { name: "Ingredient or category", exact: true }).fill("Limes");
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await entry.click();
  const dialog = page.getByRole("dialog", { name: "Research a question", exact: true });
  await expect(page).toHaveURL(/view=market$/);
  await expect(dialog.getByRole("textbox", { name: "Ingredient", exact: true })).toHaveValue("Rice");
  await expect(dialog.getByRole("textbox", { name: "Delivery area", exact: true })).toHaveValue("Portland, OR, US");
  const question = "Find bulk pack sizes for this ingredient";
  await dialog.getByRole("textbox", { name: "What would you like to find out?" }).fill(question);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(entry).toBeFocused();
  await expect(offer.getByRole("button", { name: "In my study", exact: true })).toBeVisible();
  await entry.click();
  await expect(dialog.getByRole("textbox", { name: "What would you like to find out?" })).toHaveValue(question);
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog.getByRole("button", { name: "Save research question" })).toBeInViewport();
  }
  await dialog.getByRole("button", { name: "Save research question" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/view=followup&case=/);
  await expect(page.getByRole("heading", { name: question, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await expect(offer.getByRole("button", { name: "In my study", exact: true })).toBeVisible();
});


test("a question from My study keeps its ingredient after a different search", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article").filter({ hasText: "Cascade Pantry Supply" }).getByRole("button", { name: "Add to study", exact: true }).click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved (1)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change search", exact: true }).click();
  await page.getByRole("textbox", { name: "Ingredient or category", exact: true }).fill("Limes");
  await page.getByRole("button", { name: "Explore demo catalog", exact: true }).click();
  await page.getByRole("button", { name: /^My study/ }).click();
  await page.getByRole("button", { name: "Research a question", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Research a question", exact: true });
  await expect(dialog).toContainText("Rice · Portland, OR, US");
  await dialog.getByRole("textbox", { name: "What would you like to find out?" }).fill("Compare pack sizes for my saved rice study");
  await dialog.getByRole("button", { name: "Save research question" }).click();
  await expect(page.locator("#followup-main").getByRole("heading", { name: "Rice", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open supplier follow-up", exact: true })).toBeVisible();
});

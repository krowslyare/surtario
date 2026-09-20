import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

// Synthetic provider checkpoints, real local Convex subscriptions. No search action or paid calls.
test("local Convex progress updates in place and survives reopening after reload", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  const run = (name: string, args: object) => {
    const output = runLocalConvex(["run", name, JSON.stringify(args)]);
    return output.trim() ? JSON.parse(output) : null;
  };
  const { run: reserved } = run("research:reserveSearch", { token, clientId: crypto.randomUUID(), ingredient: "Progress verification rice", region: "Portland, OR, US" });
  const progress = { stage: "searching", searchesCompleted: 1, searchesTotal: 3, candidates: 2, pagesChecked: 0, currentHost: null };
  run("research:updateProgress", { id: reserved.id, progress });
  await page.addInitScript(token => localStorage.setItem("procurement-demo-session-v1", token), token);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "View search progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Finding your options." })).toBeVisible();
  run("research:updateProgress", { id: reserved.id, progress: { ...progress, stage: "reading", searchesCompleted: 3, candidates: 8, pagesChecked: 3, currentHost: "supplier.com" } });
  const region = page.getByRole("region", { name: "Search progress", exact: true });
  await expect(region).toContainText("8 candidate sources · 3 pages checked");
  await expect(region).toContainText("supplier.com");
  run("research:publishSource", { id: reserved.id, source: { url: "https://supplier.com/products/rice", title: "Rice wholesale source", description: "Source for test", markdown: "Rice 50 lb bag USD 25.00. Delivery pending.", contentTruncated: false } });
  await expect(page.getByLabel("Sources arriving")).toContainText("Rice wholesale source");
  await expect(page.getByLabel("Sources arriving")).toContainText("Source read");

  await page.reload();
  await page.getByRole("button", { name: "View search progress", exact: true }).click();
  await expect(region).toContainText("8 candidate sources · 3 pages checked");
  await expect(page.getByLabel("Sources arriving")).toContainText("Rice wholesale source");
  run("research:finishSearch", { id: reserved.id, sources: [], discarded: 0, warning: false, simulated: true });
  await expect(region).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No usable sources were retrieved" })).toBeVisible();
});

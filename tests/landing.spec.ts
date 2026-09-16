import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({ context }) => { await connectOnlyToLocalBackend(context); });

test("the product entrance explains a decision and leads to the workspace", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good ingredients.Better decisions.");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Explore rice example" })).toHaveCount(0);
  const example = page.getByRole("region", { name: "Interactive purchasing example" });
  await expect(example).toContainText("the order total stays pending");
  await page.getByRole("button", { name: "Reveal sample reply" }).click();
  await expect(example).toContainText("Sample reply: USD 3.00 delivery.");
  await expect(example).toContainText("Rose City totals USD 38.00 — USD 2.00 below");
  await expect(example.getByRole("button")).toBeFocused();
  await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Replay example" }).click();
  await expect(example).toContainText("the order total stays pending");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width > 760 ? 900 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: "Start sourcing" })).toBeInViewport();
    await page.screenshot({ path: `.impeccable/review/${width === 390 ? "mobile" : `user-${width}`}.png`, fullPage: true, animations: "disabled" });
  }
  await page.getByRole("link", { name: "Start sourcing" }).click();
  await expect(page).toHaveURL(/view=market/);
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "Start sourcing" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("landing controls support keyboard and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Open workspace" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Start sourcing" })).toBeFocused();
  await page.keyboard.press("Tab");
  const reveal = page.getByRole("button", { name: "Reveal sample reply" });
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Replay example" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".landing-answer").evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s");
});

test("branded arrival follows loading and leaves when the workspace is ready", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/src/Workspace.tsx", async route => { await gate; await route.continue(); });
  await page.goto("/?view=market", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText("Loading your workspace");
  await expect(page.locator(".workspace-arrival")).toContainText("Good ingredients. Better decisions.");
  release();
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await expect(page.locator(".workspace-arrival")).toHaveCount(0);
});

test("failed workspace download offers a retry instead of indefinite loading", async ({ page }) => {
  await page.route("**/src/Workspace.tsx", route => route.abort());
  await page.goto("/?view=market", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("Loading your workspace.")).toHaveCount(0);
});

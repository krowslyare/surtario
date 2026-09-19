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
  const demoImage = page.locator(".landing-demo-backdrop");
  await demoImage.scrollIntoViewIfNeeded();
  await expect.poll(() => demoImage.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Replay example" }).click();
  await expect(example).toContainText("the order total stays pending");
  for (const width of [1920, 1440, 390, 320]) {
    await page.setViewportSize({ width, height: width > 760 ? 900 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: "Start sourcing" }).first()).toBeInViewport();
    await page.screenshot({ path: `.impeccable/review/${width === 390 ? "mobile" : `user-${width}`}.png`, fullPage: true, animations: "disabled" });
    await page.locator(".landing-start").screenshot({ path: `.impeccable/review/prototype-${width}.png`, animations: "disabled" });
    const stageHeight = await page.locator(".landing-flow-stage").evaluate(el => el.getBoundingClientRect().height);
    const alignment = await page.getByRole("tab").evaluateAll(tabs => tabs.map(tab => {
      const number = tab.querySelector(".landing-step-number")!.getBoundingClientRect();
      const title = tab.querySelector("strong")!;
      return { x: number.x, offset: number.y + number.height / 2 - title.getBoundingClientRect().y - parseFloat(getComputedStyle(title).lineHeight) / 2 };
    }));
    expect(new Set(alignment.map(item => item.x)).size).toBe(1);
    for (const item of alignment) expect(Math.abs(item.offset)).toBeLessThan(0.5);
    for (const name of ["Keep the evidence", "Clear up the unknowns", "Decide when you’re ready"]) {
      await page.getByRole("tab", { name: new RegExp(name) }).click();
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      expect(await page.locator(".landing-flow-stage").evaluate(el => el.getBoundingClientRect().height)).toBe(stageHeight);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.locator(".landing-flow").screenshot({ path: `.impeccable/review/flow-${name.split(" ")[0]}-${width}.png`, animations: "disabled" });
    }
    await expect(page.getByRole("tabpanel")).toContainText("USD 38.00");
    await page.getByRole("tab", { name: /Find your options/ }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.getByRole("link", { name: "Start sourcing" }).first().click();
  await expect(page).toHaveURL(/view=market/);
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "Start sourcing" }).first()).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Start sourcing" }).first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "See how Surtario works" })).toBeFocused();
  await page.keyboard.press("Tab");
  const reveal = page.getByRole("button", { name: "Reveal sample reply" });
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Replay example" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".landing-answer").evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tab", { name: /Find your options/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: /Keep the evidence/ })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Source, review date and your selection stay together.");
  expect(await page.getByRole("tabpanel").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Decide when you’re ready/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("USD 38.00");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tabpanel")).toContainText("Price on request");
  await page.getByText("Can I return to my work later?", { exact: true }).click();
  await expect(page.getByText(/clearing its site data removes access to saved work/)).toBeVisible();
});

test("branded arrival follows loading and leaves when the workspace is ready", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/src\/Workspace\.tsx(?:\?.*)?$/, async route => { await gate; await route.continue(); });
  await page.goto("/?view=market", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toContainText("Loading your workspace");
  await expect(page.locator(".workspace-arrival")).toContainText("Good ingredients. Better decisions.");
  release();
  await expect(page.getByRole("button", { name: "Explore rice example" })).toBeVisible();
  await expect(page.locator(".workspace-arrival")).toHaveCount(0);
});

test("failed workspace download offers a retry instead of indefinite loading", async ({ page }) => {
  await page.route(/\/src\/Workspace\.tsx(?:\?.*)?$/, route => route.abort());
  await page.goto("/?view=market", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("Loading your workspace.")).toHaveCount(0);
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`arrival blocks hidden workspace keyboard access (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.clock.install();
    await page.goto("/?view=market");
    const content = page.locator(".workspace-content");
    await expect(content.locator("button").first()).toBeAttached();
    await expect(content).toHaveAttribute("inert", "");
    await expect(content).toHaveAttribute("aria-hidden", "true");
    await page.keyboard.press("Tab");
    expect(await content.evaluate(el => el.contains(document.activeElement))).toBe(false);
    await page.clock.fastForward(2100);
    await expect(page.locator(".workspace-arrival")).toHaveCount(0);
    await expect(content).not.toHaveAttribute("inert");
    await expect(content).not.toHaveAttribute("aria-hidden");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
}

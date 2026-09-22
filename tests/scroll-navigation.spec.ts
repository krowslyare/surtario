import { expect, test, type Page } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));

async function observeScroll(page: Page) {
  return page.evaluate(() => {
    const samples: number[] = [window.scrollY];
    Object.assign(window, { navigationScrollSamples: samples });
    const until = performance.now() + 1800;
    const sample = () => {
      samples.push(window.scrollY);
      if (performance.now() < until) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    return window.scrollY;
  });
}

async function expectMotion(page: Page, start: number, end: number, reduced: boolean) {
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(end, 0);
  const samples = await page.evaluate(() =>
    (window as unknown as { navigationScrollSamples: number[] }).navigationScrollSamples);
  const low = Math.min(start, end) + 5;
  const high = Math.max(start, end) - 5;
  expect(Math.abs(start - end)).toBeGreaterThan(200);
  expect(samples.some(y => y > low && y < high)).toBe(!reduced);
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`landing walkthrough scroll preserves focus and fragment (${reducedMotion})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    const link = page.getByRole("link", { name: "See how Surtario works" });
    await link.focus();
    const target = page.locator("#how-it-works");
    const end = await target.evaluate(el => el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(el).scrollMarginTop));
    const start = await observeScroll(page);
    await link.press("Enter");
    await expect(target).toBeFocused();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expectMotion(page, start, end, reducedMotion === "reduce");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tab", { name: /Find your options/ })).toBeFocused();
  });

  for (const width of [1440, 390]) {
    test(`return to supplier search scrolls without a focus jump (${reducedMotion}, ${width})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion });
      await page.goto("/?view=market");
      await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
      await expect(page.getByRole("article", { name: /Result: Cascade Pantry/ })).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
      const explore = page.getByRole("button", { name: width === 390 ? "Change search" : "Suppliers", exact: true });
      await explore.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
      const start = await observeScroll(page);
      await explore.press("Enter");
      const input = page.locator("#market-search input").first();
      await expect(input).toBeFocused();
      const end = await page.locator("#market-search").evaluate(el =>
        Math.max(0, el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)));
      await expectMotion(page, start, end, reducedMotion === "reduce");
      await expect(input).toBeInViewport();
    });
  }
}

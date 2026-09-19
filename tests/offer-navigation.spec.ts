import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({ context }) => {
  await connectOnlyToLocalBackend(context);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`offer review scroll respects ${reducedMotion} and moves keyboard focus`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/?view=comparison");
    await expect(page.locator(".workspace-content")).not.toHaveAttribute("inert");
    await page.getByLabel("Required quantity").fill("");
    const link = page.getByRole("link", { name: "Review offer details", exact: true });
    await link.focus();
    const before = await page.evaluate(() => window.scrollY);
    const target = await page.locator("#comparison").evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    expect(before - target).toBeGreaterThan(200);
    // Observe rendered positions, rather than merely asserting a scroll API call.
    await page.evaluate(() => {
      const samples: number[] = [];
      Object.assign(window, { offerScrollSamples: samples });
      const until = performance.now() + 1800;
      const sample = () => {
        samples.push(window.scrollY);
        if (performance.now() < until) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await link.press("Enter");
    await expect(page.locator("#comparison")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(target, 0);
    const samples = await page.evaluate(() => (window as unknown as { offerScrollSamples: number[] }).offerScrollSamples);
    const intermediate = samples.filter(y => y < before - 5 && y > target + 5);
    expect(intermediate.length > 0).toBe(reducedMotion === "no-preference");
    await expect(page.getByRole("heading", { name: "Compare offers on equal terms" })).toBeInViewport();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Add offer", exact: true })).toBeFocused();
  });
}

test("four offers reflow without overflow on desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/?view=comparison");
  for (const supplier of ["Supplier C", "Supplier D"]) {
    await page.getByRole("button", { name: "Add offer", exact: true }).click();
    await page.getByLabel("Supplier", { exact: true }).fill(supplier);
    await page.getByRole("button", { name: "Save offer", exact: true }).click();
  }
  const offers = page.locator(".offers-grid > article");
  await expect(offers).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Add offer", exact: true })).toBeDisabled();
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.mouse.move(0, 0);
    await offers.evaluateAll(async elements => {
      await Promise.all(elements.flatMap(el => el.getAnimations().map(animation => animation.finished)));
    });
    const boxes = await offers.evaluateAll(elements => elements.map(el => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height };
    }));
    if (width === 1920) {
      expect(boxes[1].y).toBe(boxes[0].y);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
      expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
    } else {
      for (let i = 1; i < boxes.length; i++) {
        expect(boxes[i].x).toBe(boxes[0].x);
        expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator("#comparison").screenshot({ path: testInfo.outputPath(`four-offers-${width}.png`) });
  }
});

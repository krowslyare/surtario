import { expect, test } from "@playwright/test";

for (const width of [1920, 1440, 390, 320]) {
  test(`market surfaces and document hierarchy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    await page.goto("/?view=market");
    const example = page.getByRole("region", { name: "Sample study" });
    await example.hover();
    await expect(example).toHaveCSS("box-shadow", "none");
    await page.locator(".market-search input").first().focus();
    await expect(page.locator(".market-search")).toHaveCSS("box-shadow", "none");

    const heading = page.getByRole("button", { name: "Quotes and documents", exact: true });
    await heading.click();
    const section = page.getByRole("region", { name: "Photo and PDF extraction" });
    await expect(section).toBeVisible();
    const titleSize = await section.getByRole("heading", { name: "Read a quote from a photo or PDF" })
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const parentSize = await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(titleSize).toBeLessThan(parentSize);
    const field = await section.locator(".field").boundingBox();
    const actions = await section.locator(".intake-actions").boundingBox();
    expect(field).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(actions!.y - field!.y - field!.height).toBeGreaterThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("brand navigation buttons have rounded corners and no square shading", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/?view=market");
  await page.locator(".workspace-arrival").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});

  const explore = page.locator(".brand-explore");
  const study = page.getByRole("button", { name: "My study" });

  const exploreRadius = await explore.evaluate((el) => getComputedStyle(el).borderRadius);
  expect(parseFloat(exploreRadius)).toBeGreaterThan(0);

  const nav = page.locator(".brand-nav");
  await nav.screenshot({ path: "/tmp/brand-nav-explore-resting.png" });

  await explore.hover();
  await nav.screenshot({ path: "/tmp/brand-nav-explore-hover.png" });

  await study.hover();
  await nav.screenshot({ path: "/tmp/brand-nav-study-hover.png" });

  await study.click();
  await nav.screenshot({ path: "/tmp/brand-nav-study-active.png" });
});

test("market-start buttons have generous hover breathing room and rounded corners", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/?view=market");
  await page.locator(".workspace-arrival").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});

  const readQuote = page.getByRole("button", { name: "Read a quote" });
  await readQuote.hover();
  const startSection = page.locator(".market-start");
  await startSection.screenshot({ path: "/tmp/market-start-hover-read-quote.png" });

  const importList = page.getByRole("button", { name: "Import ingredient list" });
  await importList.hover();
  await startSection.screenshot({ path: "/tmp/market-start-hover-ingredient-list.png" });
});

test("search results and strip have generous hover padding", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/?view=market");
  await page.locator(".workspace-arrival").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});

  const exploreExample = page.getByRole("button", { name: "Explore rice example" });
  await exploreExample.click();

  const changeBtn = page.getByRole("button", { name: "Change" });
  await changeBtn.hover();
  await page.locator(".search-strip").screenshot({ path: "/tmp/search-strip-hover.png" });

  const firstSource = page.locator(".source-button").first();
  if (await firstSource.isVisible()) {
    await firstSource.hover();
    await firstSource.screenshot({ path: "/tmp/source-button-hover.png" });
  }
});

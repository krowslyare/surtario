import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test("mobile document tools remain reachable by keyboard and preserve the review draft", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?example=pe");
  expect(
    await page
      .locator(".market-intro")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");

  const listTools = page.getByRole("button", { name: "Ingredient list", exact: true });
  await listTools.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add list or file" }).focus();
  await expect(page.getByRole("button", { name: "Add list or file" })).toBeInViewport();
  const disclosure = page.getByRole("button", { name: "Quotes and documents", exact: true });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const trigger = page.getByRole("button", {
    name: "Review sample quote",
  });
  await trigger.click();
  await page.getByLabel("Package size").fill("18");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await disclosure.click();
  await expect(trigger).not.toBeVisible();
  await disclosure.click();
  await trigger.click();
  await expect(page.getByLabel("Package size")).toHaveValue("18");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
});

test("Enter uses enabled web research while the example remains an explicit separate action", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const entry = await (await page.request.get("/src/main.tsx")).text();
  const reactUrl = entry.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
  // Replace only the research boundary: no provider call or provider credentials.
  await page.route(/\/src\/components\/LiveResearch\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `import React from ${JSON.stringify(reactUrl)};
      export function ResearchWorkspace() { return null; }
      export default function Research({onStatus,request}) {
        React.useEffect(() => onStatus({searchEnabled:true,extractionEnabled:false}), [onStatus]);
        return React.createElement('output', {'aria-label':'Test web request'}, JSON.stringify(request));
      }`,
    }),
  );
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to study" })
    .click();
  await page.getByRole("button", { name: "Change search", exact: true }).click();
  await page.getByLabel("Ingredient or category").fill("Pescado");
  const search = page.getByRole("button", {
    name: "Search suppliers",
    exact: true,
  });
  await expect(search).toBeEnabled();
  await page.getByLabel("Ingredient or category").press("Enter");
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 1, ingredient: "Pescado", region: "Lima" }),
  );
  await expect(
    page.getByRole("heading", { name: "Arroz in Lima" }),
  ).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#market-results")).toBeFocused();

  await page.getByRole("button", { name: "My study", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "My market study" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: /View example source/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Ficha de arroz A");
  await expect(page.getByRole("dialog")).toContainText(
    "This is sample data, not a live search result.",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Back to results" }).click();
  await expect(page.getByLabel("Test web request")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);

  await page.getByRole("button", { name: "Change search", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore example", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No examples match this search" }),
  ).toBeVisible();
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 1, ingredient: "Pescado", region: "Lima" }),
  );
  await page.getByRole("button", { name: "Change search", exact: true }).click();
  await page.getByLabel("Ingredient or category").fill("Arroz");
  await search.click();
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 2, ingredient: "Arroz", region: "Lima" }),
  );
});

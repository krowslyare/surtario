import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test("mobile document tools remain reachable by keyboard and preserve the review draft", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".market-intro")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");

  const shortcut = page.getByRole("link", { name: "Usar lista o archivo" });
  await shortcut.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Añadir lista o archivo" }),
  ).toBeInViewport();

  const disclosure = page
    .locator("summary")
    .filter({ hasText: "Revisar una cotización" });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  const trigger = page.getByRole("button", {
    name: "Revisar ejemplo de cotización",
  });
  await trigger.click();
  await page.getByLabel("Contenido por presentación").fill("18");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await disclosure.click();
  await expect(trigger).not.toBeVisible();
  await disclosure.click();
  await trigger.click();
  await expect(page.getByLabel("Contenido por presentación")).toHaveValue("18");
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
  await page.route("**/src/components/LiveResearch.tsx", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `import React from ${JSON.stringify(reactUrl)};
      export default function Research({onStatus,request}) {
        React.useEffect(() => onStatus({searchEnabled:true,extractionEnabled:false}), [onStatus]);
        return React.createElement('output', {'aria-label':'Test web request'}, JSON.stringify(request));
      }`,
    }),
  );
  await page.goto("/");
  await page.getByLabel("Insumo o categoría").fill("Pescado");
  const search = page.getByRole("button", {
    name: "Buscar en la web",
    exact: true,
  });
  await expect(search).toBeEnabled();
  await page.getByLabel("Insumo o categoría").press("Enter");
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 1, ingredient: "Pescado", region: "Lima" }),
  );
  await page
    .getByRole("button", { name: "Explorar ejemplo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No hay ejemplos para esta búsqueda" }),
  ).toBeVisible();
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 1, ingredient: "Pescado", region: "Lima" }),
  );
  await page.getByLabel("Insumo o categoría").fill("Arroz");
  await search.click();
  await expect(page.getByLabel("Test web request")).toHaveText(
    JSON.stringify({ id: 2, ingredient: "Arroz", region: "Lima" }),
  );
});

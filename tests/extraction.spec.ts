import { test, expect } from "@playwright/test";

test("revisa evidencia, conserva pendientes y prepara comparación sin compra", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Revisar una cotización", { exact: true }).click();
  await page
    .getByRole("button", { name: "Revisar ejemplo de cotización" })
    .click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(dialog).toContainText("El contenido de origen es ficticio");
  await expect(dialog).toContainText("Saco: S/ 80.00");
  await expect(dialog.getByText("Original: Pendiente")).toHaveCount(2);
  await expect(
    dialog.getByRole("button", { name: "Continuar a comparación" }),
  ).toBeDisabled();

  await dialog.getByLabel("Unidad de la presentación").selectOption("kg");
  await dialog.getByLabel("Contenido por presentación").fill("18");
  await dialog.getByLabel("Precio por presentación").fill("85");
  await expect(dialog.getByText("Corregido manualmente")).toHaveCount(3);
  await dialog
    .getByLabel(
      "Revisé el origen y confirmo los datos, incluidas mis correcciones",
    )
    .check();
  await dialog.getByRole("button", { name: "Continuar a comparación" }).click();

  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  await page.getByRole("button", { name: "Ver origen" }).click();
  const sourceDialog = page.getByRole("dialog");
  await expect(sourceDialog).toContainText("Distribuidora de ejemplo");
  await expect(sourceDialog).toContainText("corrección manual: 18");
  await expect(sourceDialog).toContainText("corrección manual: kg");
  await expect(sourceDialog).toContainText("Precio por presentación: 80.00");
  await expect(sourceDialog).toContainText("corrección manual: 85");
  await expect(sourceDialog).toContainText("Precio al confirmar revisión");
  await expect(sourceDialog).not.toContainText("Precio original");
});

test("el diálogo conserva el borrador y no desborda a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  await page.getByText("Revisar una cotización", { exact: true }).click();
  const trigger = page.getByRole("button", {
    name: "Revisar ejemplo de cotización",
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Contenido por presentación").fill("18");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Contenido por presentación")).toHaveValue(
    "18",
  );
});

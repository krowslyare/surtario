import { expect, test } from "@playwright/test";

test("selector con teclado y Escape dentro de un diálogo conserva foco y formulario", async ({
  page,
}) => {
  await page.goto("/");
  const zone = page.getByRole("combobox", { name: "Zona de interés" });
  await zone.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("option", { name: "Lima", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "Cusco", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(zone).toContainText("Cusco");
  await expect(zone).toBeFocused();

  await page.goto("/?view=comparison");
  const opener = page.getByRole("button", { name: "Editar Proveedor A" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const currency = dialog.getByRole("combobox", {
    name: "Moneda",
    exact: true,
  });
  await currency.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(currency).toBeFocused();
  await currency.press("Enter");
  await expect(
    dialog.getByRole("option", { name: "Soles (PEN)", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    dialog.getByRole("option", { name: "Dólares (USD)", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(currency).toContainText("Dólares (USD)");
  await dialog.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("US$ 95.00");
  await opener.click();
  await expect(
    dialog.getByRole("combobox", { name: "Moneda", exact: true }),
  ).toContainText("Dólares (USD)");
  // Padding is part of the panel, not its backdrop.
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("contraer herramientas retira controles del teclado y conserva correcciones", async ({
  page,
}) => {
  await page.goto("/");
  const tools = page.getByRole("button", {
    name: "Cotizaciones y documentos",
    exact: true,
  });
  const review = page.getByRole("button", {
    name: "Revisar ejemplo de cotización",
  });
  await expect(review).toHaveCount(0);
  await tools.click();
  await review.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Contenido por presentación").fill("27");
  const unit = dialog.getByRole("combobox", {
    name: "Unidad de la presentación",
  });
  await unit.click();
  await dialog.getByRole("option", { name: "kg", exact: true }).click();
  await unit.click();
  await dialog.getByRole("option", { name: "Pendiente", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Continuar a comparación" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await tools.click();
  await expect(tools).toHaveAttribute("aria-expanded", "false");
  await expect(review).toHaveCount(0);
  await tools.press("Tab");
  await expect(
    page.getByRole("link", { name: "Conoce la marca Surtario" }),
  ).toBeFocused();
  await tools.click();
  await review.click();
  await expect(dialog.getByLabel("Contenido por presentación")).toHaveValue(
    "27",
  );
  await expect(
    dialog.getByRole("combobox", { name: "Unidad de la presentación" }),
  ).toContainText("Pendiente");
});

test("menú y diálogo funcionan con movimiento reducido a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=comparison");
  await page.getByRole("button", { name: "Editar Proveedor A" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Impuestos del precio y la entrega" })
    .click();
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.right <= innerWidth &&
        getComputedStyle(element).animationName === "none"
      );
    }),
  ).toBe(true);
  await menu
    .getByRole("option", { name: "Faltan impuestos por sumar" })
    .click();
  await dialog.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("selección móvil anuncia el cambio y lleva al resumen sin iniciar una compra", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Mi estudio", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page.getByRole("button", { name: "Sin precio", exact: true }).click();
  await page
    .getByRole("article")
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await expect(
    page.getByRole("status", { name: "Selección del estudio" }),
  ).toContainText("añadido al estudio");
  await page
    .getByRole("button", { name: "Ver resumen 1", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Tu estudio", exact: true }),
  ).toBeFocused();
  const picks = page.getByRole("list", { name: "Opciones seleccionadas" });
  await expect(picks).toContainText("Distribuidor C");
  await expect(
    page.getByRole("button", { name: "Preparar compra", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveCount(0);
  expect(
    await picks
      .locator("li")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

import { test, expect } from "@playwright/test";

test("investiga sin documentos ni cantidad y conserva un contacto sin precio", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Cantidad necesaria")).toHaveCount(0);
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "Sin precio", exact: true }).click();
  const distributor = page.getByRole("article");
  await expect(distributor).toHaveCount(1);
  await expect(distributor).not.toContainText("S/");
  await distributor.getByRole("button", { name: "Ver contacto" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Dirección ficticia sin verificar",
  );
  await page.keyboard.press("Escape");
  await distributor
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await page
    .getByRole("button", { name: "Mi estudio", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi estudio de mercado" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Preparar compra", exact: true }),
  ).toBeDisabled();
});

test("el estudio continúa opcionalmente a compra sin inventar condiciones", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  for (const article of (await page.getByRole("article").all()).slice(0, 3)) {
    await article.getByRole("button", { name: "Añadir a mi estudio" }).click();
  }
  await page
    .getByRole("button", { name: "Preparar compra", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("no se convierten en ofertas");
  await expect(
    dialog.getByRole("button", { name: "Indicar cantidad y condiciones" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Indicar cantidad y condiciones" })
    .click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await page.getByLabel("Cantidad necesaria").fill("10");
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  await expect(page.getByTestId("total-1")).toHaveText("Pendiente");
  await page.getByRole("button", { name: "Ver origen" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Ejemplo de catálogo");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Restaurar selección" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restaurar selección" })
    .click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await page
    .getByRole("button", { name: "Volver al estudio de mercado" })
    .click();
  await expect(page.getByText("3 opciones en tu estudio")).toBeVisible();
  expect(errors).toEqual([]);
});

test("búsqueda vacía y falta de cobertura del ejemplo se explican", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar ejemplo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Escribe un insumo");
  await page.getByLabel("Insumo o categoría").fill("Pescado");
  await page
    .getByRole("button", { name: "Explorar ejemplo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No hay ejemplos para esta búsqueda" }),
  ).toBeVisible();
  await expect(
    page.getByText("Esto no indica que no existan distribuidores.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver ejemplo de arroz" }).click();
  await page
    .getByRole("button", { name: "Cambiar búsqueda", exact: true })
    .click();
  await page.getByLabel("Zona de interés").click();
  await page.getByRole("option", { name: "Cusco", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar ejemplo", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("prepara una consulta de mercado editable sin enviar mensajes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page
    .getByRole("button", { name: "Preparar consulta", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Mensaje editable")).toHaveValue(
    /aún no tengo una cantidad/,
  );
  await page
    .getByLabel("Mensaje editable")
    .fill("Consulta de catálogo de ejemplo");
  await expect(page.getByRole("dialog")).toContainText(
    "Este texto solo se copia; no envía correo.",
  );
  await expect(
    page.getByRole("button", { name: "Copiar texto" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Cerrar", exact: true })
    .last()
    .click();
  expect(writes).toEqual([]);
});

for (const width of [320, 390, 768, 1280, 1920]) {
  test(`exploración y fuentes legibles a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Explorar ejemplo de arroz" })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const sourceButton = page.getByRole("button", {
      name: "Ver contacto",
    });
    await sourceButton.click();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(sourceButton).toBeFocused();
  });
}

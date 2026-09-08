import { test, expect } from "@playwright/test";

test("compara, cambia cantidad y completa un dato faltante sin recetas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=comparison");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 95.00");
  await expect(page.getByTestId("total-1")).toHaveText("S/ 50.00");
  await page.getByLabel("Cantidad necesaria").fill("20");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
  await expect(page.getByTestId("total-1")).toHaveText("S/ 100.00");
  await page.getByRole("button", { name: "Falta el peso" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  await page.getByRole("button", { name: "Completar datos" }).click();
  await page.getByLabel("Contenido por presentación").fill("18");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
  await page.getByRole("button", { name: "Ver origen" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("S/ 80.00");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("edición manual distingue dato desconocido, entrega incluida y moneda diferente", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  await page.getByRole("button", { name: "Falta la entrega" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  await page.getByRole("button", { name: "Editar Proveedor A" }).click();
  await page.getByLabel("Entrega por pedido", { exact: true }).fill("0");
  await page.getByLabel("Moneda", { exact: true }).selectOption("USD");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("US$ 80.00");
  await expect(
    page.getByRole("heading", {
      name: "Todavía no hay una comparación completa",
    }),
  ).toBeVisible();
  await page.getByLabel("Cantidad necesaria").fill("0");
  await expect(page.getByLabel("Cantidad necesaria")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
});

test("vacío, oferta única y nueva oferta manual se pueden recorrer", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Quitar oferta", exact: true })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Quitar oferta", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Empieza con una oferta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Agregar primera oferta" }).click();
  await page.getByLabel("Proveedor", { exact: true }).fill("Prueba manual");
  await page.getByLabel("Precio por presentación").fill("4,50");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(
    page.getByRole("heading", { name: "Una oferta es un buen comienzo" }),
  ).toBeVisible();
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
});

for (const width of [320, 390, 768, 1280]) {
  test(`reflujo y edición por teclado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=comparison");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Editar Proveedor A" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => {
        const d = document.querySelector("dialog")!;
        return d.scrollWidth <= d.clientWidth;
      }),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Editar Proveedor A" }),
    ).toBeFocused();
  });
}

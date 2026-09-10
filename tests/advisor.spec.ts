import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

// Writes synthetic scenarios only. Provider calls remain disabled.
test.beforeEach(async ({ context }) => {
  await connectOnlyToLocalBackend(context);
});

test("one action saves the comparison and scenario, then stale inputs stay visible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=comparison");
  const advisor = page.getByRole("region", { name: "Asesor de compras" });
  expect(
    await page.locator(".advisor-panel").evaluate((advisorPanel) => {
      const comparison = document.querySelector("#comparison");
      return Boolean(
        comparison &&
          (advisorPanel.compareDocumentPosition(comparison) &
            Node.DOCUMENT_POSITION_FOLLOWING),
      );
    }),
  ).toBe(true);
  await advisor.getByText("Contexto de mi decisión · opcional").click();
  await advisor.getByLabel("Prioridad").selectOption("cash");
  await advisor.getByLabel("Presupuesto disponible").fill("60");
  await expect(advisor.getByLabel("Stock actual confirmado")).toHaveValue("");
  await expect(
    advisor.getByRole("button", {
      name: "Guardar comparación y escenario",
    }),
  ).toBeEnabled();
  await expect(advisor.getByLabel("Prioridad")).toHaveValue("cash");
  await expect(advisor.getByLabel("Presupuesto disponible")).toHaveValue("60");
  await advisor
    .getByRole("button", { name: "Guardar comparación y escenario" })
    .click();
  await expect(
    page.getByRole("button", { name: "Comparaciones guardadas (1)" }),
  ).toBeVisible();
  await expect(
    advisor.getByText("Escenario guardado con cálculo verificable"),
  ).toBeVisible();
  await expect(advisor.locator(".advisor-verdict")).toContainText("Proveedor B");
  await page.reload();
  await page
    .getByRole("button", { name: "Comparaciones guardadas (1)" })
    .click();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await advisor.getByText("Recuperar escenarios (1)").click();
  await advisor.getByRole("button", { name: /Escenario .* · Caja/ }).click();
  await advisor.getByText("Contexto de mi decisión · opcional").click();
  await expect(advisor.getByLabel("Presupuesto disponible")).toHaveValue("60");
  await expect(advisor.getByLabel("Stock actual confirmado")).toHaveValue("");
  await expect(advisor.getByText(/desactualizado respecto/i)).toHaveCount(0);
  await page.getByLabel("Cantidad necesaria").fill("20");
  await expect(advisor.getByText(/desactualizado respecto/i)).toBeVisible();
  await advisor.getByLabel("Presupuesto disponible").fill("abc");
  await expect(advisor.getByRole("alert")).toContainText("Revisa los números");
  await expect(
    advisor.getByRole("button", {
      name: "Guardar comparación y escenario",
    }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("a matching saved scenario is restored without preparing another run", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  const advisor = page.getByRole("region", { name: "Asesor de compras" });
  await advisor
    .getByRole("button", { name: "Guardar comparación y escenario" })
    .click();
  await expect(
    advisor.getByText("Escenario guardado con cálculo verificable"),
  ).toBeVisible();
  await expect(advisor.getByText("Recuperar escenarios (1)")).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: "Comparaciones guardadas (1)" })
    .click();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await expect(
    advisor.getByText("Escenario guardado con cálculo verificable"),
  ).toBeVisible();
  await expect(advisor.getByText("Recuperar escenarios (1)")).toBeVisible();
  await expect(advisor.locator(".advisor-actions button")).toHaveCount(0);
  await expect(advisor.getByText(/guardarás el cálculo/)).toHaveCount(0);
});

test("pending quantity stays blocked after the comparison is saved", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  const advisor = page.getByRole("region", { name: "Asesor de compras" });
  await page.getByLabel("Cantidad necesaria").fill("");
  await expect(
    advisor.getByRole("button", {
      name: "Guardar comparación y escenario",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect(
    page.getByText("Comparación guardada", { exact: false }),
  ).toBeVisible();
  await expect(
    advisor.getByRole("button", { name: "Guardar escenario" }),
  ).toBeDisabled();
  await expect(advisor.getByText(/cantidad válida/i)).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`context and negotiation remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=comparison");
    const advisor = page.getByRole("region", { name: "Asesor de compras" });
    await advisor.getByText("Contexto de mi decisión · opcional").click();
    await advisor
      .getByLabel("Proveedor habitual")
      .selectOption("rice-supplier-a");
    await advisor.getByLabel("Consumo diario confirmado").fill("1");
    await advisor.getByLabel("Stock actual confirmado").fill("2");
    await advisor.getByText("Preparar conversación con mi proveedor").click();
    await expect(advisor.locator(".quotation-text")).toContainText(
      "Proveedor B",
    );
    await advisor
      .getByText("Ver caja, cobertura y pendientes por proveedor")
      .click();
    await expect(advisor.locator(".advisor-alternatives")).toContainText(
      "20 días",
    );
    await expect(advisor.locator(".advisor-alternatives")).toContainText(
      "12 días",
    );
    await advisor.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await advisor.screenshot({ path: `/tmp/procurement-advisor-${width}.png` });
  });
}

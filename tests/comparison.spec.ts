import { test, expect } from "@playwright/test";

test("compara, cambia cantidad y completa un dato faltante sin recetas", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=comparison&example=pe");
  // fill() can target an inert input underneath the workspace arrival screen.
  await expect(page.locator(".workspace-content")).not.toHaveAttribute("inert");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 95.00");
  await expect(page.getByTestId("total-1")).toHaveText("S/ 50.00");
  await page.getByLabel("Required quantity").fill("20");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
  await expect(page.getByTestId("total-1")).toHaveText("S/ 100.00");
  await page.getByRole("button", { name: "Missing weight" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await page.getByRole("button", { name: "Complete details" }).click();
  await page.getByLabel("Content per pack").fill("18");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
  await page.getByRole("button", { name: "View source" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("S/ 80.00");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("edición manual distingue dato desconocido, entrega incluida y moneda diferente", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  await page.getByRole("button", { name: "Missing delivery" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await page.getByRole("button", { name: "Edit Proveedor A" }).click();
  await page.getByLabel("Delivery per order", { exact: true }).fill("0");
  await page.getByLabel("Currency", { exact: true }).click();
  await page
    .getByRole("option", { name: "US dollars (USD)", exact: true })
    .click();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("USD 80.00");
  await expect(
    page.getByRole("heading", {
      name: "No complete comparison yet",
    }),
  ).toBeVisible();
  await page.getByLabel("Required quantity").fill("0");
  await expect(page.getByLabel("Required quantity")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
});

test("guarda delivery desconocido y explica por qué el total sigue pendiente", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  await page.getByRole("button", { name: "Edit Proveedor A" }).click();
  await page.getByLabel("Delivery per order", { exact: true }).fill("");
  await page.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page.getByRole("option", { name: "To confirm", exact: true }).click();
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await expect(
    page.getByText("Listed price ready · final terms pending", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Offer saved. Delivery cost and tax remain pending, so the final order total is pending.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("vacío, oferta única y nueva oferta manual se pueden recorrer", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: /^Remove / })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove offer", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Start with an offer" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add first offer" }).click();
  await page.getByLabel("Supplier", { exact: true }).fill("Prueba manual");
  await page.getByLabel("Price per pack").fill("4,50");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("heading", { name: "One offer is a good start" }),
  ).toBeVisible();
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
});

for (const width of [320, 390, 768, 1280]) {
  test(`reflujo y edición por teclado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=comparison&example=pe");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Edit Proveedor A" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => {
        const d = document.querySelector("dialog")!;
        return d.scrollWidth <= d.clientWidth;
      }),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Edit Proveedor A" }),
    ).toBeFocused();
  });
}

test("aplica términos compartidos una vez y mantiene retiro visible por oferta", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  await expect(page.getByRole("button", { name: "Remove Proveedor A" })).toBeVisible();
  await page.getByRole("button", { name: "Apply shared terms" }).click();
  const dialog = page.getByRole("dialog", { name: "Apply shared terms to 2 offers" });
  await dialog.getByLabel("Minimum packs").fill("2");
  await dialog.getByLabel("Delivery per order").fill("0");
  await dialog.getByLabel("Shared tax on goods and delivery").click();
  await dialog.getByRole("option", { name: "Final amounts, including tax" }).click();
  await dialog.getByLabel("All suppliers can deliver when I need it").check();
  await dialog.getByRole("button", { name: "Apply to 2 offers" }).click();
  await expect(page.getByText("Terms confirmed", { exact: true })).toHaveCount(2);
  await expect(page.getByText("2 packs", { exact: true })).toHaveCount(2);
});

test("unidad y mínimo desconocidos siguen pendientes y no ocultan ofertas completas", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  const summary = page.getByRole("heading", { name: /Proveedor B requires/ });
  await expect(summary).toBeVisible();
  await page
    .getByRole("button", { name: "Add offer", exact: true })
    .click();
  await expect(page.getByLabel("Pack unit")).toHaveText("To confirm");
  await expect(page.getByLabel("Minimum packs")).toHaveValue("");
  await page.getByLabel("Supplier", { exact: true }).fill("Supplier C");
  await page.getByLabel("Content per pack").fill("10");
  await page.getByLabel("Price per pack").fill("20");
  await page.getByLabel("Delivery per order", { exact: true }).fill("0");
  await page.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page.getByRole("option", { name: "Final amounts, including tax", exact: true }).click();
  await page
    .getByLabel("The supplier can deliver when I need it")
    .check();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-2")).toHaveText("Pending");
  await expect(summary).toBeVisible();
  await page.getByRole("button", { name: "Edit Supplier C" }).click();
  await expect(page.getByLabel("Pack unit")).toHaveText("To confirm");
  await page.getByLabel("Price per pack").fill("21");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-2")).toHaveText("Pending");
  await page.getByRole("button", { name: "Edit Supplier C" }).click();
  await expect(page.getByLabel("Pack unit")).toHaveText("To confirm");
  await page.getByLabel("Pack unit").click();
  await page
    .getByRole("option", { name: "Kilograms (kg)", exact: true })
    .click();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-2")).toHaveText("Pending");
  await page.getByRole("button", { name: "Edit Supplier C" }).click();
  await page.getByLabel("Minimum packs").fill("1");
  await page.getByLabel("Currency", { exact: true }).click();
  await page.getByRole("option", { name: "US dollars (USD)", exact: true }).click();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-2")).toHaveText("USD 21.00");
  await expect(summary).toBeVisible();
});

test("clic interior conserva el formulario y origen usa la fecha local", async ({
  browser,
}) => {
  const context = await browser.newContext({ timezoneId: "America/Lima" });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-09-10T02:30:00Z"));
  await page.goto("/?view=comparison&example=pe");
  await page
    .getByRole("button", { name: "Add offer", exact: true })
    .click();
  await page.getByLabel("Supplier", { exact: true }).fill("Oferta nocturna");
  const dialog = page.getByRole("dialog");
  const bounds = (await dialog.boundingBox())!;
  await page.mouse.click(bounds.x + 12, bounds.y + bounds.height / 2);
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Supplier", { exact: true })).toHaveValue(
    "Oferta nocturna",
  );
  await page.getByRole("button", { name: "Save offer" }).click();
  await page.getByRole("button", { name: "View source" }).last().click();
  await expect(dialog).toContainText("Sep 9, 2026");
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await context.close();
});

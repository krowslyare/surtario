import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

// These tests write synthetic studies. Never connect them to a remote backend.
test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));

test("guarda en Convex, recupera tras recargar y sincroniza solo el mismo navegador", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  const cards = page.getByRole("article");
  await cards
    .nth(0)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await cards
    .nth(2)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await expect(
    page.getByRole("button", { name: "Guardar estudio", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Guardar estudio", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Estudios guardados", exact: true })
      .getByRole("status"),
  ).toContainText("Estudio guardado con 2 opciones");
  await cards.nth(0).getByRole("button", { name: "En mi estudio" }).click();
  await expect(
    page
      .getByRole("region", { name: "Estudios guardados", exact: true })
      .getByRole("status"),
  ).toHaveText("Cambios sin guardar");
  await page.reload();
  await page.getByRole("button", { name: "Guardados (1)" }).click();
  await page
    .getByRole("button", { name: "Abrir estudio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi estudio de mercado" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Ver contacto", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Dirección ficticia sin verificar",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await otherTab
    .getByRole("button", { name: "Abrir estudio", exact: true })
    .click();
  await page
    .getByRole("article")
    .nth(1)
    .getByRole("button", { name: "En mi estudio" })
    .click();
  await page
    .getByRole("button", { name: "Guardar cambios del estudio" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Estudios guardados", exact: true })
      .getByRole("status"),
  ).toContainText("Estudio guardado con 1 opción");
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await expect(otherTab.getByText(/Revisión 2/)).toBeVisible();
  await otherTab.keyboard.press("Escape");
  await expect(otherTab.getByRole("dialog")).toHaveCount(0);
  // A reactive library update must not silently replace an open draft.
  await expect(otherTab.getByText("2 opciones en tu estudio")).toBeVisible();
  await otherTab
    .getByRole("button", { name: "Guardar cambios del estudio" })
    .click();
  await expect(otherTab.getByRole("alert")).toContainText(
    "cambió en otra vista",
  );
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await otherTab
    .getByRole("button", { name: "Abrir estudio", exact: true })
    .click();
  await expect(otherTab.getByText("1 opción en tu estudio")).toBeVisible();

  const independent = await browser.newContext();
  await connectOnlyToLocalBackend(independent);
  const visitor = await independent.newPage();
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "Guardados (0)" }).click();
  await expect(
    visitor.getByText("No tienes estudios guardados en esta sesión."),
  ).toBeVisible();
  await independent.close();
  await otherTab.close();
});

test("sin conexión conserva el borrador y no declara guardado", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await expect(
    page.getByRole("button", { name: "Guardar estudio", exact: true }),
  ).toBeEnabled();
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Guardar estudio", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Sin conexión al guardado.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("1 opción en tu estudio")).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Guardar estudio", exact: true }),
  ).toBeEnabled();
});

test("volver al ejemplo después de una búsqueda vacía conserva la selección", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await page
    .getByRole("button", { name: "Cambiar búsqueda", exact: true })
    .click();
  await page.getByLabel("Insumo o categoría").fill("Pescado");
  await page
    .getByRole("button", { name: "Explorar ejemplo", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Estudios guardados", exact: true })
      .getByRole("status"),
  ).toHaveText(
    "El guardado de esta demo solo está disponible para arroz o abarrotes en Lima.",
  );
  await page.getByRole("button", { name: "Ver ejemplo de arroz" }).click();
  await expect(
    page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "En mi estudio" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("ensayo de demo: investigar, recuperar, consultar y preparar compra", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await test.step("Explorar sin documentos y revisar evidencia", async () => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Explorar ejemplo de arroz" })
      .click();
    await expect(page.getByLabel("Cantidad necesaria")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Ver fuente de ejemplo", exact: false })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Este ejemplo no procede de una búsqueda real",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const card of (await page.getByRole("article").all()).slice(0, 3)) {
      await card.getByRole("button", { name: "Añadir a mi estudio" }).click();
    }
  });
  await test.step("Guardar y recuperar el estudio en Convex local", async () => {
    await page
      .getByRole("button", { name: "Guardar estudio", exact: true })
      .click();
    await expect(
      page
        .getByRole("region", { name: "Estudios guardados", exact: true })
        .getByRole("status"),
    ).toContainText("Estudio guardado con 3 opciones");
    await page.reload();
    await page.getByRole("button", { name: "Guardados (1)" }).click();
    await page
      .getByRole("button", { name: "Abrir estudio", exact: true })
      .click();
    await expect(page.getByRole("article")).toHaveCount(3);
  });
  await test.step("Consultar un distribuidor sin precio, sin simular envío", async () => {
    const directory = page
      .getByRole("article")
      .filter({ hasText: "Distribuidor C" });
    await directory.getByRole("button", { name: "Ver contacto" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Dirección ficticia sin verificar",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await directory.getByRole("button", { name: "Preparar consulta" }).click();
    await expect(page.getByLabel("Mensaje editable")).toHaveValue(
      /aún no tengo una cantidad/,
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Este texto solo se copia; no envía correo.",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
  await test.step("Continuar a compra conservando condiciones pendientes", async () => {
    await page
      .getByRole("button", { name: "Preparar compra", exact: true })
      .click();
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Indicar cantidad y condiciones" })
      .click();
    await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
    await page.getByLabel("Cantidad necesaria").fill("10");
    await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
    await expect(page.getByTestId("total-1")).toHaveText("Pendiente");
  });
  await test.step("Completar condiciones sintéticas y comprobar el desembolso", async () => {
    // Rehearsal fallback only: these values are not a received supplier response.
    for (const [supplier, freight] of [
      ["Distribuidor A · ejemplo", "15"],
      ["Distribuidor B · ejemplo", "0"],
    ]) {
      await page.getByRole("button", { name: `Editar ${supplier}` }).click();
      await page
        .getByLabel("Mínimo de presentaciones", { exact: true })
        .fill("1");
      await page
        .getByLabel("Entrega por pedido", { exact: true })
        .fill(freight);
      await page
        .getByLabel("Impuestos del precio y la entrega", { exact: true })
        .click();
      await page
        .getByRole("option", {
          name: "Importes finales, impuestos incluidos",
          exact: true,
        })
        .click();
      await page
        .getByRole("checkbox", {
          name: "El proveedor puede entregar cuando lo necesito",
        })
        .check();
      await page.getByRole("button", { name: "Guardar oferta" }).click();
    }
    await expect(page.getByTestId("total-0")).toHaveText("S/ 95.00");
    await expect(page.getByTestId("total-1")).toHaveText("S/ 50.00");
    await page.getByRole("button", { name: "Ver origen" }).first().click();
    await expect(page.getByRole("dialog")).toContainText(
      "Aquí conservamos los valores de entrada",
    );
    await expect(page.getByRole("dialog")).toContainText("S/ 80.00");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Cantidad necesaria").fill("20");
    await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
    await expect(page.getByTestId("total-1")).toHaveText("S/ 100.00");
    await page
      .getByRole("button", { name: "Volver al estudio de mercado" })
      .click();
    await expect(page.getByText("3 opciones en tu estudio")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

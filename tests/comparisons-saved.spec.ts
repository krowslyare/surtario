import { expect, test, type BrowserContext } from "@playwright/test";

// These tests write synthetic comparisons. Never connect them to a remote backend.
async function restrictToLocalBackend(context: BrowserContext) {
  await context.routeWebSocket(/.*/, (socket) => {
    const url = new URL(socket.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      socket.close();
      throw new Error(
        "Comparison persistence E2E is restricted to a local backend.",
      );
    }
    socket.connectToServer();
  });
}

test.beforeEach(async ({ context }) => restrictToLocalBackend(context));

test("guarda condiciones y elección, las recupera y una edición invalida la elección", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  await page.getByRole("button", { name: "Editar Proveedor A" }).click();
  await page.getByLabel("Entrega por pedido", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Guardar oferta" }).click();

  const firstOffer = page.getByRole("article", {
    name: "Oferta de Proveedor A",
  });
  await firstOffer.getByRole("button", { name: "Elegir oferta" }).click();
  await expect(
    firstOffer.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect(
    page.getByText("Comparación guardada con una oferta elegida", {
      exact: false,
    }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: /Comparaciones guardadas \(1\)/ })
    .click();
  await expect(
    page.getByText("oferta elegida", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("10");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 92.00");
  await expect(
    page
      .getByRole("article", { name: "Oferta de Proveedor A" })
      .getByRole("button", { name: "Oferta elegida" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Cantidad necesaria").fill("20");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elegir oferta" })).toHaveCount(
    2,
  );
  await page
    .getByRole("button", { name: "Guardar cambios de la comparación" })
    .click();
  await expect(
    page.getByText("Comparación guardada. Los cambios posteriores", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: /Comparaciones guardadas \(1\)/ })
    .click();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("20");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Restaurar ejemplo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restaurar ejemplo" })
    .click();
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect(
    page.getByText("Comparación guardada. Los cambios posteriores", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Comparaciones guardadas \(2\)/ })
    .click();
});

test("una oferta manual explica por qué no se puede guardar en la demo", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  await page.getByRole("button", { name: "Agregar oferta" }).click();
  await page.getByLabel("Proveedor", { exact: true }).fill("Proveedor manual");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(
    page.getByRole("button", { name: "Guardar comparación", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Esta demo solo guarda las ofertas originales", {
      exact: false,
    }),
  ).toBeVisible();
});

test("una cantidad inválida no se convierte en cantidad pendiente", async ({
  page,
}) => {
  await page.goto("/?view=comparison");
  await page.getByLabel("Cantidad necesaria").fill("texto");
  await expect(
    page.getByRole("button", { name: "Guardar comparación", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Corrige la cantidad antes de guardar", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Cantidad necesaria").fill("");
  await expect(
    page.getByRole("button", { name: "Guardar comparación", exact: true }),
  ).toBeEnabled();
});

test("guarda una comparación de catálogo con cantidad pendiente y la recupera", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  const cards = page.getByRole("article");
  await cards
    .nth(0)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await cards
    .nth(1)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await page
    .getByRole("button", { name: "Preparar compra", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Indicar cantidad y condiciones" })
    .click();
  await expect(page).toHaveURL(/view=comparison/);
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect(
    page.getByText("Comparación guardada. Los cambios posteriores", {
      exact: false,
    }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: /Comparaciones guardadas \(1\)/ })
    .click();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await page
    .getByRole("button", { name: "Editar Distribuidor A · ejemplo" })
    .click();
  await page.getByLabel("Entrega por pedido", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(
    page.getByRole("button", { name: "Guardar cambios de la comparación" }),
  ).toBeEnabled();
});

test("una confirmación tardía no asocia el guardado al borrador restaurado", async ({
  page,
}) => {
  let hold = false;
  const pending: Array<() => void> = [];
  await page.routeWebSocket(/.*/, (socket) => {
    if (!["127.0.0.1", "localhost"].includes(new URL(socket.url()).hostname)) {
      socket.close();
      throw new Error("Only local backend allowed.");
    }
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (hold) pending.push(() => socket.send(message));
      else socket.send(message);
    });
  });
  await page.goto("/?view=comparison");
  await expect(
    page.getByRole("button", { name: "Comparaciones guardadas (0)" }),
  ).toBeVisible();
  hold = true;
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Restaurar ejemplo" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restaurar ejemplo" })
    .click();
  hold = false;
  for (const deliver of pending) deliver();
  await expect(
    page.getByText("Se guardó la comparación anterior.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar comparación", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Guardar cambios de la comparación" }),
  ).toHaveCount(0);
  await page.getByLabel("Cantidad necesaria").fill("20");
  await page
    .getByRole("button", { name: "Guardar comparación", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Comparaciones guardadas (2)" }),
  ).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("revisión web guardada recupera evidencia, condiciones y elección en Convex local", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const run = (fn: string, args: object) =>
    JSON.parse(runLocalConvex(["run", fn, JSON.stringify(args)]));
  const reserved = run("research:reserveSearch", {
    token,
    clientId: crypto.randomUUID(),
    ingredient: "Arroz",
    region: "Lima",
  });
  run("research:finishSearch", {
    id: reserved.run.id,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Cotización web sintética",
        description: "Fuente de prueba E2E",
        markdown: extractionSource.text,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated: true,
  });
  run("research:reserveExtraction", {
    token,
    runId: reserved.run.id,
    sourceIndex: 0,
  });
  run("research:finishExtraction", {
    runId: reserved.run.id,
    sourceIndex: 0,
    offer: extractionExample,
  });
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Arroz · Lima/ }).click();
  await page.getByRole("button", { name: "Revisar extracción" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Unidad de la presentación").click();
  await dialog.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Contenido por presentación").fill("18");
  await dialog.getByLabel("Precio por presentación").fill("85");
  await dialog
    .getByLabel(
      "Revisé el origen y confirmo los datos, incluidas mis correcciones",
    )
    .check();
  await dialog.getByRole("button", { name: "Añadir al estudio" }).click();
  await expect(
    page.getByRole("button", { name: "Mi estudio 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver mi estudio", exact: true })
    .click();
  await expect(
    page.getByRole("article", {
      name: "Oferta en estudio: Distribuidora de ejemplo",
    }),
  ).toContainText("S/ 85.00");
  await page
    .getByRole("button", { name: "Guardar estudio", exact: true })
    .click();
  await expect(
    page.getByText("Estudio guardado con 1 opción", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Guardados (1)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir estudio", exact: true })
    .click();
  await expect(
    page.getByRole("article", {
      name: "Oferta en estudio: Distribuidora de ejemplo",
    }),
  ).toContainText("S/ 85.00");
  await page
    .getByRole("button", { name: "Comparar ofertas revisadas" })
    .click();
  await page.getByLabel("Cantidad necesaria").fill("10");
  await page
    .getByRole("button", { name: "Editar Distribuidora de ejemplo" })
    .click();
  await page.getByLabel("Mínimo de presentaciones", { exact: true }).fill("1");
  await page.getByLabel("Entrega por pedido", { exact: true }).fill("15");
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
    .getByLabel("El proveedor puede entregar cuando lo necesito")
    .check();
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await page.getByRole("button", { name: "Elegir oferta" }).click();
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
    .getByRole("button", { name: "Comparaciones guardadas (1)" })
    .click();
  await page.getByRole("button", { name: "Abrir comparación" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ver origen" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Documento sintético revisado",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Precio por presentación: 80.00",
  );
  await expect(page.getByRole("dialog")).toContainText("corrección manual: 85");
  await expect(
    page.getByRole("link", { name: "Abrir fuente original" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Cantidad necesaria").fill("20");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar cambios de la comparación" })
    .click();
  await expect(
    page.getByText("Comparación guardada. Los cambios posteriores", {
      exact: false,
    }),
  ).toBeVisible();
});

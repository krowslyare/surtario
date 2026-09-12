import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("revisión documental guardada recupera evidencia, condiciones y elección en Convex local", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const folder = mkdtempSync(join(tmpdir(), "document-review-e2e-"));
  const path = join(folder, "fixture.json");
  writeFileSync(
    path,
    JSON.stringify([
      {
        ownerHash: createHash("sha256").update(token).digest("hex"),
        clientId: crypto.randomUUID(),
        kind: "pdf",
        createdAt: Date.now(),
        status: "complete",
        error: null,
        result: {
          documentType: "quotation",
          transcript: extractionSource.text,
          offer: extractionExample,
        },
      },
    ]),
  );
  try {
    runLocalConvex(["import", "--append", "--table", "documentRuns", path]);
  } finally {
    rmSync(folder, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/");
  await page.getByText("Revisar una cotización", { exact: true }).click();
  await page.getByRole("button", { name: "Review extracted data" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Unidad de la presentación").selectOption("kg");
  await dialog.getByLabel("Contenido por presentación").fill("18");
  await dialog.getByLabel("Precio por presentación").fill("85");
  await dialog
    .getByLabel(
      "Revisé el origen y confirmo los datos, incluidas mis correcciones",
    )
    .check();
  await dialog.getByRole("button", { name: "Continue to comparison" }).click();
  await page.getByLabel("Cantidad necesaria").fill("10");
  await page
    .getByRole("button", { name: "Editar Distribuidora de ejemplo" })
    .click();
  await page.getByLabel("Mínimo de presentaciones", { exact: true }).fill("1");
  await page.getByLabel("Entrega por pedido", { exact: true }).fill("15");
  await page
    .getByLabel("Impuestos del precio y la entrega", { exact: true })
    .selectOption("included");
  await page
    .getByLabel("El proveedor puede entregar cuando lo necesito")
    .check();
  await page.getByRole("button", { name: "Guardar oferta" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await page.getByRole("button", { name: "Elegir oferta" }).click();
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved with a selected offer", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Comparaciones guardadas (1)" })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ver origen" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Precio por presentación: 80.00",
  );
  await expect(page.getByRole("dialog")).toContainText("corrección manual: 85");
  await expect(
    page.getByRole("link", { name: "Abrir documento original" }),
  ).toHaveAttribute("href", "/examples/cotizacion-demo.pdf");
  await page.keyboard.press("Escape");
  await page.getByLabel("Cantidad necesaria").fill("20");
  await expect(
    page.getByRole("button", { name: "Oferta elegida" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save comparison changes" }).click();
  await expect(
    page.getByText("Comparison saved Los cambios posteriores", {
      exact: false,
    }),
  ).toBeVisible();
});

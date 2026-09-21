import { test, expect } from "@playwright/test";
import path from "node:path";

test("CSV revisable conserva fila y origen sin subir documentos", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.goto("/?example=pe");
  await page
    .getByText("Ingredient lists", { exact: true })
    .click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ingredient file").setInputFiles({
    name: "lista.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Ingredient;Precio\nArroz;4,50\n;80\nAceite;"),
  });
  await dialog.getByLabel("Ingredient column").click();
  await dialog.getByRole("option", { name: /^Column 1/ }).click();
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await dialog.getByRole("button", { name: "Confirm 3 ingredients" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Complete or remove");
  await dialog.getByRole("button", { name: "Remove ingredient 2" }).click();
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await expect(page.getByRole("checkbox", { name: /Arroz/ })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Aceite/ })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Arroz in Lima" })).toHaveCount(0);
  await page.getByRole("button", { name: "View list source" }).click();
  await expect(dialog).toContainText("Row 2: Arroz | 4,50");
  await expect(dialog).toContainText("Row 4: Aceite");
  expect(writes).toEqual([]);
});

test("XLSX elige segunda hoja y columna, conserva valor almacenado", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page
    .getByText("Ingredient lists", { exact: true })
    .click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Ingredient file")
    .setInputFiles(path.resolve("tests/fixtures/insumos-ejemplo.xlsx"));
  await dialog.getByLabel("Sheet", { exact: true }).click();
  await dialog
    .getByRole("option", { name: "Insumos", exact: true })
    .click();
  await dialog.getByLabel("Ingredient column").click();
  await dialog.getByRole("option", { name: /^Column 2/ }).click();
  await expect(dialog).toContainText("Formulas are not recalculated");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Ingredient 1", exact: false }),
  ).toHaveValue("Arroz");
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await page.getByRole("button", { name: "View list source" }).click();
  await expect(dialog).toContainText("Row 2: 0012 | Arroz | 80");
  await expect(dialog).toContainText("Insumos");
  await expect(dialog).toContainText("column 2 · with header");
});

test("foto sin OCR permite transcripción y cancelar reemplazo conserva lista", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?example=pe");
  await page
    .getByText("Ingredient lists", { exact: true })
    .click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ingredient file").setInputFiles({
    name: "ejemplo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3WQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(dialog).toContainText("AI list reading is not enabled on this server.");
  await dialog.getByLabel("Transcribe ingredients").fill("Arroz\nCebolla");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await dialog
    .getByRole("textbox", { name: "Ingredient 2", exact: false })
    .fill("Cebolla roja");
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await page.getByRole("button", { name: "Replace ingredient list" }).click();
  await dialog.getByLabel("Type or paste ingredients").fill("Aceite");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("checkbox", { name: /Cebolla roja/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Aceite/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "View list source" }).click();
  await expect(dialog).toContainText("Manually transcribed");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "2 ingredients reviewed" }),
  ).toHaveCount(0);
});

test("manual sin archivo y archivo inválido permiten recuperación", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page
    .getByText("Ingredient lists", { exact: true })
    .click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ingredient file").setInputFiles({
    name: "roto.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("not a zip"),
  });
  await expect(dialog.getByRole("alert")).toContainText("Import failed:");
  await dialog.getByLabel("Type or paste ingredients").fill("Arroz\nArroz");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await expect(
    page.getByRole("checkbox", { name: /Arroz/ }),
  ).toHaveCount(2);
});

test("a reviewed list never replaces an existing ingredient study or carries its supplier selection into another ingredient", async ({ page }) => {
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example", exact: true }).click();
  await page.getByRole("article").first().getByRole("button", { name: "Add to study" }).click();
  await page.getByText("Ingredient lists", { exact: true }).click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Type or paste ingredients").fill("Arroz\nAceite");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await page.getByRole("checkbox", { name: /Arroz/ }).uncheck();
  await expect(page.getByRole("checkbox", { name: /Aceite/ })).toBeChecked();
  await expect(page.getByRole("button", { name: "In my study", exact: true })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Arroz in Lima" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Research selected · 1", exact: true })).toBeDisabled();
  await expect(page.getByText("Supplier research is not enabled on this server.", { exact: false })).toBeVisible();
});

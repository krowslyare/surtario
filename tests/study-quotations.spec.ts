import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";
test("consulta de estudio se prepara y recupera sin crear una comparación ni enviar correo", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page
    .getByRole("article")
    .nth(2)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page.getByText("Study saved with 1 option", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prepare test request" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("cantidad todavía está por definir");
  await expect(dialog).toContainText("Not configured");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Send test request" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Guardados (1)" }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  await page.getByRole("button", { name: "View request" }).click();
  await expect(page.getByRole("dialog")).toContainText("Borrador");
  await expect(page.getByRole("dialog")).toContainText("Consulta de catálogo");
});

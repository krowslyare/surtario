import { expect, test } from "@playwright/test";
test("consulta de estudio se prepara y recupera sin crear una comparación ni enviar correo", async ({
  page,
  context,
}) => {
  await context.routeWebSocket(/.*/, (socket) => {
    if (!["localhost", "127.0.0.1"].includes(new URL(socket.url()).hostname))
      throw new Error("Local backend only");
    socket.connectToServer();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar ejemplo de arroz" }).click();
  await page
    .getByRole("article")
    .nth(2)
    .getByRole("button", { name: "Añadir a mi estudio" })
    .click();
  await page
    .getByRole("button", { name: "Guardar estudio", exact: true })
    .click();
  await expect(
    page.getByText("Estudio guardado con 1 opción", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Preparar solicitud de prueba" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("cantidad todavía está por definir");
  await expect(dialog).toContainText("Sin configurar");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Enviar solicitud de prueba" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: "Guardados (1)" }).click();
  await page
    .getByRole("button", { name: "Abrir estudio", exact: true })
    .click();
  await page.getByRole("button", { name: "Ver solicitud" }).click();
  await expect(page.getByRole("dialog")).toContainText("Borrador");
  await expect(page.getByRole("dialog")).toContainText("Consulta de catálogo");
});

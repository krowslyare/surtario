import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test("prepara correo desde comparación guardada sin enviar al faltar configuración", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?view=comparison");
  await expect(
    page.getByRole("button", { name: "Prepare test request" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prepare test request" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Arroz");
  await expect(dialog).toContainText("10");
  await expect(dialog).toContainText("Not configured");
  await expect(
    dialog.getByRole("button", { name: "Send test request" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await expect(
    dialog.getByRole("button", { name: "Send test request" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Copiar para WhatsApp" }).click();
  await expect(dialog).toContainText(
    "Texto copiado. No se envió ningún mensaje.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Arroz",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/quotation-mail-mobile.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.reload();
  await page
    .getByRole("button", { name: "Comparaciones guardadas (1)" })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await page.getByRole("button", { name: "View request" }).click();
  await expect(page.getByRole("dialog")).toContainText("Borrador");
  await expect(page.getByRole("dialog")).toContainText(
    "Todavía no hay respuestas vinculadas",
  );
});

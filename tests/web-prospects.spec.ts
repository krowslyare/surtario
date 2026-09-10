import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("fuente web sin precio se guarda como candidato y recupera su consulta", async ({
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
        markdown: null,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated: true,
  });
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Arroz · Lima/ }).click();
  await page
    .getByRole("button", { name: "Guardar posible distribuidor" })
    .click();
  const review = page.getByRole("dialog");
  await expect(
    review.getByRole("button", { name: "Guardar candidato", exact: true }),
  ).toBeDisabled();
  await review
    .getByLabel("Nombre del posible distribuidor")
    .fill("Distribuidor candidato E2E");
  await review
    .getByLabel("Contacto encontrado (opcional)")
    .fill("contacto@example.test");
  await review.getByRole("checkbox").check();
  await review
    .getByRole("button", { name: "Guardar candidato", exact: true })
    .click();
  await expect(review).toContainText("Candidato guardado.");
  await page.keyboard.press("Escape");
  await page.reload();
  const library = page.getByRole("region", {
    name: "Distribuidores web guardados",
  });
  await expect(library).toContainText("Distribuidor candidato E2E");
  await expect(library).toContainText("contacto@example.test");
  await expect(
    library.getByRole("link", { name: "Cotización web sintética" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.setViewportSize({ width: 390, height: 844 });
  await library.scrollIntoViewIfNeeded();
  expect(
    await library.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/web-prospect-mobile.png" });
  await library
    .getByRole("button", { name: "Preparar solicitud de prueba" })
    .click();
  const mail = page.getByRole("dialog");
  await expect(mail).toContainText("Sin configurar");
  await expect(mail).toContainText("cantidad todavía está por definir");
  await expect(mail).not.toContainText("contacto@example.test");
  await expect(mail.getByRole("checkbox")).not.toBeChecked();
  await expect(
    mail.getByRole("button", { name: "Enviar solicitud de prueba" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.reload();
  await library.getByRole("button", { name: "Ver solicitud" }).click();
  await expect(page.getByRole("dialog")).toContainText("Borrador");
});

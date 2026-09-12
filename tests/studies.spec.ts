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
  await page.getByRole("button", { name: "Explore rice example" }).click();
  const cards = page.getByRole("article");
  await cards.nth(0).getByRole("button", { name: "Add to study" }).click();
  await cards.nth(2).getByRole("button", { name: "Add to study" }).click();
  await expect(
    page.getByRole("button", { name: "Save study", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Saved studies", exact: true })
      .getByRole("status"),
  ).toContainText("Study saved with 2 options");
  await cards.nth(0).getByRole("button", { name: "In my study" }).click();
  await expect(
    page
      .getByRole("region", { name: "Saved studies", exact: true })
      .getByRole("status"),
  ).toHaveText("Cambios sin guardar");
  await page.reload();
  await page.getByRole("button", { name: "Guardados (1)" }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My market study" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByRole("button", { name: "View contact", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Dirección ficticia sin verificar",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await otherTab
    .getByRole("button", { name: "Open study", exact: true })
    .click();
  await page
    .getByRole("article")
    .nth(1)
    .getByRole("button", { name: "In my study" })
    .click();
  await page.getByRole("button", { name: "Save study changes" }).click();
  await expect(
    page
      .getByRole("region", { name: "Saved studies", exact: true })
      .getByRole("status"),
  ).toContainText("Study saved with 1 option");
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await expect(otherTab.getByText(/Revisión 2/)).toBeVisible();
  await otherTab.keyboard.press("Escape");
  await expect(otherTab.getByRole("dialog")).toHaveCount(0);
  // A reactive library update must not silently replace an open draft.
  await expect(otherTab.getByText("2 options in your study")).toBeVisible();
  await otherTab.getByRole("button", { name: "Save study changes" }).click();
  await expect(otherTab.getByRole("alert")).toContainText(
    "cambió en otra vista",
  );
  await otherTab.getByRole("button", { name: "Guardados (1)" }).click();
  await otherTab
    .getByRole("button", { name: "Open study", exact: true })
    .click();
  await expect(otherTab.getByText("1 option in your study")).toBeVisible();

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
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to study" })
    .click();
  await expect(
    page.getByRole("button", { name: "Save study", exact: true }),
  ).toBeEnabled();
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Save study", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Sin conexión al guardado.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("1 option in your study")).toBeVisible();
  await context.setOffline(false);
  await expect(
    page.getByRole("button", { name: "Save study", exact: true }),
  ).toBeEnabled();
});

test("volver al ejemplo después de una búsqueda vacía conserva la selección", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to study" })
    .click();
  await page
    .getByRole("button", { name: "Cambiar búsqueda", exact: true })
    .click();
  await page.getByLabel("Ingredient or category").fill("Pescado");
  await page
    .getByRole("button", { name: "Explore example", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Saved studies", exact: true })
      .getByRole("status"),
  ).toHaveText(
    "El guardado de esta demo solo está disponible para arroz o abarrotes en Lima.",
  );
  await page.getByRole("button", { name: "View rice example" }).click();
  await expect(
    page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "In my study" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("ensayo de demo: investigar, recuperar, consultar y preparar compra", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await test.step("Explorar sin documentos y revisar evidencia", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Explore rice example" }).click();
    await expect(page.getByLabel("Required quantity")).toHaveCount(0);
    await page
      .getByRole("button", { name: "View example source", exact: false })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Este ejemplo no procede de una búsqueda real",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const card of (await page.getByRole("article").all()).slice(0, 3)) {
      await card.getByRole("button", { name: "Add to study" }).click();
    }
  });
  await test.step("Guardar y recuperar el estudio en Convex local", async () => {
    await page.getByRole("button", { name: "Save study", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Saved studies", exact: true })
        .getByRole("status"),
    ).toContainText("Study saved with 3 options");
    await page.reload();
    await page.getByRole("button", { name: "Guardados (1)" }).click();
    await page.getByRole("button", { name: "Open study", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(3);
  });
  await test.step("Consultar un distribuidor sin precio, sin simular envío", async () => {
    const directory = page
      .getByRole("article")
      .filter({ hasText: "Distribuidor C" });
    await directory.getByRole("button", { name: "View contact" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Dirección ficticia sin verificar",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await directory.getByRole("button", { name: "Prepare inquiry" }).click();
    await expect(page.getByLabel("Edit message")).toHaveValue(
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
      .getByRole("button", { name: "Plan purchase", exact: true })
      .click();
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Enter quantity and terms" })
      .click();
    await expect(page.getByLabel("Required quantity")).toHaveValue("");
    await page.getByLabel("Required quantity").fill("10");
    await expect(page.getByTestId("total-0")).toHaveText("Pending");
    await expect(page.getByTestId("total-1")).toHaveText("Pending");
  });
  await test.step("Completar condiciones sintéticas y comprobar el desembolso", async () => {
    // Rehearsal fallback only: these values are not a received supplier response.
    for (const [supplier, freight] of [
      ["Distribuidor A · ejemplo", "15"],
      ["Distribuidor B · ejemplo", "0"],
    ]) {
      await page.getByRole("button", { name: `Editar ${supplier}` }).click();
      await page.getByLabel("Minimum packs", { exact: true }).fill("1");
      await page
        .getByLabel("Delivery per order", { exact: true })
        .fill(freight);
      await page
        .getByLabel("Tax on goods and delivery", { exact: true })
        .click();
      await page
        .getByRole("option", {
          name: "Final amounts, including tax",
          exact: true,
        })
        .click();
      await page
        .getByRole("checkbox", {
          name: "The supplier can deliver when I need it",
        })
        .check();
      await page.getByRole("button", { name: "Save offer" }).click();
    }
    await expect(page.getByTestId("total-0")).toHaveText("S/ 95.00");
    await expect(page.getByTestId("total-1")).toHaveText("S/ 50.00");
    await page.getByRole("button", { name: "View source" }).first().click();
    await expect(page.getByRole("dialog")).toContainText(
      "Aquí conservamos los valores de entrada",
    );
    await expect(page.getByRole("dialog")).toContainText("S/ 80.00");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Required quantity").fill("20");
    await expect(page.getByTestId("total-0")).toHaveText("S/ 175.00");
    await expect(page.getByTestId("total-1")).toHaveText("S/ 100.00");
    await page.getByRole("button", { name: "Back to market study" }).click();
    await expect(page.getByText("3 options in your study")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

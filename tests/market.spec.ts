import { test, expect } from "@playwright/test";

test("investiga sin documentos ni cantidad y conserva un contacto sin precio", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await expect(page.getByLabel("Required quantity")).toHaveCount(0);
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "No price", exact: true }).click();
  const distributor = page.getByRole("article");
  await expect(distributor).toHaveCount(1);
  await expect(distributor).not.toContainText("S/");
  await distributor.getByRole("button", { name: "View contact" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Fictional address",
  );
  await page.keyboard.press("Escape");
  await distributor
    .getByRole("button", { name: "Add to study" })
    .click();
  await page
    .getByRole("button", { name: "My study", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "My market study" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Plan purchase", exact: true }),
  ).toBeDisabled();
});

test("el estudio continúa opcionalmente a compra sin inventar condiciones", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  for (const article of (await page.getByRole("article").all()).slice(0, 3)) {
    await article.getByRole("button", { name: "Add to study" }).click();
  }
  await page
    .getByRole("button", { name: "Plan purchase", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("they do not become offers");
  await expect(
    dialog.getByRole("button", { name: "Enter quantity and terms" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Enter quantity and terms" })
    .click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await page.getByLabel("Required quantity").fill("10");
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await expect(page.getByTestId("total-1")).toHaveText("Pending");
  await page.getByRole("button", { name: "View source" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Catalog example");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Restore selection" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore selection" })
    .click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await page
    .getByRole("button", { name: "Back to market study" })
    .click();
  await expect(page.getByText("3 options in your study")).toBeVisible();
  expect(errors).toEqual([]);
});

test("búsqueda vacía y falta de cobertura del ejemplo se explican", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page
    .getByRole("button", { name: "Explore example", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Enter an ingredient");
  await page.getByLabel("Ingredient or category").fill("Pescado");
  await page
    .getByRole("button", { name: "Explore example", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No examples match this search" }),
  ).toBeVisible();
  await expect(
    page.getByText("This does not mean there are no suppliers.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View rice example" }).click();
  await page
    .getByRole("button", { name: "Change search", exact: true })
    .click();
  await page.getByLabel("Delivery area").fill("Cusco");
  await page
    .getByRole("button", { name: "Explore example", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("prepara una consulta de mercado editable sin enviar mensajes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") writes.push(request.url());
  });
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("button", { name: "Prepare inquiry", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Edit message")).toHaveValue(
    /I have not set a purchase quantity/,
  );
  await page
    .getByLabel("Edit message")
    .fill("Catalog request de ejemplo");
  await expect(page.getByRole("dialog")).toContainText(
    "Copying this text does not send an email.",
  );
  await expect(
    page.getByRole("button", { name: "Copy text" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  expect(writes).toEqual([]);
});

for (const width of [320, 390, 768, 1280, 1920]) {
  test(`exploración y fuentes legibles a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
    await page.goto("/?example=pe");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Explore rice example" })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const sourceButton = page.getByRole("button", {
      name: "View contact",
    });
    await sourceButton.click();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(sourceButton).toBeFocused();
  });
}

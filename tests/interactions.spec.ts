import { expect, test } from "@playwright/test";

test("selector con teclado y Escape dentro de un diálogo conserva foco y formulario", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  const zone = page.getByRole("combobox", { name: "Delivery area" });
  await zone.focus();
  await zone.fill("Austin, TX, US");
  await expect(zone).toHaveValue("Austin, TX, US");
  await expect(zone).toBeFocused();

  await page.goto("/?view=comparison&example=pe");
  const opener = page.getByRole("button", { name: "Edit Proveedor A" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  const currency = dialog.getByRole("combobox", {
    name: "Currency",
    exact: true,
  });
  await currency.focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(currency).toBeFocused();
  await currency.press("Enter");
  await expect(
    dialog.getByRole("option", { name: "Peruvian soles (PEN)", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    dialog.getByRole("option", { name: "US dollars (USD)", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(currency).toContainText("US dollars (USD)");
  await dialog.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("USD 95.00");
  await opener.click();
  await expect(
    dialog.getByRole("combobox", { name: "Currency", exact: true }),
  ).toContainText("US dollars (USD)");
  // Padding is part of the panel, not its backdrop.
  await dialog.click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("contraer herramientas retira controles del teclado y conserva correcciones", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  const tools = page.getByRole("button", {
    name: "Supplier quotes",
    exact: true,
  });
  const review = page.getByRole("button", {
    name: "Review sample quote",
  });
  await expect(review).toHaveCount(0);
  await tools.click();
  await review.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Package size", { exact: true }).fill("27");
  const unit = dialog.getByRole("combobox", {
    name: "Package unit",
  });
  await unit.click();
  await dialog.getByRole("option", { name: "kg", exact: true }).click();
  await unit.click();
  await dialog.getByRole("option", { name: "Pending", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Continue to comparison" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await tools.click();
  await expect(tools).toHaveAttribute("aria-expanded", "false");
  await expect(review).toHaveCount(0);
  await tools.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Ingredient lists", exact: true }),
  ).toBeFocused();
  await tools.click();
  await review.click();
  await expect(dialog.getByLabel("Package size", { exact: true })).toHaveValue(
    "27",
  );
  await expect(
    dialog.getByRole("combobox", { name: "Package unit" }),
  ).toContainText("Pending");
});

test("menú y diálogo funcionan con movimiento reducido a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=comparison&example=pe");
  await page.getByRole("button", { name: "Edit Proveedor A" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Tax on goods and delivery" })
    .click();
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return (
        rect.left >= 0 &&
        rect.right <= innerWidth &&
        getComputedStyle(element).animationName === "none"
      );
    }),
  ).toBe(true);
  await menu
    .getByRole("option", { name: "Tax still needs to be added" })
    .click();
  await dialog.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("selección móvil anuncia el cambio y lleva al resumen sin iniciar una compra", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?example=pe");
  await expect(
    page.getByRole("button", { name: "My study", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page.getByRole("button", { name: "No price", exact: true }).click();
  await page
    .getByRole("article")
    .getByRole("button", { name: "Add to study" })
    .click();
  await expect(
    page.getByRole("status", { name: "Study selection" }),
  ).toContainText("added to study");
  // Filtering to one result can already place the summary in the viewport.
  const summary = page.locator("#study-summary");
  const shortcut = page.getByRole("button", { name: "View summary 1", exact: true });
  await summary.scrollIntoViewIfNeeded();
  await expect(summary).toBeInViewport({ ratio: 0.15 });
  await expect(shortcut).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(summary).not.toBeInViewport();
  await expect(shortcut).toBeVisible();
  await shortcut.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Your study", exact: true }),
  ).toBeFocused();
  const picks = page.getByRole("list", { name: "Selected options" });
  await expect(picks).toContainText("Distribuidor C");
  await expect(
    page.getByRole("button", { name: "Plan purchase", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Required quantity")).toHaveCount(0);
  expect(
    await picks
      .locator("li")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

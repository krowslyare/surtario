import { test, expect } from "@playwright/test";

test("revisa evidencia, conserva pendientes y prepara comparación sin compra", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page.getByText("Supplier quotes", { exact: true }).click();
  await page.getByRole("button", { name: "Review sample quote" }).click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(dialog).toContainText("The source content is synthetic");
  await expect(dialog).toContainText("Saco: S/ 80.00");
  await expect(dialog.getByLabel("Package size", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Package unit", { exact: true })).toContainText("Pending");
  await expect(dialog.locator(".source-record pre")).not.toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Continue to comparison" }),
  ).toBeDisabled();

  await dialog.getByLabel("Package unit", { exact: true }).click();
  await page.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Package size", { exact: true }).fill("18");
  await dialog.getByLabel("Price per package", { exact: true }).fill("85");
  await expect(dialog.getByText("Manually corrected")).toHaveCount(3);
  const priceEvidence = dialog.getByRole("button", {
    name: "Source evidence for Price per package",
    exact: true,
  });
  await priceEvidence.focus();
  await page.keyboard.press("Enter");
  const evidencePanel = dialog.locator(`#${await priceEvidence.getAttribute("aria-controls")}`);
  await expect(priceEvidence).toHaveAttribute("aria-expanded", "true");
  await expect(evidencePanel).toContainText("Original proposal: 80.00");
  await expect(evidencePanel).toContainText("Saco: S/ 80.00");
  await priceEvidence.press("Enter");
  await expect(evidencePanel).toHaveAttribute("aria-hidden", "true");
  await expect(evidencePanel).toHaveAttribute("inert", "");
  await dialog
    .getByLabel(
      "I reviewed the source and confirm the data, including my corrections",
    )
    .check();
  await dialog.getByRole("button", { name: "Continue to comparison" }).click();

  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await page.getByRole("button", { name: "View source" }).click();
  const sourceDialog = page.getByRole("dialog");
  await expect(sourceDialog).toContainText("Distribuidora de ejemplo");
  await expect(sourceDialog).toContainText("manual correction: 18");
  await expect(sourceDialog).toContainText("manual correction: kg");
  await expect(sourceDialog).toContainText("Price per package: 80.00");
  await expect(sourceDialog).toContainText("manual correction: 85");
  await expect(sourceDialog).toContainText("Price when confirmed");
  await expect(sourceDialog).not.toContainText("Original price");
});

test("el diálogo conserva el borrador y no desborda a 320 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/?example=pe");
  await page.getByText("Supplier quotes", { exact: true }).click();
  const trigger = page.getByRole("button", {
    name: "Review sample quote",
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Package size", { exact: true }).fill("18");
  await dialog.getByLabel("Price per package", { exact: true }).focus();
  expect(
    await dialog.evaluate((element) => {
      const header = element.querySelector(".dialog-head")!.getBoundingClientRect();
      const panel = element.getBoundingClientRect();
      return header.top >= panel.top && header.bottom <= panel.bottom;
    }),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Package size", { exact: true })).toHaveValue("18");
});

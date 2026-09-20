import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

for (const peru of [false, true]) {
  test(`direct comparison uses ${peru ? "explicit Peru" : "default English"} example and accessible menu focus`, async ({ page, context }, testInfo) => {
    await connectOnlyToLocalBackend(context);
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto(`/?view=comparison${peru ? "&example=pe" : ""}`);
    await expect(page.getByLabel("Ingredient", {exact: true})).toHaveValue(peru ? "Arroz" : "Rice");
    await expect(page.getByLabel("Specification / quality", {exact: true})).toHaveValue(peru ? "Arroz blanco, misma calidad confirmada" : "Long-grain white rice");
    await expect(page.getByRole("heading", {name: peru ? "Proveedor A" : "Supplier A", exact: true})).toBeVisible();
    if (!peru) await expect(page.locator("#comparison")).not.toContainText("S/");
    const figures = page.getByLabel("Recommended offer figures", { exact: true });
    await expect(figures.getByRole("definition")).toHaveText(peru ? ["S/ 50.00", "0 kg"] : ["USD 35.00", "10 lb"]);
    await page.getByLabel("Required quantity").fill("");
    await expect(figures).toHaveCount(0);
    await page.getByLabel("Required quantity").fill(peru ? "10" : "40");
    await expect(figures).toBeVisible();
    const unit = page.getByRole("combobox", {name: "Unit", exact: true});
    await unit.focus();
    await page.keyboard.press("ArrowDown");
    const focused = page.locator(".surtario-select-item:focus");
    await expect(focused).toHaveText(peru ? "kg" : "lb");
    await expect(focused).toHaveCSS("outline-color", "rgb(66, 32, 45)");
    await expect(focused).toHaveCSS("outline-offset", "-2px");
    await page.screenshot({path: testInfo.outputPath("menu-desktop.png")});
    await page.keyboard.press("ArrowDown");
    await expect(focused).toHaveText(peru ? "lb" : "L");
    await page.keyboard.press("Escape");
    await expect(unit).toBeFocused();
    await expect(unit).toHaveText(peru ? "kg" : "lb");
    await page.setViewportSize({width: 390, height: 844});
    await unit.click();
    await page.screenshot({path: testInfo.outputPath("menu-mobile.png")});
  });
}

for (const peru of [false, true]) {
  test(`sample ${peru ? "PEN/kg" : "USD/lb"} saves, selects and recovers after reload`, async ({ page, context }) => {
    await connectOnlyToLocalBackend(context);
    await page.goto(`/?view=comparison${peru ? "&example=pe" : ""}`);
    await page.getByRole("button", { name: "Save comparison", exact: true }).click();
    await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: false })).toBeVisible();
    const supplier = peru ? "Proveedor B" : "Supplier B";
    await page.getByRole("article", { name: `Offer from ${supplier}` }).getByRole("button", { name: "Choose offer" }).click();
    await page.getByRole("button", { name: "Save comparison changes", exact: true }).click();
    await expect(page.getByText("Comparison saved with a selected offer", { exact: false })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Saved comparisons (1)", exact: true }).click();
    await page.getByRole("button", { name: "Open comparison", exact: true }).click();
    await expect(page.getByLabel("Required quantity")).toHaveValue(peru ? "10" : "40");
    await expect(page.getByRole("combobox", { name: "Unit", exact: true })).toHaveText(peru ? "kg" : "lb");
    await expect(page.getByTestId("total-1")).toHaveText(peru ? "S/ 50.00" : "USD 35.00");
    await expect(page.getByRole("article", { name: `Offer from ${supplier}` }).getByRole("button", { name: "Selected offer" })).toHaveAttribute("aria-pressed", "true");
  });
}

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

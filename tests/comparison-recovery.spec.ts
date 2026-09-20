import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({ context, page }) => {
  await connectOnlyToLocalBackend(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("comparison preferences and invalid input survive Messages, Back and reload", async ({ page }) => {
  await page.goto("/?view=comparison");
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  const preferences = advisor.getByRole("button", { name: /^Budget and preferences/ });
  await preferences.click();
  await advisor.getByRole("combobox", { name: /^Priority/ }).selectOption("cash");
  await advisor.getByLabel("Preferred supplier").selectOption({ label: "Supplier B" });
  await advisor.getByLabel("Available budget").fill("45.50");
  await advisor.getByLabel("Confirmed daily usage").fill("5");
  await advisor.getByLabel("Confirmed current stock").fill("0");
  await advisor.getByLabel("Maximum coverage days").fill("30");

  for (const navigation of ["back", "reload"]) {
    if (navigation === "back") {
      await page.getByRole("button", { name: "Messages", exact: true }).click();
      await expect(page.locator("#messages-main")).toBeVisible();
      await page.goBack();
    } else await page.reload();
    await expect(preferences).toContainText("Cash priority · Budget: USD 45.50");
    await preferences.click();
    await expect(advisor.getByRole("combobox", { name: /^Priority/ })).toHaveValue("cash");
    await expect(advisor.getByLabel("Preferred supplier").locator("option:checked")).toHaveText("Supplier B");
    await expect(advisor.getByLabel("Available budget")).toHaveValue("45.50");
    await expect(advisor.getByLabel("Confirmed daily usage")).toHaveValue("5");
    await expect(advisor.getByLabel("Confirmed current stock")).toHaveValue("0");
    await expect(advisor.getByLabel("Maximum coverage days")).toHaveValue("30");
  }

  await advisor.getByLabel("Available budget").fill("abc");
  await page.reload();
  await preferences.click();
  await expect(advisor.getByLabel("Available budget")).toHaveValue("abc");
  await expect(advisor.getByRole("alert")).toContainText("Review the context values");
  await expect(advisor.getByRole("button", { name: /Save.*(?:buying options|AI analysis)/ })).toBeDisabled();
  await advisor.getByLabel("Available budget").fill("45.50");
  await expect(advisor.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Restore example", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore example", exact: true }).click();
  await expect(preferences).toContainText("Balanced priority");
  await preferences.click();
  await expect(advisor.getByLabel("Available budget")).toHaveValue("");
  await expect(advisor.getByLabel("Confirmed current stock")).toHaveValue("");
});

for (const origin of ["example", "study"] as const) {
  test(`restoring the ${origin} removes draft edits after Back and reload`, async ({ page }) => {
    await page.goto(origin === "example" ? "/?view=comparison" : "/?view=market");
    if (origin === "study") {
      await page.getByRole("button", { name: "Explore rice example" }).click();
      await page.getByRole("article").first().getByRole("button", { name: "Add to study" }).click();
      await page.getByRole("button", { name: "Plan purchase", exact: true }).click();
      await page.getByRole("dialog").getByRole("checkbox").check();
      await page.getByRole("button", { name: "Enter quantity and terms" }).click();
    }
    const ingredient = page.getByLabel("Ingredient", { exact: true });
    const originalIngredient = await ingredient.inputValue();
    const quantity = page.getByLabel("Required quantity", { exact: true });
    const originalQuantity = await quantity.inputValue();
    const edit = page.getByRole("button", { name: /^Edit (?:Supplier A|Cascade Pantry)/ });
    await edit.click();
    const originalPrice = await page.getByLabel("Price per pack").inputValue();
    await page.getByLabel("Price per pack").fill("99");
    await page.getByRole("button", { name: "Save offer", exact: true }).click();
    await ingredient.fill("Edited ingredient");
    await quantity.fill("63");
    await page.getByRole("button", { name: "Messages", exact: true }).click();
    await expect(page.locator("#messages-main")).toBeVisible();
    await page.goBack();
    await expect(ingredient).toHaveValue("Edited ingredient");
    await page.reload();
    await expect(ingredient).toHaveValue("Edited ingredient");
    await expect(quantity).toHaveValue("63");
    await edit.click();
    await expect(page.getByLabel("Price per pack")).toHaveValue("99");
    await page.keyboard.press("Escape");
    const label = origin === "study" ? "Restore selection" : "Restore example";
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: label, exact: true }).click();
    await expect(ingredient).toHaveValue(originalIngredient);
    await expect(quantity).toHaveValue(originalQuantity);
    await edit.click();
    await expect(page.getByLabel("Price per pack")).toHaveValue(originalPrice);
    await page.keyboard.press("Escape");
  });
}

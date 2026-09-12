import { expect, test, type Page } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test.beforeEach(async ({ context }) => {
  await connectOnlyToLocalBackend(context);
});

async function confirmOfferTerms(
  page: Page,
  supplier: string,
  freight: string | null,
) {
  await page.getByRole("button", { name: `Edit ${supplier}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minimum packs").fill("1");
  await dialog
    .getByLabel("Delivery per order", { exact: true })
    .fill(freight ?? "");
  await dialog
    .getByLabel("Tax on goods and delivery")
    .selectOption("included");
  await dialog
    .getByLabel("The supplier can deliver when I need it")
    .check();
  await dialog.getByRole("button", { name: "Save offer" }).click();
}

test("a missing delivery quote stays hypothetical until its terms are confirmed", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  const results = page.getByRole("article");
  await results.nth(0).getByRole("button", { name: "Add to study" }).click();
  await results.nth(1).getByRole("button", { name: "Add to study" }).click();
  await page.getByRole("button", { name: "Plan purchase", exact: true }).click();
  const planning = page.getByRole("dialog");
  await planning.getByRole("checkbox").check();
  await planning
    .getByRole("button", { name: "Enter quantity and terms" })
    .click();
  await page.getByLabel("Required quantity").fill("40");

  await confirmOfferTerms(
    page,
    "Cascade Pantry Supply · fictional example",
    "0",
  );
  await confirmOfferTerms(
    page,
    "Rose City Foodservice · fictional example",
    null,
  );

  await expect(page.getByTestId("total-0")).toHaveText("USD 40.00");
  await expect(page.getByTestId("total-1")).toHaveText("Pending");
  const insight = page.getByRole("region", { name: "Resolve missing terms" });
  await expect(insight).toContainText("USD 5.00 or less");

  await insight
    .getByRole("button", { name: "Prepare supplier question" })
    .click();
  const scenario = page.getByRole("dialog", {
    name: "Resolve the delivery cost",
  });
  await scenario.getByLabel("Try a delivery amount (USD)").fill("8");
  await expect(scenario.getByRole("status")).toContainText(
    "Hypothetical order: USD 43.00",
  );
  await expect(scenario.getByRole("status")).toContainText(
    "USD 3.00 above the lowest complete order",
  );
  await expect(page.getByTestId("total-1")).toHaveText("Pending");

  await scenario.getByRole("button", { name: "Enter confirmed terms" }).click();
  const editor = page.getByRole("dialog", { name: "Edit offer" });
  await editor.getByLabel("Delivery per order", { exact: true }).fill("8");
  await editor.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-1")).toHaveText("USD 43.00");

  await page
    .getByRole("button", {
      name: "Edit Rose City Foodservice · fictional example",
    })
    .click();
  const reopenedEditor = page.getByRole("dialog", { name: "Edit offer" });
  await reopenedEditor
    .getByLabel("Delivery per order", { exact: true })
    .fill("");
  await reopenedEditor.getByRole("button", { name: "Save offer" }).click();
  await expect(insight).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Resolve the delivery cost" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("total-1")).toHaveText("Pending");
  expect(errors).toEqual([]);
});

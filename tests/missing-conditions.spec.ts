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
  await dialog.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page
    .getByRole("option", { name: "Final amounts, including tax", exact: true })
    .click();
  await dialog.getByLabel("The supplier can deliver when I need it").check();
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
  await page
    .getByRole("button", { name: "Plan purchase", exact: true })
    .click();
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
  await page.getByText("Decision context · optional", { exact: true }).click();
  await page
    .getByRole("combobox", { name: /Priority/ })
    .selectOption("unit_price");

  await insight
    .getByRole("button", { name: "Prepare supplier question" })
    .click();
  const scenario = page.getByRole("dialog", {
    name: "Resolve the delivery cost",
  });
  await scenario.getByLabel("Try a delivery amount (USD)").fill("8");
  await expect(
    scenario.getByRole("status").filter({ hasText: "Hypothetical order:" }),
  ).toContainText("Hypothetical order: USD 43.00");
  await expect(
    scenario.getByRole("status").filter({ hasText: "Hypothetical order:" }),
  ).toContainText("USD 3.00 above the lowest complete order");
  await expect(page.getByTestId("total-1")).toHaveText("Pending");

  await expect(scenario.getByLabel("Possible decision change")).toContainText(
    "Choose Rose City",
  );
  await expect(scenario.getByLabel("Possible decision change")).toContainText(
    "unit price priority",
  );
  const confirm = scenario.getByRole("button", {
    name: "Confirm answer and update decision",
  });
  await expect(confirm).toBeDisabled();
  await scenario.getByRole("checkbox").check();
  await scenario.getByLabel("Try a delivery amount (USD)").fill("3");
  await expect(confirm).toBeDisabled();
  await expect(scenario.getByLabel("Possible decision change")).toContainText(
    "Choose Rose City",
  );
  await scenario.getByRole("checkbox").check();
  await confirm.click();
  const outcome = page.getByRole("region", { name: "Answer and decision" });
  await expect(outcome).toBeFocused();
  await expect(outcome).toContainText("Your answer changed the next step");
  await expect(outcome).toContainText("Updated order: USD 38.00");
  await expect(outcome).toContainText("USD 2.00 below");
  await expect(outcome.getByLabel("Decision change")).toContainText(
    "Find another verifiable offer",
  );
  await expect(outcome.getByLabel("Decision change")).toContainText(
    "Choose Rose City",
  );
  await expect(page.getByTestId("total-1")).toHaveText("USD 38.00");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await outcome.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await outcome.screenshot({
    path: "/tmp/surtario-decision-followthrough-mobile.png",
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await outcome.screenshot({
    path: "/tmp/surtario-decision-followthrough-desktop.png",
  });
  await outcome
    .getByRole("button", { name: "Save updated comparison" })
    .click();
  await expect(
    outcome.getByRole("button", { name: "Confirmed terms saved" }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Saved comparisons (1)" }).click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByTestId("total-1")).toHaveText("USD 38.00");

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

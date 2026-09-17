import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

// Writes synthetic scenarios only. Provider calls remain disabled.
test.beforeEach(async ({ context }) => {
  await connectOnlyToLocalBackend(context);
});

test("one action saves the comparison and scenario, then stale inputs stay visible", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=comparison&example=pe");
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  expect(
    await page.locator(".advisor-panel").evaluate((advisorPanel) => {
      const comparison = document.querySelector("#comparison");
      return Boolean(
        comparison &&
        advisorPanel.compareDocumentPosition(comparison) &
          Node.DOCUMENT_POSITION_PRECEDING,
      );
    }),
  ).toBe(true);
  await advisor.getByText("Budget and preferences").click();
  await advisor.getByLabel("Priority").selectOption("cash");
  await advisor.getByLabel("Available budget").fill("60");
  await expect(advisor.getByLabel("Confirmed current stock")).toHaveValue("");
  await expect(
    advisor.getByRole("button", {
      name: "Save buying options",
    }),
  ).toBeEnabled();
  await expect(advisor.getByLabel("Priority")).toHaveValue("cash");
  await expect(advisor.getByLabel("Available budget")).toHaveValue("60");
  await advisor
    .getByRole("button", { name: "Save buying options" })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved comparisons (1)" }),
  ).toBeVisible();
  await expect(
    advisor.getByText("Saved", { exact: true }),
  ).toBeVisible();
  await expect(advisor.locator(".advisor-verdict")).toContainText(
    "Proveedor B",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Saved comparisons (1)" })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await advisor.getByText("Restore scenarios (1)").click();
  await advisor.getByRole("button", { name: /Scenario .* · Cash/ }).click();
  await advisor.getByText("Budget and preferences").click();
  await expect(advisor.getByLabel("Available budget")).toHaveValue("60");
  await expect(advisor.getByLabel("Confirmed current stock")).toHaveValue("");
  await expect(advisor.getByText(/out of date for this view/i)).toHaveCount(0);
  await page.getByLabel("Required quantity").fill("20");
  await expect(advisor.getByText(/out of date for this view/i)).toBeVisible();
  await advisor.getByLabel("Available budget").fill("abc");
  await expect(advisor.getByRole("alert")).toContainText("Review the context values");
  await expect(
    advisor.getByRole("button", {
      name: "Save buying options",
    }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("a matching saved scenario is restored without preparing another run", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  await advisor
    .getByRole("button", { name: "Save buying options" })
    .click();
  await expect(
    advisor.getByText("Saved", { exact: true }),
  ).toBeVisible();
  await expect(advisor.getByText("Restore scenarios (1)")).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: "Saved comparisons (1)" })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(
    advisor.getByText("Saved", { exact: true }),
  ).toBeVisible();
  await expect(advisor.getByText("Restore scenarios (1)")).toBeVisible();
  await expect(advisor.locator(".advisor-actions button")).toHaveCount(0);
  await expect(advisor.getByText(/save the calculation/)).toHaveCount(0);
});

test("removing an offer before the first save keeps the new scenario current", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  await page
    .getByRole("button", { name: "Remove offer", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove offer", exact: true })
    .click();

  await advisor
    .getByRole("button", { name: "Save buying options" })
    .click();
  await expect(
    advisor.getByText("Saved", { exact: true }),
  ).toBeVisible();
  await expect(advisor.getByText(/out of date for this view/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Proveedor B" }).click();
  await page.getByLabel("Price per pack").fill("96");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(advisor.getByText(/out of date for this view/i)).toBeVisible();
});

test("pending quantity stays blocked after the comparison is saved", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  await expect(page.locator(".workspace-content")).not.toHaveAttribute("inert");
  await page.getByLabel("Required quantity").fill("");
  await expect(
    advisor.getByRole("button", {
      name: "Save buying options",
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved", { exact: false }),
  ).toBeVisible();
  await expect(
    advisor.getByRole("button", { name: "Save scenario" }),
  ).toBeDisabled();
  await expect(advisor.getByText(/valid quantity/i)).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`context and negotiation remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=comparison&example=pe");
    const advisor = page.getByRole("region", { name: "Purchasing advisor" });
    await advisor.getByText("Budget and preferences").click();
    await advisor
      .getByLabel("Preferred supplier")
      .selectOption("rice-supplier-a");
    await advisor.getByLabel("Confirmed daily usage").fill("1");
    await advisor.getByLabel("Confirmed current stock").fill("2");
    await advisor.getByText("Prepare supplier conversation").click();
    await expect(advisor.locator(".quotation-text")).toContainText(
      "Proveedor B",
    );
    await advisor
      .getByText("Compare supplier totals")
      .click();
    await expect(advisor.locator(".advisor-alternatives")).toContainText(
      "20 days",
    );
    await expect(advisor.locator(".advisor-alternatives")).toContainText(
      "12 days",
    );
    await advisor.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await advisor.screenshot({ path: `/tmp/procurement-advisor-${width}.png` });
  });
}

import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test("study purchase keeps its case through save, recovery and repeated opening", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page.getByRole("button", { name: "Research a question", exact: true }).click();
  await page
    .getByRole("textbox", { name: "What would you like to find out?" })
    .fill("Keep the study comparison in this case");
  await page.getByRole("button", { name: "Save research question" }).click();
  await expect(page).toHaveURL(/view=followup.*case=/);
  const followupUrl = page.url();
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await expect(page).toHaveURL(/view=market/);
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to study" })
    .click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await page.getByRole("button", { name: "Continue your work", exact: true }).click();
  await page.getByRole("dialog", { name: "Your recent work" }).getByRole("listitem")
    .filter({ hasText: "Keep the study comparison in this case" })
    .getByRole("button", { name: "Open follow-up", exact: true }).click();
  await page.getByRole("button", { name: "Link current saved study" }).click();
  await expect(page.getByRole("button", { name: "Open linked study", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  const { runLocalConvex } = await import("./e2e-local");
  const status = JSON.parse(runLocalConvex(["run", "sourcing:status", "{}"]));
  const tracking = page.getByRole("button", { name: /Price tracking/ });
  if (status.watchEnabled) {
    await tracking.click();
    await expect(page.getByRole("region", { name: "Source watches", exact: true }))
      .toContainText("Demo examples and contacts without prices cannot be tracked");
  } else await expect(tracking).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(followupUrl);
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await page.getByRole("button", { name: /^My study/ }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  // The follow-up is not active: linking must use the saved study, not the visible destination.
  await page
    .getByRole("button", { name: "Plan purchase", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enter quantity and terms" }).click();
  await page.getByLabel("Required quantity", { exact: true }).fill("25");
  await page.getByRole("button", { name: /Edit Cascade Pantry/ }).click();
  const offerDialog = page.getByRole("dialog");
  await offerDialog.getByLabel("Minimum packs").fill("1");
  await offerDialog.getByLabel("Delivery per order", { exact: true }).fill("0");
  await offerDialog.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page.getByRole("option", { name: "Final amounts, including tax", exact: true }).click();
  await offerDialog.getByLabel("The supplier can deliver when I need it").check();
  await offerDialog.getByRole("button", { name: "Save offer" }).click();
  await page.getByRole("button", { name: "Choose offer", exact: true }).click();
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved with a selected offer. Save again after making changes.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to market study" }).click();
  await page.getByRole("button", { name: "Open supplier follow-up", exact: true }).click();
  await expect(page).toHaveURL(followupUrl);
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(page.getByRole("region", { name: "Case history", exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Case history" }),
  ).toContainText("Reviewed comparison saved");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("region", { name: "Next step for this case" })
    .getByRole("button", { name: "Open case comparison" })
    .click();
  await expect(
    page.getByLabel("Required quantity", { exact: true }),
  ).toHaveValue("25");
  await expect(page.getByRole("button", { name: "Selected offer", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save comparison changes", exact: true }).click();
  await expect(page.getByText("Comparison saved with a selected offer. Save again after making changes.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back to follow-up", exact: true }).click();
  await expect(page).toHaveURL(followupUrl);
  await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "Calculate purchase", exact: true })
    .click();
  await expect(
    page.getByLabel("Required quantity", { exact: true }),
  ).toHaveValue("25");
  await expect(page.getByRole("button", { name: "Selected offer", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Saved comparisons (1)" }),
  ).toBeVisible();
});

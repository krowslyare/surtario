import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";
test("consulta de estudio se prepara y recupera sin crear una comparación ni enviar correo", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("article")
    .nth(2)
    .getByRole("button", { name: "Add to study" })
    .click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page.getByText("Study saved with 1 option", { exact: false }),
  ).toBeVisible();
  await page.getByRole("article").filter({ hasText: "Distribuidor C" }).getByRole("button", { name: "Prepare inquiry", exact: true }).click();
  await expect(page).toHaveURL(/view=followup.*case=.*message=/);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Quantity is still to be determined");
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Send test request" }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Edit saved message", exact: true })
    .click();
  await dialog
    .getByLabel("Message subject", { exact: true })
    .fill("Catalog request - clarify delivery");
  await dialog
    .getByRole("textbox", { name: "Message text", exact: true })
    .fill(
      "Please clarify delivery and minimum order. This is an inquiry, not an order.",
    );
  await dialog
    .getByRole("button", { name: "Save message revision", exact: true })
    .click();
  await expect(dialog).toContainText(
    "Message saved. Review this version before approving the send.",
  );
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("group", { name: "Research sections" }).getByRole("button", { name: "Overview", exact: true }).click();
  const nextStep = page.getByRole("region", {
    name: "Next step for this case",
  });
  await expect(nextStep).toContainText("Your message needs review");
  await nextStep.getByRole("button", { name: "Review saved message" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Catalog request - clarify delivery",
  );
  await page.keyboard.press("Escape");
  // Opening the same hub destination twice must reopen the saved message.
  for (let visit = 0; visit < 2; visit++) {
    await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
    await page.locator("#overview-work").getByRole("button", { name: "Review saved message", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Catalog request - clarify delivery");
    await page.keyboard.press("Escape");
  }
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText("Draft");
  await expect(page.getByRole("dialog")).toContainText(
    "Catalog request - clarify delivery",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Please clarify delivery and minimum order.",
  );
});

test("saving a priced US offer does not expose an unselected distributor inquiry", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to study" })
    .click();
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Saved studies" }).getByRole("status"),
  ).toHaveText("Study saved with 1 option.");
  await expect(
    page.getByRole("button", { name: "Prepare test request" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^My study/ }).click();
  await page.getByRole("button", { name: "Saved (1)", exact: true }).click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.locator(".study-followup").getByRole("heading", { name: /Northwest/ }),
  ).toHaveCount(0);
});

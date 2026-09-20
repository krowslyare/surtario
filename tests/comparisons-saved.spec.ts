import { expect, test } from "@playwright/test";
import {
  assertLocalWebSocketUrl,
  connectOnlyToLocalBackend,
} from "./e2e-local";

// These tests write synthetic comparisons. Never connect them to a remote backend.
test.beforeEach(async ({ context }) => connectOnlyToLocalBackend(context));

test("guarda condiciones y elección, las recupera y una edición invalida la elección", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  await page.getByRole("button", { name: "Edit Proveedor A" }).click();
  await page.getByLabel("Delivery per order", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Save offer" }).click();

  const firstOffer = page.getByRole("article", {
    name: "Offer from Proveedor A",
  });
  await firstOffer.getByRole("button", { name: "Choose offer" }).click();
  await expect(
    firstOffer.getByRole("button", { name: "Selected offer" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved with a selected offer", {
      exact: false,
    }),
  ).toBeVisible();

  await expect(page).toHaveURL(/comparison=/);
  await page.reload();
  // Reload must restore the active record before opening the saved-work list.
  await expect(page.getByTestId("total-0")).toHaveText("S/ 92.00");
  await page
    .getByRole("button", { name: /Saved comparisons \(1\)/ })
    .click();
  await expect(
    page.getByRole("region", { name: "Saved comparisons", exact: true }).getByText("selected offer", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("10");
  await expect(page.getByTestId("total-0")).toHaveText("S/ 92.00");
  await expect(
    page
      .getByRole("article", { name: "Offer from Proveedor A" })
      .getByRole("button", { name: "Selected offer" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Required quantity").fill("20");
  await expect(
    page.getByRole("button", { name: "Selected offer" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose offer" })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Save comparison changes" }).click();
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: /Saved comparisons \(1\)/ })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("20");
  await expect(
    page.getByRole("button", { name: "Selected offer" }),
  ).toHaveCount(0);

  // A saved record now restores its own selection. A new sample is explicit navigation.
  await page.goto("/?view=comparison&example=pe");
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: false,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Saved comparisons \(2\)/ })
    .click();
});

test("una oferta manual explica por qué no se puede guardar en la demo", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  await page.getByRole("button", { name: "Add offer" }).click();
  await page.getByLabel("Supplier", { exact: true }).fill("Supplier manual");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("region", { name: "Saved comparisons" })
      .getByText("Saving supports sample offers and quotes linked to reviewed sources", {
        exact: false,
      }),
  ).toBeVisible();
});

test("una cantidad inválida no se convierte en cantidad pendiente", async ({
  page,
}) => {
  await page.goto("/?view=comparison&example=pe");
  // fill() can target a covered inert input before the arrival transition ends.
  await expect(page.locator(".workspace-content")).not.toHaveAttribute("inert");
  await page.getByLabel("Required quantity").fill("texto");
  await expect(page.getByLabel("Required quantity")).toHaveValue("texto");
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Correct the quantity before saving", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Required quantity").fill("");
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toBeEnabled();
});

test("guarda una comparación de catálogo con cantidad pendiente y la recupera", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Explore rice example" }).click();
  const cards = page.getByRole("article");
  await cards
    .nth(0)
    .getByRole("button", { name: "Add to study" })
    .click();
  await cards
    .nth(1)
    .getByRole("button", { name: "Add to study" })
    .click();
  await page
    .getByRole("button", { name: "Plan purchase", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Enter quantity and terms" })
    .click();
  await expect(page).toHaveURL(/view=comparison/);
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: false,
    }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: /Saved comparisons \(1\)/ })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await page
    .getByRole("button", { name: "Edit Distribuidor A · ejemplo" })
    .click();
  await page.getByLabel("Delivery per order", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(
    page.getByRole("button", { name: "Save comparison changes" }),
  ).toBeEnabled();
});

test("una confirmación tardía no asocia el guardado al borrador restaurado", async ({
  page,
}) => {
  let hold = false;
  const pending: Array<() => void> = [];
  await page.routeWebSocket(/.*/, (socket) => {
    assertLocalWebSocketUrl(socket.url());
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (hold) pending.push(() => socket.send(message));
      else socket.send(message);
    });
  });
  await page.goto("/?view=comparison&example=pe");
  await expect(
    page.getByRole("button", { name: "Saved comparisons (0)" }),
  ).toBeVisible();
  hold = true;
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Restore example" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore example" })
    .click();
  hold = false;
  for (const deliver of pending) deliver();
  await expect(
    page.getByText("The previous comparison was saved.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save comparison", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Save comparison changes" }),
  ).toHaveCount(0);
  await page.getByLabel("Required quantity").fill("20");
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved comparisons (2)" }),
  ).toBeVisible();
});

test("reload restores the linked comparison and another browser cannot recover it", async ({ page, browser }) => {
  await page.goto("/?view=comparison&example=pe");
  await expect(page.locator(".workspace-content")).not.toHaveAttribute("inert");
  await page.getByLabel("Required quantity").fill("27");
  await page.getByRole("button", { name: "Save comparison", exact: true }).click();
  await expect(page).toHaveURL(/comparison=/);
  const savedUrl = page.url();
  await page.reload();
  await expect(page.getByLabel("Required quantity")).toHaveValue("27");
  const outsider = await browser.newContext();
  await connectOnlyToLocalBackend(outsider);
  try {
    const otherPage = await outsider.newPage();
    await otherPage.goto(savedUrl);
    await expect(otherPage.getByRole("heading", { name: "This comparison isn’t available." })).toBeVisible();
    await expect(otherPage.getByLabel("Required quantity")).toHaveCount(0);
    await otherPage.getByRole("button", { name: "Back to workspace" }).click();
    await expect(otherPage).not.toHaveURL(/comparison=/);
  } finally { await outsider.close(); }
});

import { expect, test } from "@playwright/test";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("revisión web guardada recupera evidencia, condiciones y elección en Convex local", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const run = (fn: string, args: object) =>
    JSON.parse(runLocalConvex(["run", fn, JSON.stringify(args)]));
  const reserved = run("research:reserveSearch", {
    token,
    clientId: crypto.randomUUID(),
    ingredient: "Arroz",
    region: "Lima",
  });
  run("research:finishSearch", {
    id: reserved.run.id,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Cotización web sintética",
        description: "Fuente de prueba E2E",
        markdown: extractionSource.text,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated: true,
  });
  run("research:reserveExtraction", {
    token,
    runId: reserved.run.id,
    sourceIndex: 0,
  });
  run("research:finishExtraction", {
    runId: reserved.run.id,
    sourceIndex: 0,
    offer: extractionExample,
    analysis: { kind: "product", summary: "Synthetic rice listing for review.", evidence: ["Saco: S/ 80.00"], warnings: ["Package weight needs review."] },
  });
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?example=pe");
  await page.getByRole("button", { name: "Continue your work", exact: true }).click();
  await page.getByRole("dialog", { name: "Your recent work", exact: true }).getByRole("button", { name: "Review sources", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Arroz in Lima", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review offer" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Package unit", { exact: true }).click();
  await dialog.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Package size", { exact: true }).fill("18");
  await dialog.getByLabel("Price per package", { exact: true }).fill("85");
  await dialog
    .getByLabel(
      "I reviewed the source and confirm the data, including my corrections",
    )
    .check();
  await dialog.getByRole("button", { name: "Add to study" }).click();
  await expect(
    page.getByRole("button", { name: "My study 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View my study", exact: true })
    .click();
  await expect(
    page.getByRole("article", {
      name: "Offer in study: Distribuidora de ejemplo",
    }),
  ).toContainText("S/ 85.00");
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page.getByText("Study saved with 1 option", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^My study/ }).click();
  await page
    .getByRole("button", { name: "Saved (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  // Returning from a restored web study must recover its original search,
  // without starting another paid discovery or falling back to demo results.
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cotización web sintética", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit review", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit review", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Price per package", { exact: true })).toHaveValue("85");
  await expect(page.getByRole("dialog").getByLabel("Package size", { exact: true })).toHaveValue("18");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "My study 1", exact: true }).click();
  await expect(
    page.getByRole("article", {
      name: "Offer in study: Distribuidora de ejemplo",
    }),
  ).toContainText("S/ 85.00");
  await page.getByRole("button", { name: "Calculate this offer" }).click();
  await page.getByLabel("Required quantity").fill("10");
  await page
    .getByRole("button", { name: "Edit Distribuidora de ejemplo" })
    .click();
  await page.getByLabel("Minimum packs", { exact: true }).fill("1");
  await page.getByLabel("Delivery per order", { exact: true }).fill("15");
  await page
    .getByLabel("Tax on goods and delivery", { exact: true })
    .click();
  await page
    .getByRole("option", {
      name: "Final amounts, including tax",
      exact: true,
    })
    .click();
  await page
    .getByLabel("The supplier can deliver when I need it")
    .check();
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await page.getByRole("button", { name: "Choose offer" }).click();
  await page
    .getByRole("button", { name: "Save comparison", exact: true })
    .click();
  await expect(
    page.getByText("Comparison saved with a selected offer", {
      exact: false,
    }),
  ).toBeVisible();
  const advisor = page.getByRole("region", { name: "Purchasing advisor" });
  await advisor.getByRole("button", { name: "Save scenario", exact: true }).click();
  await expect(advisor.getByText("Saved", { exact: true })).toBeVisible();
  await expect(advisor.getByText(/out of date for this view/i)).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Saved comparisons (1)" })
    .click();
  await page.getByRole("button", { name: "Open comparison" }).click();
  await expect(page.getByTestId("total-0")).toHaveText("S/ 100.00");
  await expect(
    page.getByRole("button", { name: "Selected offer" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "View source" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Reviewed synthetic document",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Price per package: 80.00",
  );
  await expect(page.getByRole("dialog")).toContainText("manual correction: 85");
  await expect(
    page.getByRole("link", { name: "Open original source" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Required quantity").fill("20");
  await expect(
    page.getByRole("button", { name: "Selected offer" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save comparison changes" }).click();
  await expect(
    page.getByText("Comparison saved. Save again after making changes.", {
      exact: false,
    }),
  ).toBeVisible();
});

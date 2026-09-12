import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("revisión documental guardada recupera evidencia, condiciones y elección en Convex local", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const folder = mkdtempSync(join(tmpdir(), "document-review-e2e-"));
  const path = join(folder, "fixture.json");
  writeFileSync(
    path,
    JSON.stringify([
      {
        ownerHash: createHash("sha256").update(token).digest("hex"),
        clientId: crypto.randomUUID(),
        kind: "pdf",
        createdAt: Date.now(),
        status: "complete",
        error: null,
        result: {
          documentType: "quotation",
          transcript: extractionSource.text,
          offer: extractionExample,
        },
      },
    ]),
  );
  try {
    runLocalConvex(["import", "--append", "--table", "documentRuns", path]);
  } finally {
    rmSync(folder, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?example=pe");
  await page.getByText("Quotes and documents", { exact: true }).click();
  await page.getByRole("button", { name: "Review extracted data" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Package unit").click();
  await page.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Package size").fill("18");
  await dialog.getByLabel("Price per package").fill("85");
  await dialog
    .getByLabel(
      "I reviewed the source and confirm the data, including my corrections",
    )
    .check();
  await dialog.getByRole("button", { name: "Continue to comparison" }).click();
  await page.getByLabel("Required quantity").fill("10");
  await page
    .getByRole("button", { name: "Edit Distribuidora de ejemplo" })
    .click();
  await page.getByLabel("Minimum packs", { exact: true }).fill("1");
  await page.getByLabel("Delivery per order", { exact: true }).fill("15");
  await page.getByLabel("Tax on goods and delivery", { exact: true }).click();
  await page.getByRole("option", { name: "Final amounts, including tax", exact: true }).click();
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
    "Price per package: 80.00",
  );
  await expect(page.getByRole("dialog")).toContainText("manual correction: 85");
  await expect(
    page.getByRole("link", { name: "Open original document" }),
  ).toHaveAttribute("href", "/examples/cotizacion-demo.pdf");
  await page.keyboard.press("Escape");
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

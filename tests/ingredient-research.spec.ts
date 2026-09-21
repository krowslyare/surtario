import { expect, test } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("a resumed AI proposal requires ambiguous-row review, preserves provenance, and supports one or several selections", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256").update(randomUUID()).digest("hex");
  const directory = mkdtempSync(join(tmpdir(), "ingredient-reading-"));
  try {
    const file = join(directory, "reading.json");
    writeFileSync(
      file,
      JSON.stringify([
        {
          ownerHash: createHash("sha256").update(token).digest("hex"),
          clientId: randomUUID(),
          contentHash: "a".repeat(64),
          status: "complete",
          error: null,
          createdAt: Date.now(),
          rows: [
            {
              id: "rice",
              ingredient: "Long-grain white rice",
              original: "Long-grain white rice — 40 lb",
              reference: "Page 1, line 1",
              documentHash: "a".repeat(64),
              needsReview: false,
            },
            {
              id: "flour",
              ingredient: "",
              original: "All-purpose fl… — 25 lb",
              reference: "Page 1, line 2",
              documentHash: "a".repeat(64),
              needsReview: true,
            },
          ],
        },
      ]),
    );
    runLocalConvex([
      "import",
      "--append",
      "--table",
      "ingredientExtractions",
      file,
    ]);
  } finally {
    rmSync(directory, { recursive: true });
  }
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?view=overview");
  await page
    .getByRole("button", { name: "Import ingredient list", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByText("Resume a recent list reading", { exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Review reading", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: /^Ingredient 2/ })
    .fill("All-purpose flour");
  await dialog
    .getByRole("button", { name: "Confirm 2 ingredients", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Review each flagged ingredient",
  );
  await dialog
    .getByRole("button", { name: "I checked this row", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirm 2 ingredients", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Research selected · 2", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /All-purpose flour/ }).uncheck();
  await expect(
    page.getByRole("button", { name: "Research selected · 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /All-purpose flour/ }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save list", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "List saved", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Saved lists (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Open list", exact: true }).click();
  await page
    .getByRole("button", { name: "View list source", exact: true })
    .click();
  await expect(dialog).toContainText("Long-grain white rice — 40 lb");
  await expect(dialog).toContainText("All-purpose fl… — 25 lb");
  await expect(dialog).toContainText("Original file SHA-256");
  await page.keyboard.press("Escape");
  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page
        .getByRole("navigation")
        .getByRole("button", { name: "Messages", exact: true }),
    ).toBeVisible();
  }
  // No provider mock is used in this browser test: the server gate remains disabled.
  await expect(
    page.getByRole("button", { name: "Research selected · 2", exact: true }),
  ).toBeDisabled();
});

test("PDF originals render locally alongside editable rows on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await page.getByText("Ingredient lists", { exact: true }).click();
  await page
    .getByLabel("Ingredient intake")
    .getByRole("button", { name: "Import ingredient list", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Ingredient file")
    .setInputFiles("public/examples/quote-demo-us.pdf");
  await dialog
    .getByLabel("Transcribe ingredients")
    .fill("Long-grain white rice");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  const original = dialog.getByRole("img", {
    name: "Original ingredient list, PDF page 1",
  });
  await expect(original).toBeVisible();
  await expect(dialog.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: /^Ingredient 1/ }),
  ).toHaveValue("Long-grain white rice");
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(original).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

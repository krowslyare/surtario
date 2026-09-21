import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("fuente web sin precio se guarda como candidato y recupera su consulta", async ({
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
    region: "Arequipa",
  });
  run("research:finishSearch", {
    id: reserved.run.id,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Cotización web sintética",
        description: "Fuente de prueba E2E",
        markdown: null,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated: true,
  });
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );
  await page.goto("/?example=pe");
  await page.getByRole("navigation").getByRole("button", { name: "Overview", exact: true }).click();
  await page.locator("#overview-work").getByRole("button", { name: "Review sources", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Arroz in Arequipa", exact: true })).toBeVisible();
  await page.getByText("More options", { exact: true }).click();
  await page
    .getByRole("button", { name: "Save potential distributor" })
    .click();
  const review = page.getByRole("dialog");
  await expect(
    review.getByRole("button", { name: "Save candidate", exact: true }),
  ).toBeDisabled();
  await review
    .getByLabel("Potential distributor name")
    .fill("Distribuidor candidato E2E");
  await review
    .getByLabel("Contact found (optional)")
    .fill("contacto@example.test");
  await review.getByRole("checkbox").check();
  await review
    .getByRole("button", { name: "Save candidate", exact: true })
    .click();
  await expect(review).not.toBeVisible();
  await page.getByRole("button", { name: /^My study/ }).click();
  await expect(page.getByRole("region", { name: "Saved studies", exact: true }).getByRole("status")).toHaveText("Not saved");
  await page.getByRole("button", { name: "Save study", exact: true }).click();
  await expect(
    page.getByText("Study saved with 1 option", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Ask Distribuidor C/ })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /^My study/ }).click();
  const library = page.getByRole("article", {
    name: "Distributor in study: Distribuidor candidato E2E",
  });
  await expect(library).toContainText("Distribuidor candidato E2E");
  await expect(library).toContainText("contacto@example.test");
  await expect(
    library.getByRole("link", { name: "Cotización web sintética" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.setViewportSize({ width: 390, height: 844 });
  await library.scrollIntoViewIfNeeded();
  expect(
    await library.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/web-prospect-mobile.png" });
  await page.getByRole("button", { name: /^My study/ }).click();
  await page
    .getByRole("button", { name: "Saved (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Open study", exact: true }).click();
  const candidate = page.getByRole("article", {
    name: "Distributor in study: Distribuidor candidato E2E",
  });
  await expect(page.getByRole("heading", { name: /Ask Distribuidor C/ })).toHaveCount(0);
  await expect(candidate).toContainText("Request pricing");
  await candidate.getByRole("button", { name: "Prepare inquiry", exact: true }).click();
  const mail = page.getByRole("dialog");
  await expect(mail).toContainText("Not configured");
  await expect(mail).toContainText("Quantity is still to be determined");
  await expect(mail).not.toContainText("contacto@example.test");
  await expect(mail.getByRole("checkbox")).not.toBeChecked();
  await expect(
    mail.getByRole("button", { name: "Send test request" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.reload();
  // The request route restores the existing draft directly after F5.
  await expect(page.getByRole("dialog")).toContainText("Draft");
  await expect(page.getByRole("dialog")).toContainText("Quantity is still to be determined");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Send test request" })).toBeDisabled();
});

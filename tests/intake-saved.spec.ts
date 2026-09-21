import { expect, test } from "@playwright/test";
import {
  assertLocalWebSocketUrl,
  connectOnlyToLocalBackend,
} from "./e2e-local";

test("guarda nombres revisados y recupera la cola después de recargar", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );

  await page.goto("/?example=pe");
  await page.getByText("Ingredient lists", { exact: true }).click();
  await page.getByLabel("Ingredient intake").getByRole("button", { name: "Import ingredient list", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Type or paste ingredients")
    .fill("Arroz sintético\nAceite sintético");
  await dialog.getByRole("button", { name: "Review ingredients" }).click();
  await dialog.getByRole("button", { name: "Confirm 2 ingredients" }).click();
  await page.getByRole("button", { name: "Save list" }).click();
  await expect(
    page.getByText("List saved with 2 reviewed ingredients"),
  ).toBeVisible();

  await page.reload();
  // The expanded ingredient-list panel is restored by the workspace checkpoint.
  await expect(
    page.getByRole("heading", { name: "2 reviewed ingredients" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Saved lists (1)" }).click();
  await expect(page.getByText("Reviewed manual input")).toBeVisible();
  await page.getByRole("button", { name: "Open list" }).click();
  await expect(
    page.getByRole("checkbox", { name: /Arroz sintético/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /Aceite sintético/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View list source" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Saved list · Reviewed manual input",
  );
  await expect(page.getByRole("dialog")).not.toContainText(/archivo|precio/i);
});

test("a late confirmation does not mark a replacement list as saved", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  let hold = false;
  const pending: Array<() => void> = [];
  await context.routeWebSocket(/.*/, (socket) => {
    assertLocalWebSocketUrl(socket.url());
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (hold) pending.push(() => socket.send(message));
      else socket.send(message);
    });
  });
  await page.goto("/?example=pe");
  await page.getByText("Ingredient lists", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved lists (0)" }),
  ).toBeVisible();
  async function enterList(name: string, replacing: boolean) {
    await page.getByLabel("Ingredient intake")
      .getByRole("button", {
        name: replacing ? "Replace ingredient list" : "Import ingredient list",
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Type or paste ingredients").fill(name);
    await dialog.getByRole("button", { name: "Review ingredients" }).click();
    await dialog
      .getByRole("button", { name: "Confirm 1 ingredient", exact: true })
      .click();
  }
  await enterList("Arroz sintético", false);
  hold = true;
  await page.getByRole("button", { name: "Save list", exact: true }).click();
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await enterList("Aceite sintético", true);
  hold = false;
  pending.forEach((deliver) => deliver());
  await expect(
    page.getByRole("button", { name: "Save list", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: /Aceite sintético/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save list", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved lists (2)" }),
  ).toBeVisible();
});

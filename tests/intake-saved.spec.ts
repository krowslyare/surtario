import { expect, test, type BrowserContext } from "@playwright/test";

async function restrictToLocalBackend(context: BrowserContext) {
  if (process.env.CONVEX_DEPLOY_KEY)
    throw new Error("Saved-list E2E does not accept a deployment key.");
  await context.routeWebSocket(/.*/, (socket) => {
    if (!["127.0.0.1", "localhost"].includes(new URL(socket.url()).hostname)) {
      socket.close();
      throw new Error(
        "Saved ingredient list E2E only allows local WebSockets.",
      );
    }
    socket.connectToServer();
  });
}

test("guarda nombres revisados y recupera la cola después de recargar", async ({
  page,
  context,
}) => {
  await restrictToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await context.addInitScript(
    (value) => localStorage.setItem("procurement-demo-session-v1", value),
    token,
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Añadir lista o archivo" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Escribe o pega insumos")
    .fill("Arroz sintético\nAceite sintético");
  await dialog.getByRole("button", { name: "Revisar insumos" }).click();
  await dialog.getByRole("button", { name: "Confirmar 2 insumos" }).click();
  await page.getByRole("button", { name: "Guardar lista" }).click();
  await expect(page.getByText("Lista guardada con 2 insumos")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "2 insumos revisados" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Listas guardadas (1)" }).click();
  await expect(page.getByText("Entrada manual revisada")).toBeVisible();
  await page.getByRole("button", { name: "Abrir lista" }).click();
  await expect(
    page.getByRole("button", { name: "Arroz sintético", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Aceite sintético", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver origen de la lista" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Lista guardada · Entrada manual revisada",
  );
  await expect(page.getByRole("dialog")).not.toContainText(/archivo|precio/i);
});

test("a late confirmation does not mark a replacement list as saved", async ({
  page,
  context,
}) => {
  await restrictToLocalBackend(context);
  let hold = false;
  const pending: Array<() => void> = [];
  await context.routeWebSocket(/.*/, (socket) => {
    if (!["127.0.0.1", "localhost"].includes(new URL(socket.url()).hostname))
      throw new Error("Only local WebSockets allowed.");
    const server = socket.connectToServer();
    server.onMessage((message) => {
      if (hold) pending.push(() => socket.send(message));
      else socket.send(message);
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Listas guardadas (0)" }),
  ).toBeVisible();
  async function enterList(name: string, replacing: boolean) {
    await page
      .getByRole("button", {
        name: replacing ? "Reemplazar lista" : "Añadir lista o archivo",
      })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Escribe o pega insumos").fill(name);
    await dialog.getByRole("button", { name: "Revisar insumos" }).click();
    await dialog
      .getByRole("button", { name: "Confirmar 1 insumo", exact: true })
      .click();
  }
  await enterList("Arroz sintético", false);
  hold = true;
  await page
    .getByRole("button", { name: "Guardar lista", exact: true })
    .click();
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await enterList("Aceite sintético", true);
  hold = false;
  pending.forEach((deliver) => deliver());
  await expect(
    page.getByRole("button", { name: "Guardar lista", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Aceite sintético", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Guardar lista", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Listas guardadas (2)" }),
  ).toBeVisible();
});

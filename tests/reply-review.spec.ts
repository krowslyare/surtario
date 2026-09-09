import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { riceRequest, riceOffers } from "../fixtures/procurement";
for (const mode of ["new", "append"] as const)
  test(`respuesta vinculada: ${mode} conserva origen tras recargar`, async ({
    page,
    context,
  }) => {
    const target = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((line) => line.startsWith("CONVEX_DEPLOYMENT="));
    if (
      process.env.CONVEX_DEPLOY_KEY ||
      target !== "CONVEX_DEPLOYMENT=anonymous:anonymous-convexhackaton"
    )
      throw new Error("Local anonymous backend only");
    await context.routeWebSocket(/.*/, (socket) => {
      if (!["localhost", "127.0.0.1"].includes(new URL(socket.url()).hostname))
        throw new Error("Local sockets only");
      socket.connectToServer();
    });
    const token = createHash("sha256")
      .update(crypto.randomUUID())
      .digest("hex");
    const run = (fn: string, args: object) =>
      JSON.parse(
        execFileSync("npx", ["convex", "run", fn, JSON.stringify(args)], {
          encoding: "utf8",
        }),
      );
    const saved = run("comparisons:save", {
      token,
      clientId: crypto.randomUUID(),
      id: null,
      expectedRevision: 0,
      request: riceRequest,
      offers: riceOffers,
      selectedOfferId: mode === "append" ? riceOffers[1].id : null,
    });
    const folder = mkdtempSync(join(tmpdir(), "reply-e2e-"));
    const seed = (table: string, doc: object) => {
      const path = join(folder, `${table}.json`);
      writeFileSync(path, JSON.stringify([doc]));
      execFileSync(
        "npx",
        ["convex", "import", "--append", "--table", table, path],
        { encoding: "utf8" },
      );
    };
    try {
      seed("quotationRequests", {
        ownerHash: createHash("sha256").update(token).digest("hex"),
        clientId: crypto.randomUUID(),
        comparisonId: saved.id,
        recipient: null,
        inboxId: null,
        subject: "Consulta sintética",
        text: "Solicitud de prueba",
        state: "sent",
        revision: 3,
        idempotencyKey: crypto.randomUUID(),
        receipt: {
          messageId: crypto.randomUUID(),
          threadId: crypto.randomUUID(),
        },
        failure: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      const request = run("quotationMail:list", { token })[0];
      seed("quotationReplies", {
        requestId: request.id,
        eventId: crypto.randomUUID(),
        messageId: crypto.randomUUID(),
        threadId: request.receipt.threadId,
        from: "demo@example.test",
        text: "Distribuidor Respuesta: arroz blanco, saco de 18 kg a PEN 80.00. Entrega por confirmar.",
        receivedAt: "not-a-date",
      });
    } finally {
      rmSync(folder, { recursive: true });
    }
    await context.addInitScript(
      (value) => localStorage.setItem("procurement-demo-session-v1", value),
      token,
    );
    await page.goto("/?view=comparison");
    await page
      .getByRole("button", { name: "Comparaciones guardadas (1)" })
      .click();
    await page.getByRole("button", { name: "Abrir comparación" }).click();
    await page.getByRole("button", { name: "Ver solicitud" }).click();
    await page
      .getByRole("button", { name: "Revisar como nueva oferta" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Revisión manual");
    await expect(
      dialog.getByRole("button", { name: "Continuar con nueva oferta" }),
    ).toBeDisabled();
    await dialog
      .getByLabel("Proveedor", { exact: true })
      .fill("Distribuidor Respuesta");
    await dialog.getByLabel("Insumo", { exact: true }).fill("Arroz");
    await dialog
      .getByLabel("Especificación", { exact: true })
      .fill(mode === "append" ? riceRequest.specification : "Blanco");
    await dialog
      .getByLabel("Contenido por presentación", { exact: true })
      .fill("18");
    await dialog
      .getByLabel("Unidad de la presentación", { exact: true })
      .selectOption("kg");
    await dialog
      .getByLabel("Precio por presentación", { exact: true })
      .fill("85");
    await dialog.getByLabel("Moneda", { exact: true }).selectOption("PEN");
    await dialog
      .getByLabel(
        "Confirmo que estos datos corresponden a una oferta de esta respuesta",
      )
      .check();
    if (mode === "append") {
      await expect(
        dialog.getByRole("button", { name: "Añadir a comparación actual" }),
      ).toBeDisabled();
      await dialog
        .getByLabel(
          "Confirmo equivalencia con el insumo y especificación de la comparación actual",
        )
        .check();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: "/tmp/reply-review-mobile.png" });
    await dialog
      .getByRole("button", {
        name:
          mode === "append"
            ? "Añadir a comparación actual"
            : "Continuar con nueva oferta",
      })
      .click();
    await expect(
      page.getByLabel("Cantidad necesaria", { exact: true }),
    ).toHaveValue(mode === "append" ? "10" : "");
    if (mode === "append")
      await expect(
        page.getByRole("button", { name: "Oferta elegida" }),
      ).toHaveCount(0);
    await page
      .getByRole("button", {
        name:
          mode === "append"
            ? "Guardar cambios de la comparación"
            : "Guardar comparación",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Comparación guardada.", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", {
        name:
          mode === "append"
            ? "Comparaciones guardadas (1)"
            : "Comparaciones guardadas (2)",
      })
      .click();
    await page
      .getByRole("button", { name: "Abrir comparación" })
      .first()
      .click();
    if (mode === "append") {
      await expect(
        page.getByRole("button", { name: "Ver origen" }),
      ).toHaveCount(3);
      await expect(
        page.getByLabel("Cantidad necesaria", { exact: true }),
      ).toHaveValue("10");
      await expect(
        page.getByRole("button", { name: "Oferta elegida" }),
      ).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Ver origen" }).last().click();
    await expect(page.getByRole("dialog")).toContainText("Fecha pendiente");
    await expect(page.getByRole("dialog")).not.toContainText("página pública");
    await expect(page.getByRole("dialog")).toContainText("PEN 80.00");
    await expect(page.getByRole("dialog")).toContainText(
      "corrección manual: 85",
    );
  });

import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { riceRequest, riceOffers } from "../fixtures/procurement";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";
for (const mode of ["new", "append"] as const)
  test(`respuesta vinculada: ${mode} conserva origen tras recargar`, async ({
    page,
    context,
  }) => {
    await connectOnlyToLocalBackend(context);
    const token = createHash("sha256")
      .update(crypto.randomUUID())
      .digest("hex");
    const run = (fn: string, args: object) =>
      JSON.parse(runLocalConvex(["run", fn, JSON.stringify(args)]));
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
      runLocalConvex(["import", "--append", "--table", table, path]);
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

test("an open review receives a completed extraction without replacing edits", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  const token = createHash("sha256")
    .update(crypto.randomUUID())
    .digest("hex");
  const run = (fn: string, args: object) =>
    JSON.parse(runLocalConvex(["run", fn, JSON.stringify(args)]));
  const saved = run("comparisons:save", {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  const folder = mkdtempSync(join(tmpdir(), "reply-live-e2e-"));
  const seed = (table: string, doc: object) => {
    const path = join(folder, `${table}.json`);
    writeFileSync(path, JSON.stringify([doc]));
    runLocalConvex(["import", "--append", "--table", table, path]);
  };
  const messageId = crypto.randomUUID();
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
      messageId,
      threadId: request.receipt.threadId,
      from: "demo@example.test",
      text: "Distribuidor Original\nArroz blanco extra\nSaco 18 kg: PEN 80.00",
      receivedAt: "2026-09-10T12:00:00Z",
    });
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
    await dialog.getByLabel("Proveedor", { exact: true }).fill("Mi corrección");

    const reservation = run("quotationMail:reserveReplyExtraction", {
      token,
      requestId: request.id,
      messageId,
    });
    expect(reservation.kind).toBe("reserved");
    await expect(dialog.getByText("Extracción en curso…")).toBeVisible();
    run("quotationMail:finishReplyExtraction", {
      replyId: reservation.replyId,
      attempt: reservation.attempt,
      offer: {
        supplier: {
          value: "Distribuidor Original",
          evidence: "Distribuidor Original",
        },
        ingredient: { value: "Arroz", evidence: "Arroz blanco extra" },
        specification: {
          value: "blanco extra",
          evidence: "Arroz blanco extra",
        },
        packageContent: { value: "18", evidence: "Saco 18 kg: PEN 80.00" },
        packageUnit: { value: "kg", evidence: "Saco 18 kg: PEN 80.00" },
        price: { value: "80.00", evidence: "Saco 18 kg: PEN 80.00" },
        currency: { value: "PEN", evidence: "Saco 18 kg: PEN 80.00" },
      },
    });
    await expect(dialog.getByText(/La sugerencia está lista/)).toBeVisible();
    await expect(dialog.getByLabel("Proveedor", { exact: true })).toHaveValue(
      "Mi corrección",
    );
    await expect(
      dialog.getByRole("button", { name: "Aplicar sugerencia de IA" }),
    ).toBeVisible();
    await expect(
      dialog.getByLabel(
        "Confirmo que estos datos corresponden a una oferta de esta respuesta",
      ),
    ).not.toBeChecked();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

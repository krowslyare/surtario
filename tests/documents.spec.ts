import { expect, test } from "@playwright/test";

test("document examples are inspectable but no extraction runs without configuration", async ({
  page,
  context,
}) => {
  await context.routeWebSocket(/.*/, (socket) => {
    if (!["localhost", "127.0.0.1"].includes(new URL(socket.url()).hostname))
      throw new Error("Local backend only");
    socket.connectToServer();
  });
  await page.goto("/");
  const section = page.getByRole("region", { name: "Lectura de foto y PDF" });
  await expect(
    section.getByRole("button", { name: "Leer con OpenAI" }),
  ).toBeDisabled();
  await expect(section).toContainText("Lectura automática sin configurar");
  await section.getByRole("button", { name: "Ver archivo de ejemplo" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await section.getByLabel("Archivo de ejemplo").selectOption("pdf");
  await expect(
    section.getByRole("link", { name: "Descargar ejemplo" }),
  ).toHaveAttribute("href", "/examples/cotizacion-demo.pdf");
  const file = await page.request.get("/examples/cotizacion-demo.pdf");
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await page.setViewportSize({ width: 390, height: 844 });
  await section.scrollIntoViewIfNeeded();
  expect(await section.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "/tmp/document-intake-mobile.png" });
});

test("a simulated reading keeps the original visible, requires review and opens a pending comparison", async ({
  page,
}) => {
  await page.route("**/__document_test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/__document_test.tsx"></script></body></html>`,
    }),
  );
  await page.route("**/__document_test.tsx", async (route) => {
    const { transform } = await import("esbuild");
    const text =
      "Distribuidora Demo\nArroz blanco extra\nSaco de 18 kg: PEN 80.00";
    const field = (value: string, evidence = value) => ({ value, evidence });
    const run = {
      id: "synthetic-test",
      kind: "pdf",
      createdAt: Date.now(),
      status: "complete",
      error: null,
      result: {
        documentType: "quotation",
        transcript: text,
        offer: {
          supplier: field("Distribuidora Demo"),
          ingredient: field("Arroz", "Arroz blanco extra"),
          specification: field("Blanco extra", "Arroz blanco extra"),
          packageContent: field("18", "18 kg"),
          packageUnit: field("kg", "18 kg"),
          price: field("80.00", "PEN 80.00"),
          currency: field("PEN"),
        },
      },
    };
    const code = `import React from 'react';import ReactDOM from 'react-dom/client';import {DocumentReview} from '/src/components/DocumentExtraction.tsx';import Comparison from '/src/Comparison.tsx';import '/src/styles/tokens.css';import '/src/styles/app.css';function Harness(){const[seed,setSeed]=React.useState(null);return seed?<Comparison seed={seed} persistenceEnabled={false}/>:<DocumentReview run={${JSON.stringify(run)}} onPrepare={setSeed}/>;}ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>);`;
    const main = await (await page.request.get("/src/main.tsx")).text();
    const react = main.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
    const dom = main.match(/"([^" ]*\/react-dom_client\.js[^" ]*)"/)![1];
    await route.fulfill({
      contentType: "application/javascript",
      body: (await transform(code, { loader: "tsx", jsx: "transform" })).code
        .replaceAll('from "react"', `from "${react}"`)
        .replaceAll('from "react-dom/client"', `from "${dom}"`),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/__document_test");
  await page.getByRole("button", { name: "Revisar datos leídos" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible();
  await expect(dialog).toContainText("Transcripción propuesta");
  await expect(
    dialog.getByRole("button", { name: "Continuar a comparación" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Precio por presentación", { exact: true })
    .fill("85.00");
  await dialog.getByRole("checkbox").check();
  await page.screenshot({ path: "/tmp/document-review-mobile.png" });
  await dialog.getByRole("button", { name: "Continuar a comparación" }).click();
  await expect(page.getByText("Fuentes revisadas", { exact: true })).toBeVisible();
  await expect(page.getByText(/páginas públicas/)).toHaveCount(0);
  await expect(
    page.getByLabel("Cantidad necesaria", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByText("S/ 85.00", { exact: false }).first(),
  ).toBeVisible();
});

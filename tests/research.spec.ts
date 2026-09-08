import { expect, test } from "@playwright/test";
import { extractionExample } from "../fixtures/extraction";

test("sin configuración ofrece ejemplos y no simula búsqueda web", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Búsqueda web no configurada.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Insumo o categoría").fill("Arroz");
  await expect(
    page.getByRole("button", { name: "Buscar en la web", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Explorar ejemplo", exact: true }),
  ).toBeEnabled();
});

test("respuesta simulada: revisa fuente realista, corrige y pasa a comparación sin inventar condiciones", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Test-only transport harness: production UI, no provider credentials or fixture backend writes.
  await page.route("**/__research_test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body><div id="root"></div><script type="module" src="/__research_test.tsx"></script></body></html>`,
    }),
  );
  await page.route("**/__research_test.tsx", async (route) => {
    const code = `import React from 'react';import ReactDOM from'react-dom/client';const {useState}=React;const {createRoot}=ReactDOM;import{ResearchWorkspace}from'/src/components/LiveResearch.tsx';import Comparison from'/src/Comparison.tsx';import'/src/styles/tokens.css';import'/src/styles/app.css';
const proposal=${JSON.stringify(extractionExample)};
const run={id:'test-run',ingredient:'Arroz',region:'Lima',observedAt:'2026-09-08T16:00:00Z',status:'complete',error:null,warning:true,discarded:0,sources:[{url:'https://supplier.test/rice',title:'Catálogo de prueba',description:'Fuente simulada para probar UI',markdown:'Distribuidora de ejemplo\\nArroz blanco extra\\nSaco: S/ 80.00',contentTruncated:true,extraction:proposal,extractionStatus:'complete',extractionError:null}]};
function Harness(){const[seed,setSeed]=useState(null);return seed?<Comparison seed={seed} persistenceEnabled={false}/>:<ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true}} runs={[{...run,status:'running',sources:[]}]} request={{id:1,ingredient:'Arroz',region:'Lima'}} onStatus={()=>{}} onSearch={async()=>run} onExtract={async()=>proposal} onPrepare={setSeed}/>};createRoot(document.getElementById('root')).render(<Harness/>);`;
    const { transform } = await import("esbuild");
    const mainModule = await (await page.request.get("/src/main.tsx")).text();
    const reactUrl = mainModule.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
    const domUrl = mainModule.match(
      /"([^" ]*\/react-dom_client\.js[^" ]*)"/,
    )![1];
    await route.fulfill({
      contentType: "application/javascript",
      body: (await transform(code, { loader: "tsx", jsx: "transform" })).code
        .replaceAll('from "react"', `from "${reactUrl}"`)
        .replaceAll('from "react-dom/client"', `from "${domUrl}"`)
        .replaceAll(
          'from "react/jsx-runtime"',
          'from "/node_modules/.vite/deps/react_jsx-runtime.js"',
        ),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/__research_test");
  // The subscription is deliberately stale; the action response must win.
  await expect(
    page.getByText("La búsqueda devolvió contenido parcial", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver página de origen" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.screenshot({
    path: "/tmp/research-positive-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Revisar extracción" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Extracción automática");
  await dialog.getByLabel("Unidad de la presentación").selectOption("kg");
  await dialog.getByLabel("Contenido por presentación").fill("18");
  await dialog
    .getByLabel(
      "Revisé el origen y confirmo los datos, incluidas mis correcciones",
    )
    .check();
  await dialog.getByRole("button", { name: "Añadir al estudio" }).click();
  await page
    .getByRole("button", { name: "Comparar ofertas revisadas" })
    .click();
  await expect(page.getByLabel("Cantidad necesaria")).toHaveValue("");
  await expect(page.getByTestId("total-0")).toHaveText("Pendiente");
  await page.getByRole("button", { name: "Ver origen" }).click();
  await expect(page.getByRole("dialog")).toContainText("Catálogo de prueba");
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

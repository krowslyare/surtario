import { expect, test } from "@playwright/test";
import { connectOnlyToLocalBackend } from "./e2e-local";

test("document examples are inspectable but no extraction runs without configuration", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?example=pe");
  await page.getByText("Supplier quotes", { exact: true }).click();
  const section = page.getByRole("region", { name: "Photo and PDF extraction" });
  await expect(
    section.getByRole("button", { name: "Read quote with AI" }),
  ).toBeDisabled();
  await expect(section).toContainText("AI reading is not configured");
  await section.getByRole("button", { name: "View sample file" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await section.getByLabel("Sample file").click();
  await page.getByRole("option", { name: "Quote PDF · 1 page", exact: true }).click();
  await expect(
    section.getByRole("link", { name: "Download sample" }),
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

test("US English document sample is available by default and inspectable", async ({
  page,
  context,
}) => {
  await connectOnlyToLocalBackend(context);
  await page.goto("/?view=market");
  await page.getByRole("button", { name: "Read a quote" }).click();
  const section = page.getByRole("region", { name: "Photo and PDF extraction" });
  await expect(section.getByLabel("Sample file")).toContainText(
    "Quote image (US · Portland) · PNG",
  );
  await section.getByRole("button", { name: "View sample file" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "src",
    "/examples/quote-demo-us.png",
  );
  await page.keyboard.press("Escape");
  await section.getByLabel("Sample file").click();
  await page
    .getByRole("option", {
      name: "Quote PDF (US · Portland) · 1 page",
      exact: true,
    })
    .click();
  await expect(
    section.getByRole("link", { name: "Download sample" }),
  ).toHaveAttribute("href", "/examples/quote-demo-us.pdf");
  const file = await page.request.get("/examples/quote-demo-us.pdf");
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

for (const kind of ["pdf", "pdf_us"] as const) {
test(`a simulated ${kind} reading keeps the original visible, requires review and opens a pending comparison`, async ({
  page,
}, testInfo) => {
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
      kind,
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
  await page.getByRole("button", { name: "Review extracted data" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "src",
    kind === "pdf" ? "/examples/cotizacion-demo.png" : "/examples/quote-demo-us.png",
  );
  await expect.poll(() => dialog.getByRole("img").evaluate(
    (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
  )).toBe(true);
  await expect(dialog.getByRole("link", { name: "Open source page" })).toHaveAttribute(
    "href", kind === "pdf" ? "/examples/cotizacion-demo.pdf" : "/examples/quote-demo-us.pdf",
  );
  await dialog.getByRole("img").screenshot({ path: testInfo.outputPath("original-preview.png") });
  await expect(dialog).toContainText("Proposed transcript");
  await expect(
    dialog.getByRole("button", { name: "Continue to comparison" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Price per package", { exact: true })
    .fill("85.00");
  await dialog.getByRole("checkbox").check();
  await page.screenshot({ path: "/tmp/document-review-mobile.png" });
  await dialog.getByRole("button", { name: "Continue to comparison" }).click();
  await expect(
    page.getByText("From your sample study", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/páginas públicas/)).toHaveCount(0);
  await expect(
    page.getByLabel("Required quantity", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByText("S/ 85.00", { exact: false }).first(),
  ).toBeVisible();
});
}

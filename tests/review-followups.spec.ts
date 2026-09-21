import { expect, test } from "@playwright/test";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { draftValues, extractionToPurchase } from "../src/domain/extraction";
import { connectOnlyToLocalBackend, runLocalConvex } from "./e2e-local";

test("equivalent web offers with different wording save and reopen without changing evidence", async ({ page, context }) => {
  await connectOnlyToLocalBackend(context);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  const run = (name: string, args: object) => JSON.parse(runLocalConvex(["run", name, JSON.stringify(args)]));
  const { run: reserved } = run("research:reserveSearch", { token, clientId: crypto.randomUUID(), ingredient: "Rice", region: "Portland, OR, US" });
  const proposals = ["Long grain white", "White rice, long grain"].map((specification, index) => ({
    ...extractionExample,
    supplier: { value: `Supplier ${index + 1}`, evidence: `Supplier ${index + 1}` },
    ingredient: { value: index ? "White rice" : "Rice", evidence: "White rice" },
    specification: { value: specification, evidence: specification },
    packageContent: { value: "25", evidence: "25 lb bag" },
    packageUnit: { value: "lb", evidence: "25 lb bag" },
    price: { value: "20", evidence: "$20" },
    currency: { value: "USD", evidence: "USD" },
  }));
  run("research:finishSearch", { id: reserved.id, sources: proposals.map((_, index) => ({ url: `https://supplier.test/rice-${index}`, title: `Rice source ${index + 1}`, description: "Synthetic source", markdown: "White rice 25 lb USD 20", contentTruncated: false })), discarded: 0, warning: false, simulated: true });
  proposals.forEach((offer, sourceIndex) => {
    run("research:reserveExtraction", { token, runId: reserved.id, sourceIndex });
    run("research:finishExtraction", { runId: reserved.id, sourceIndex, offer, analysis: { kind: "product", summary: "Synthetic rice listing", evidence: ["25 lb USD 20"], warnings: [] } });
  });
  run("studies:save", { token, clientId: crypto.randomUUID(), id: null, expectedRevision: 0, term: "Rice", region: "Portland, OR, US", selectedIds: [], webReviews: proposals.map((offer, sourceIndex) => ({ runId: reserved.id, sourceIndex, values: draftValues(offer), confirmed: true })) });
  await context.addInitScript(value => localStorage.setItem("procurement-demo-session-v1", value), token);
  await page.goto("/?view=market");
  await page.getByRole("region", { name: "Continue your work", exact: true }).getByRole("button", { name: "Resume study", exact: true }).click();
  await page.getByLabel("I confirm the selected offers match the same ingredient, specification, base unit, and currency").check();
  await page.getByRole("button", { name: "Compare 2 reviewed offers", exact: true }).click();
  const save = page.getByRole("button", { name: "Save comparison", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Saved comparisons (1)", exact: true }).click();
  await page.getByRole("button", { name: "Open comparison", exact: true }).click();
  await expect(page.locator(".offers-grid > article")).toHaveCount(2);
  await page.getByLabel("Required quantity", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Save comparison changes", exact: true }).click();
  await expect(page.getByText("Comparison saved. Save again after making changes.", { exact: true })).toBeVisible();
  const [saved] = run("comparisons:list", { token });
  expect(saved.request.quantity).toBe(40);
  expect(saved.offers.map((offer: { specification: string }) => offer.specification)).toEqual(["Long grain white", "Long grain white"]);
  expect(saved.sources[`${reserved.id}:1`].original.specification).toBe("White rice, long grain");
  await page.getByRole("button", { name: "Edit Supplier 2", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Ingredient", { exact: true }).fill("White rice");
  await page.getByRole("button", { name: "Save offer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save comparison changes", exact: true })).toBeDisabled();
});

test("filtered study comparisons contain only visible offers and release hidden slots", async ({ page }) => {
  const selections = Array.from({ length: 8 }, (_, index) => {
    const id = `source-${index}`;
    const values = { ...draftValues(extractionExample), supplier: `Supplier ${index + 1}`, packageContent: "25", packageUnit: "lb", currency: "USD", price: index < 6 ? "" : "20" };
    return { sourceId: id, ingredient: "Rice", region: "Portland, OR, US", seed: extractionToPurchase({ ...extractionSource, id }, extractionExample, values, true) };
  });
  await page.route("**/__study_filter_test", route => route.fulfill({ contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/__study_filter_test.tsx"></script></body></html>` }));
  await page.route("**/__study_filter_test.tsx", async route => {
    const code = `import React from 'react';import ReactDOM from 'react-dom/client';import StudySelections from '/src/components/StudySelections.tsx';import '/src/styles/tokens.css';import '/src/styles/app.css';import '/src/styles/controls.css';
const selections=${JSON.stringify(selections)};
function Harness(){const[filter,setFilter]=React.useState('all');const[prepared,setPrepared]=React.useState([]);return <main><button onClick={()=>setFilter('all')}>All</button><button onClick={()=>setFilter('catalog')}>With prices</button><button onClick={()=>setFilter('distributor')}>No price</button><StudySelections selections={selections} prospects={[]} filter={filter} onRemove={()=>{}} onRemoveProspect={()=>{}} onPrepare={seed=>setPrepared(seed.offers.map(offer=>offer.supplier))} onReplyPrepare={()=>{}} onInquiry={()=>{}}/><output aria-label="Compared suppliers">{prepared.join(', ')}</output></main>};ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>);`;
    const { transform } = await import("esbuild");
    const module = await (await page.request.get("/src/main.tsx")).text();
    const react = module.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
    const dom = module.match(/"([^" ]*\/react-dom_client\.js[^" ]*)"/)![1];
    await route.fulfill({ contentType: "application/javascript", body: (await transform(code, { loader: "tsx", jsx: "transform" })).code.replaceAll('from "react"', `from "${react}"`).replaceAll('from "react-dom/client"', `from "${dom}"`) });
  });
  await page.goto("/__study_filter_test");
  await expect(page.getByRole("checkbox", { name: "Compare", exact: true }).filter({ visible: true })).toHaveCount(8);
  await expect(page.getByRole("button", { name: "Compare 6 reviewed offers", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "With prices", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.getByLabel("I confirm the selected offers match the same ingredient, specification, base unit, and currency").check();
  await page.getByRole("button", { name: "Compare 2 reviewed offers", exact: true }).click();
  await expect(page.getByLabel("Compared suppliers")).toHaveText("Supplier 7, Supplier 8");
  await page.getByRole("button", { name: "All", exact: true }).click();
  const first = page.getByRole("article", { name: "Offer in study: Supplier 1", exact: true }).getByRole("checkbox", { name: "Compare", exact: true });
  await expect(first).toBeEnabled();
  await first.check();
  await expect(page.getByRole("button", { name: "Compare 3 reviewed offers", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "No price", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page.getByLabel("I confirm the selected offers match the same ingredient, specification, base unit, and currency").check();
  await page.getByRole("button", { name: "Compare 6 reviewed offers", exact: true }).click();
  await expect(page.getByLabel("Compared suppliers")).toHaveText("Supplier 1, Supplier 2, Supplier 3, Supplier 4, Supplier 5, Supplier 6");
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

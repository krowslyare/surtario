import { expect, test } from "@playwright/test";
import { extractionExample } from "../fixtures/extraction";

test("sin configuración ofrece ejemplos y no simula búsqueda web", async ({
  page,
}) => {
  await page.goto("/?example=pe");
  await expect(
    page.getByText("Live search is unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Ingredient or category").fill("Arroz");
  await expect(
    page.getByRole("button", { name: "Search suppliers", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explore demo catalog", exact: true }),
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
function Harness(){const[seed,setSeed]=useState(null);return seed?<Comparison seed={seed} persistenceEnabled={false}/>:<ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true}} runs={[{...run,status:'running',sources:[]},{...run,id:'another-run',ingredient:'Other saved search',observedAt:'2026-09-16',sources:[]}]} request={{id:1,ingredient:'Arroz',region:'Lima'}} onStatus={()=>{}} onSearch={async()=>run} onExtract={async()=>proposal} onPrepare={setSeed}/>};createRoot(document.getElementById('root')).render(<Harness/>);`;
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
    page.getByText("The search returned partial content", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View source page" }),
  ).toHaveAttribute("href", "https://supplier.test/rice");
  await page.screenshot({
    path: "/tmp/research-positive-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Review offer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Review quote data");
  await dialog.getByLabel("Package unit", { exact: true }).click();
  await page.getByRole("option", { name: "kg", exact: true }).click();
  await dialog.getByLabel("Package size", { exact: true }).fill("18");
  await dialog
    .getByLabel(
      "I reviewed the source and confirm the data, including my corrections",
    )
    .check();
  await dialog.getByRole("button", { name: "Add to study" }).click();
  await page.getByRole("button", { name: /Saved searches/ }).click();
  await expect(
    page.getByRole("button", { name: /Other saved search/ }),
  ).toContainText("Sep 16, 2026");
  await page.getByRole("button", { name: /Other saved search/ }).click();
  await expect(
    page.getByText("1 offer reviewed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compare 1 reviewed offer" }).click();
  await expect(page.getByLabel("Required quantity")).toHaveValue("");
  await expect(page.getByTestId("total-0")).toHaveText("Pending");
  await page.getByRole("button", { name: "View source" }).click();
  const sourceDialog = page.getByRole("dialog");
  await expect(sourceDialog.locator(".source-record pre")).not.toBeVisible();
  await sourceDialog.getByText(/Evidence and corrections/).click();
  await expect(
    sourceDialog.getByText("Catálogo de prueba", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("clasifica una fuente, conserva la ficha elegida y revisa la lectura como evidencia separada", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/__source_quality_test(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body><div id="root"></div><script type="module" src="/__source_quality_test.tsx"></script></body></html>`,
    }),
  );
  await page.route("**/__source_quality_test.tsx", async (route) => {
    const code = `import React from 'react';import ReactDOM from'react-dom/client';const {useState}=React;const {createRoot}=ReactDOM;import{ResearchWorkspace}from'/src/components/LiveResearch.tsx';import'/src/styles/tokens.css';import'/src/styles/app.css';
const proposal=${JSON.stringify(extractionExample)};
const root={url:'https://supplier.test/catalogo',title:'Catálogo del distribuidor',description:'Listado general de abarrotes',markdown:'Catálogo de productos',contentTruncated:false,analysis:{kind:'catalog',summary:'Es un listado general, no una ficha con pack y precio confirmados.',evidence:['Catálogo de productos para restaurantes'],warnings:['Falta confirmar precio y pack.']},inspection:{state:'readable',reason:null,links:[{url:'https://supplier.test/arroz-general',label:'Arroz a granel'},{url:'https://supplier.test/arroz-5kg',label:'Arroz extra 5 kg'}]},extraction:proposal,extractionStatus:'complete',extractionError:null,observedAt:'2026-09-08T16:00:00Z',readStatus:'complete',readError:null};
const run={id:'quality-run',simulated:false,ingredient:'Arroz',region:'Lima',observedAt:'2026-09-08T16:00:00Z',status:'complete',error:null,warning:false,discarded:0,sources:[root]};
const child={url:'https://supplier.test/arroz-5kg',title:'Arroz extra\\n5 kg',description:'Ficha individual leída',markdown:'Arroz extra\\nBolsa de 5 kg\\nS/ 28',contentTruncated:false,analysis:{kind:'product',summary:'Ficha individual con pack y precio visibles.',evidence:['Bolsa de 5 kg','S/ 28'],warnings:[]},inspection:{state:'readable',reason:null,links:[]},parentSourceIndex:0,observedAt:'2026-09-10T18:30:00Z',readStatus:'complete',readError:null,extraction:proposal,extractionStatus:'complete',extractionError:null};
child.markdown += ' https://supplier.test/' + 'long-path-with-no-spaces'.repeat(500);
const unrelated={...root,url:'https://supplier.test/nosotros',title:'Historia de la empresa',description:'Página institucional',markdown:'Nuestra historia',analysis:{kind:'irrelevant',summary:'No presenta el insumo buscado.',evidence:['Nuestra historia'],warnings:[]},inspection:{state:'unrelated',reason:'No encontramos coincidencias textuales suficientes con el insumo buscado.',links:[]},extraction:null,extractionStatus:'idle'};
const shownRun=location.search.includes('unusable')?{...run,sources:[unrelated]}:run;
function Harness(){const[runs,setRuns]=useState([{...shownRun,status:'running',sources:[]}]);return <ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true}} runs={runs} request={{id:1,ingredient:'Arroz',region:'Lima'}} onStatus={()=>{}} onSearch={async()=>shownRun} onExtract={async()=>proposal} onRead={async(_runId,_sourceIndex,url)=>{window.__readUrl=url;setRuns([{...run}]);await new Promise(resolve=>setTimeout(resolve,120));setRuns([{...run,sources:[root,{...child,markdown:null,analysis:undefined,extraction:null,extractionStatus:'idle',readStatus:'running'}]}]);await new Promise(resolve=>setTimeout(resolve,80));return{...run,sources:[root,child]}}} onPrepare={()=>{}}/>};createRoot(document.getElementById('root')).render(<Harness/>);`;
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
  await page.goto("/__source_quality_test");
  await page.getByText("General catalog · Evidence and 1 detail to review", { exact: true }).click();
  await expect(
    page.getByText("General catalog", { exact: true }),
  ).toBeVisible();
  const evidence = page.getByText("Catálogo de productos para restaurantes", {
    exact: false,
  });
  await expect(evidence).not.toBeVisible();
  await page.getByText("View evidence (1)", { exact: true }).click();
  await expect(evidence).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review offer" }),
  ).toHaveCount(0);

  const picker = page.getByLabel("Page to read");
  await picker.selectOption("https://supplier.test/arroz-5kg");
  await page.getByRole("button", { name: "Read product page" }).click();
  await expect(picker).toHaveValue("https://supplier.test/arroz-5kg");
  await expect(
    page.getByText("Reading the selected page", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Product page read from Catálogo del distribuidor", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Product page read. Review the new source", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __readUrl?: string }).__readUrl,
    ),
  ).toBe("https://supplier.test/arroz-5kg");
  await page.screenshot({
    path: "/tmp/research-source-quality-mobile.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Review offer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("time")).toHaveAttribute(
    "datetime",
    "2026-09-10T18:30:00Z",
  );
  await expect(dialog.locator(".source-record pre")).not.toBeVisible();
  await dialog.getByText("Full captured text", { exact: true }).click();
  await expect(dialog.getByText("Page title: Arroz extra 5 kg")).toBeVisible();
  await page.emulateMedia({reducedMotion: "reduce"});
  for (const width of [1920, 320, 390]) {
    await page.setViewportSize({width, height: width === 1920 ? 1080 : 844});
    const capture = dialog.locator(".source-record pre");
    expect(await capture.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path: `/tmp/surtario-long-source-${width}.png`});
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.goto("/__source_quality_test?unusable=1");
  await expect(
    page.getByText("No source is ready to analyze as an offer", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View source page" }),
  ).toHaveAttribute("href", "https://supplier.test/nosotros");
  await expect(page.getByRole("button", { name: "Extract data" })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("expone estados de análisis y guardado, extracción en lote y moneda del mercado", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/__research_states_test(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script></head><body><div id="root"></div><script type="module" src="/__research_states_test.tsx"></script></body></html>`,
    }),
  );
  await page.route("**/__research_states_test.tsx", async (route) => {
    const proposal = {
      ...extractionExample,
      supplier: { value: "Portland Pantry", evidence: "Portland Pantry" },
      ingredient: { value: "Rice", evidence: "Long grain rice" },
      specification: { value: "Long grain white", evidence: "Long grain white rice" },
      packageContent: { value: "25", evidence: "25 lb bag" },
      packageUnit: { value: "lb", evidence: "25 lb bag" },
      price: { value: "20.00", evidence: "$20.00" },
      currency: { value: null, evidence: null },
    };
    const code = `import React from 'react';import ReactDOM from'react-dom/client';const {useState}=React;const {createRoot}=ReactDOM;import{ResearchWorkspace}from'/src/components/LiveResearch.tsx';import StudySelections from'/src/components/StudySelections.tsx';import Comparison from'/src/Comparison.tsx';import'/src/styles/tokens.css';import'/src/styles/app.css';import'/src/styles/controls.css';import'/src/styles/source-quality.css';import'/src/styles/workspace.css';
const proposal=${JSON.stringify(proposal)};
const incompleteProposal={...proposal,supplier:{value:null,evidence:null}};
const sources=Array.from({length:6},(_,index)=>({url:'https://supplier.test/rice-'+index,title:'Long grain rice supplier '+(index+1),description:'Long supplier description '.repeat(30),markdown:'Portland Pantry\\nLong grain white rice\\n25 lb bag\\n$20.00',contentTruncated:false,analysis:{kind:'product',summary:'A product page with a package price.',evidence:['25 lb bag · $20.00'],warnings:[]},extraction:null,extractionStatus:'idle',extractionError:null,inspection:{state:'readable',reason:null,links:[]}}));
const run={id:'states-run',simulated:false,ingredient:'Long grain white rice',region:'Portland, OR, US',observedAt:'2026-09-21T08:00:00Z',status:'complete',error:null,warning:false,discarded:0,sources};
function Harness(){const[departed,setDeparted]=useState(false);const[selections,setSelections]=useState([]);const[showStudy,setShowStudy]=useState(false);const[prepared,setPrepared]=useState(null);if(departed)return <p>Research closed</p>;return prepared?<Comparison seed={prepared} persistenceEnabled={false}/>:showStudy?<StudySelections selections={selections} prospects={[]} filter="all" onRemove={()=>{}} onRemoveProspect={()=>{}} onPrepare={setPrepared} onReplyPrepare={()=>{}} onInquiry={()=>{}}/>:<><button onClick={()=>setDeparted(true)}>Leave research</button><ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true}} runs={[run]} request={{id:1,ingredient:run.ingredient,region:run.region}} onStatus={()=>{}} onSearch={async()=>run} onExtract={async(_runId,index)=>{window.__analysisCalls=(window.__analysisCalls??0)+1;await new Promise(resolve=>setTimeout(resolve,location.search.includes("cancel")?1500:120));window.__analysisSettled=true;return index===5?incompleteProposal:proposal}} onPrepare={()=>{}} onCalculate={()=>{}} selections={selections} availableStudySlots={12-selections.length} onOpenStudy={()=>setShowStudy(true)} onReview={selection=>{setSelections(current=>[...current,selection]);return true}}/></>};createRoot(document.getElementById('root')).render(<Harness/>);`;
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

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/__research_states_test");
  await page
    .getByRole("button", { name: "Analyze remaining sources (6)" })
    .click();
  await expect(page.getByText(/Analyzing source 1 of 6/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Analyzing source/ }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Review offer" })).toHaveCount(6);
  await expect(page.getByText(/6 sources analyzed/)).toBeVisible();
  await expect(page.getByText("6 product offers analyzed · 5 ready for quick review · 1 needs individual review.")).toBeVisible();
  await expect(page.getByText(/Prioritized for review/)).toBeVisible();
  await expect(page.getByText("Comparable unit price: USD 0.80 / lb")).toHaveCount(6);

  await page.getByRole("button", { name: "Review offer" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Currency", { exact: true })).toContainText(
    "USD · US dollars",
  );
  await expect(dialog.getByText("Search market default · USD")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Review 5 remaining complete offers" }).click();
  const quickReview = page.getByRole("dialog");
  await expect(quickReview).toContainText("Review product offers");
  await expect(quickReview.getByRole("checkbox")).toHaveCount(7);
  await expect(quickReview.getByText("Needs individual review: supplier.")).toBeVisible();
  await expect(quickReview.getByText("20.00 USD · 25 lb", { exact: false })).toHaveCount(6);
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await quickReview.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/surtario-quick-review-${width}.png` });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await quickReview
    .getByLabel(
      "I reviewed these source summaries and confirm the selected offer data.",
    )
    .check();
  await quickReview.getByRole("button", { name: "Add 5 offers to study" }).click();
  await expect(page.getByText("In My study", { exact: true })).toHaveCount(5);
  await expect(page.locator(".research-source.is-reviewed")).toHaveCount(5);
  await expect(page.getByText("5 offers added to My study", { exact: false })).toBeVisible();
  await expect(page.getByText("All complete offers reviewed")).toBeVisible();
  await expect(page.getByText(/5 already in My study/)).toBeVisible();

  const reviewedCard = page.locator(".research-source.is-reviewed").first();
  const editBox = await reviewedCard.getByRole("button", { name: "Edit review" }).boundingBox();
  const calculateBox = await reviewedCard.getByRole("button", { name: "Calculate this offer" }).boundingBox();
  expect(editBox).not.toBeNull();
  expect(calculateBox).not.toBeNull();
  expect(Math.abs(editBox!.x - calculateBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(editBox!.width - calculateBox!.width)).toBeLessThanOrEqual(1);

  for (const width of [1920, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    await page.screenshot({
      path: `/tmp/surtario-research-states-${width}.png`,
      fullPage: true,
    });
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      page: document.documentElement.scrollWidth,
      widest: Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .map((element) => ({
          className: element.className,
          right: element.getBoundingClientRect().right,
          width: element.getBoundingClientRect().width,
        }))
        .sort((a, b) => b.right - a.right)[0],
    }));
    expect(layout.page, JSON.stringify(layout)).toBeLessThanOrEqual(
      layout.viewport,
    );
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("button", { name: "View my study" }).click();
  await expect(page.getByRole("article", { name: /Offer in study/ })).toHaveCount(5);
  await page
    .getByLabel(
      "I confirm the selected offers match the same ingredient, specification, base unit, and currency",
    )
    .check();
  await page.getByRole("button", { name: "Compare 5 reviewed offers" }).click();
  await expect(page.getByRole("article", { name: "Offer from Portland Pantry" })).toHaveCount(5);
  await page.getByLabel("Required quantity", { exact: true }).fill("40");
  const comparisonOffers = page.getByRole("article", { name: "Offer from Portland Pantry" });
  await page.getByRole("button", { name: "Apply shared terms" }).click();
  const sharedTerms = page.getByRole("dialog", { name: "Apply shared terms to 5 offers" });
  await sharedTerms.getByLabel("Minimum packs").fill("1");
  await sharedTerms.getByLabel("Delivery per order").fill("0");
  await sharedTerms.getByLabel("Shared tax on goods and delivery").click();
  await sharedTerms.getByRole("option", { name: "Final amounts, including tax" }).click();
  await sharedTerms.getByLabel("All suppliers can deliver when I need it").check();
  await sharedTerms.getByRole("button", { name: "Apply to 5 offers" }).click();
  await expect(page.getByText("Terms confirmed", { exact: true })).toHaveCount(5);
  for (let index = 0; index < 5; index += 1)
    await expect(page.getByTestId(`total-${index}`)).toHaveText("USD 40.00");
  await comparisonOffers.first().getByRole("button", { name: "Choose offer" }).click();
  await expect(comparisonOffers.first().getByRole("button", { name: "Selected offer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "These offers have the same order total" })).toBeVisible();
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/surtario-complete-comparison-${width}.png`, fullPage: true });
  }
  await page.goto("/__research_states_test?cancel");
  await page.getByRole("button", { name: "Analyze remaining sources (6)" }).click();
  await expect(page.getByText(/Analyzing source 1 of 6/)).toBeVisible();
  await page.getByRole("button", { name: "Leave research", exact: true }).click();
  await expect(page.getByText("Research closed", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { __analysisSettled?: boolean }).__analysisSettled)).toBe(true);
  expect(await page.evaluate(() => (window as Window & { __analysisCalls?: number }).__analysisCalls)).toBe(1);
  expect(errors).toEqual([]);
});

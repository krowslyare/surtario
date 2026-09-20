import { expect, test } from "@playwright/test";

for (const outcome of ["complete", "empty", "failed"] as const) {
  test(`live progress follows checkpoints and ends in ${outcome} without retrying`, async ({ page }) => {
    await page.route("**/__progress_test", route => route.fulfill({ contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/__progress_test.tsx"></script></body></html>` }));
    await page.route("**/__progress_test.tsx", async route => {
      const code = `import React from 'react';const {useState,useRef}=React;import ReactDOM from 'react-dom/client';import {ResearchWorkspace} from '/src/components/LiveResearch.tsx';import '/src/styles/tokens.css';import '/src/styles/app.css';
const base={id:'current',clientId:'test-request',simulated:true,ingredient:'Rice',region:'Portland',observedAt:'2026-09-19',status:'running',sources:[],error:null,warning:false,discarded:0};
function Harness(){const[run,setRun]=useState(null);const[calls,setCalls]=useState(0);const[connected,setConnected]=useState(true);const resolve=useRef(null);return <main><ResearchWorkspace connected={connected} status={{searchEnabled:true,extractionEnabled:true}} runs={run?[run]:[]} pendingRun={run??undefined} request={{id:1,ingredient:'Rice',region:'Portland'}} onStatus={()=>{}} onSearch={()=>{setCalls(n=>n+1);setRun({...base,progress:{stage:'searching',searchesCompleted:0,searchesTotal:3,candidates:0,pagesChecked:0,currentHost:null}});return new Promise(done=>{resolve.current=done})}} onExtract={async()=>{throw Error('not used')}} onPrepare={()=>{}}/><output aria-label="Search calls">{calls}</output><button onClick={()=>setConnected(value=>!value)}>Toggle connection</button><button onClick={()=>setRun({...base,sources:[[null,'lb'],['25',null],['25','lb']].map(([size,unit],i)=>({url:'https://supplier.com/rice-'+i,title:'Rice source '+i,extractionStatus:'complete',analysis:{kind:'product'},extraction:{price:{value:'20'},currency:{value:'USD'},packageContent:{value:size},packageUnit:{value:unit}}})),progress:{stage:'reading',searchesCompleted:3,searchesTotal:3,candidates:8,pagesChecked:3,currentHost:'supplier.com'}})}>Provider checkpoint</button><button onClick={()=>{const final={...base,status:'${outcome === "empty" ? "complete" : outcome}',sources:${outcome === "complete" ? "[{url:'https://supplier.test/rice',title:'Rice supplier',description:'Rice available by the pack',markdown:'Contact the supplier for current terms.',contentTruncated:false,extraction:null,extractionStatus:'idle',extractionError:null}]" : "[]"},warning:${outcome === "complete"},error:${outcome === "failed" ? "'Search failed. Start a new request to try again.'" : "null"}};setRun(final);resolve.current(final)}}>Provider finishes</button></main>};ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>);`;
      const { transform } = await import("esbuild");
      const module = await (await page.request.get("/src/main.tsx")).text();
      const react = module.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
      const dom = module.match(/"([^" ]*\/react-dom_client\.js[^" ]*)"/)![1];
      await route.fulfill({ contentType: "application/javascript", body: (await transform(code, { loader: "tsx", jsx: "transform" })).code.replaceAll('from "react"', `from "${react}"`).replaceAll('from "react-dom/client"', `from "${dom}"`) });
    });
    await page.setViewportSize({ width: outcome === "failed" ? 390 : 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: outcome === "complete" ? "no-preference" : "reduce" });
    await page.clock.install();
    await page.goto("/__progress_test");
    await expect(page.getByRole("heading", { name: "Finding your options." })).toBeVisible();
    await page.getByRole("button", { name: "Provider checkpoint" }).click();
    const progress = page.getByRole("region", { name: "Search progress" });
    await expect(progress).toContainText("8 candidate sources · 3 pages checked");
    await expect(progress).toContainText("supplier.com");
    const arrivals = progress.getByLabel("Sources arriving");
    await expect(arrivals.getByText("Package size pending · To review", { exact: true })).toHaveCount(2);
    await expect(arrivals.getByText("25 lb · To review", { exact: true })).toBeVisible();
    if (outcome === "complete") {
      await expect(progress.locator(".research-leaf-left")).toHaveCSS("animation-name", "research-leaf-breathe");
      // Shift wall-clock age only; keep the animation clock on its real timeline.
      await page.clock.setSystemTime(new Date(Date.now() + 35_000));
      await expect(progress).toContainText("Waiting for the next update.");
      await expect(progress).toContainText("8 candidate sources · 3 pages checked");
      await expect(page.getByLabel("Search calls")).toHaveText("1");
      await page.getByRole("button", { name: "Toggle connection" }).click();
      await expect(progress).toContainText("Connection interrupted.");
      await expect(progress.locator(".research-leaf-left")).toHaveCSS("animation-play-state", "paused");
      await page.getByRole("button", { name: "Toggle connection" }).click();
      await expect(progress).not.toContainText("Connection interrupted.");
    } else {
      await expect(progress.getByRole("heading")).toHaveCSS("animation-name", "none");
      await expect(progress.locator(".research-leaf-left")).toHaveCSS("animation-name", "none");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Provider finishes" }).click();
    await expect(progress).toHaveCount(0);
    if (outcome === "failed") {
      await expect(page.getByRole("alert")).toContainText("Search failed");
      await expect(page.getByText("Search finished.", { exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByText("Search finished.", { exact: true })).toBeVisible();
      if (outcome === "empty") await expect(page.getByRole("heading", { name: "No usable sources were retrieved" })).toBeVisible();
      else {
        await expect(page.locator(".research-completion")).toContainText("1 source is ready to review. Some pages need attention.");
        await expect(page.getByRole("heading", { name: "Rice supplier", exact: true })).toBeVisible();
      }
    }
    await expect(page.getByLabel("Search calls")).toHaveText("1");
  });
}

test("a thirty-source search exposes twelve first and expands without another provider call", async ({ page }) => {
  await page.route("**/__expanded_search", route => route.fulfill({ contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/__expanded_search.tsx"></script></body></html>` }));
  await page.route("**/__expanded_search.tsx", async route => {
    const code = `import React from 'react';import ReactDOM from 'react-dom/client';import {ResearchWorkspace} from '/src/components/LiveResearch.tsx';import '/src/styles/tokens.css';import '/src/styles/app.css';import '/src/styles/brand.css';import '/src/styles/controls.css';import '/src/styles/motion.css';import '/src/styles/workspace.css';
const run={id:'expanded',clientId:'expanded-test',simulated:true,ingredient:'Rice',region:'Portland',observedAt:'2026-09-20',status:'complete',error:null,warning:false,discarded:0,sources:Array.from({length:30},(_,i)=>({url:'https://supplier'+i+'.test/rice',title:'Rice supplier source '+(i+1),description:'Synthetic source for UI verification',markdown:'Rice 50 lb',contentTruncated:false,extraction:null,extractionStatus:'idle',extractionError:null}))};
const previous={...run,id:'previous',ingredient:'Flour',observedAt:'2026-09-19',sources:run.sources.slice(0,2).map((source,i)=>({...source,url:'https://supplier'+i+'.test/flour',title:'Flour supplier source '+(i+1),markdown:'Flour 50 lb'}))};
function Harness(){const[calls,setCalls]=React.useState(0);return <><ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true,autoReviewEnabled:true}} runs={[run,previous]} request={{id:1,ingredient:'Rice',region:'Portland'}} onStatus={()=>{}} onSearch={async()=>{setCalls(n=>n+1);return run}} onExtract={async()=>{throw Error('not used')}} onPrepare={()=>{}}/><output aria-label="Search calls">{calls}</output></>};ReactDOM.createRoot(document.getElementById('root')).render(<Harness/>);`;
    const { transform } = await import("esbuild");
    const module = await (await page.request.get("/src/main.tsx")).text();
    const react = module.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
    const dom = module.match(/"([^" ]*\/react-dom_client\.js[^" ]*)"/)![1];
    await route.fulfill({ contentType: "application/javascript", body: (await transform(code, { loader: "tsx", jsx: "transform" })).code.replaceAll('from "react"', `from "${react}"`).replaceAll('from "react-dom/client"', `from "${dom}"`) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/__expanded_search");
  const region = page.getByRole("region", { name: "Web research", exact: true });
  await expect(region.getByRole("article")).toHaveCount(12);
  await expect(region).toContainText("30 candidate sources");
  await region.getByRole("button", { name: "Show all 30 sources" }).click();
  await expect(region.getByRole("article")).toHaveCount(30);
  await expect(region.getByRole("heading", { name: "Rice supplier source 30", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await region.getByRole("button", { name: "Show first 12 sources" }).click();
  await expect(region.getByRole("article")).toHaveCount(12);
  const details = region.getByRole("button", { name: /Search details/ });
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await details.click();
  await expect(region.getByText(/30 with recovered text/)).toBeVisible();
  await expect(region.getByText(/AI analyzes up to 3 product pages automatically/)).toBeVisible();
  const history = region.getByRole("button", { name: "Saved searches (2)" });
  await expect(history).toHaveAttribute("aria-expanded", "false");
  await history.click();
  await region.getByRole("button", { name: /Search 2 · Flour/ }).press("Enter");
  await expect(region.getByRole("heading", { name: "Flour in Portland", exact: true })).toBeVisible();
  await expect(history).toHaveAttribute("aria-expanded", "false");
  await expect(history).toBeFocused();
  await expect(region.getByRole("article")).toHaveCount(2);
  await expect(region.getByText("Search finished.", { exact: true })).toHaveCount(0);
  await history.click();
  await region.getByRole("button", { name: /Search 1 · Rice/ }).click();
  await expect(region.getByRole("heading", { name: "Rice in Portland", exact: true })).toBeVisible();
  await expect(region.getByRole("article")).toHaveCount(12);
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Search calls")).toHaveText("1");
});

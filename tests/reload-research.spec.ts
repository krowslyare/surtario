import { expect, test } from "@playwright/test";

// Inject only provider data; exercise the real component and tab checkpoint.
// Neither variant calls Convex actions or a paid provider.
for (const state of ["running", "complete"] as const) {
  test(`reload restores ${state} research without starting another search`, async ({ page }) => {
    await page.route("**/__reload_research", route => route.fulfill({ contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div><script type="module" src="/__reload_research.tsx"></script></body></html>` }));
    await page.route("**/__reload_research.tsx", async route => {
      const code = `import React from 'react'; import ReactDOM from 'react-dom/client';
import {ResearchWorkspace} from '/src/components/LiveResearch.tsx';
import {readWorkspaceCheckpoint,writeWorkspaceCheckpoint} from '/src/workspaceCheckpoint.ts';
import '/src/styles/tokens.css'; import '/src/styles/app.css';
const run={id:'restored-run',clientId:'already-started-request',simulated:true,ingredient:'Rice',region:'Portland',observedAt:'2026-09-20',status:'${state}',error:null,warning:false,discarded:0,progress:{stage:'reading',searchesCompleted:3,searchesTotal:3,candidates:13,pagesChecked:7,currentHost:'supplier.test'},sources:Array.from({length:13},(_,i)=>({url:'https://supplier.test/rice-'+i,title:'Rice source '+i,description:'Published source',markdown:'Supplier information',contentTruncated:false,extraction:null,extractionStatus:'idle',extractionError:null}))};
function Harness(){
const[resume]=React.useState(()=>({...readWorkspaceCheckpoint('cursor')??{${state === "running" ? "clientId:'already-started-request'" : "id:'restored-run'"}},sequence:0}));
const[calls,setCalls]=React.useState(0);
const[runs,setRuns]=React.useState(undefined);
React.useEffect(()=>{const timer=setTimeout(()=>setRuns([run]),150);return()=>clearTimeout(timer)},[]);
const persist=React.useCallback(cursor=>writeWorkspaceCheckpoint('cursor',cursor),[]);
return <main><ResearchWorkspace status={{searchEnabled:true,extractionEnabled:true}} runs={runs} resumeRequest={resume} onActiveRun={persist} onStatus={()=>{}} onSearch={async()=>{setCalls(n=>n+1);return run}} onExtract={async()=>{throw Error('not used')}} onPrepare={()=>{}}/><output aria-label="Search calls">{calls}</output></main>}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><Harness/></React.StrictMode>);`;
      const { transform } = await import("esbuild");
      const module = await (await page.request.get("/src/main.tsx")).text();
      const react = module.match(/"([^" ]*\/react\.js[^" ]*)"/)![1];
      const dom = module.match(/"([^" ]*\/react-dom_client\.js[^" ]*)"/)![1];
      await route.fulfill({ contentType: "application/javascript", body: (await transform(code, { loader: "tsx", jsx: "transform" })).code.replaceAll('from "react"', `from "${react}"`).replaceAll('from "react-dom/client"', `from "${dom}"`) });
    });
    await page.goto("/__reload_research");
    if (state === "running") {
      await expect(page.getByRole("heading", { name: "Reading the details." })).toBeVisible();
      await expect(page.getByRole("region", { name: "Search progress" })).toContainText("13 candidate sources · 7 pages checked");
    } else {
      await page.getByRole("button", { name: "Show all 13 sources" }).click();
      await expect(page.getByRole("article")).toHaveCount(13);
    }
    await page.reload();
    if (state === "running") {
      await expect(page.getByRole("heading", { name: "Reading the details." })).toBeVisible();
      await expect(page.getByRole("region", { name: "Search progress" })).toContainText("13 candidate sources · 7 pages checked");
    } else {
      await expect(page.getByRole("article")).toHaveCount(13);
      await expect(page.getByRole("button", { name: "Show first 12 sources" })).toBeVisible();
      await expect(page.getByText("Search finished.", { exact: true })).toHaveCount(0);
    }
    await expect(page.getByLabel("Search calls")).toHaveText("0");
  });
}

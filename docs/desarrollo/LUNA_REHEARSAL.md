# Local provider rehearsal with Luna CLI

This is an operator-run, synthetic rehearsal. The browser uses the real application and a dedicated anonymous Convex backend. The local bridge substitutes provider transports; it is not a deployed backend or a production OpenAI-compatible service.

| Boundary | What actually runs |
| --- | --- |
| React, validation, ownership, saved revisions | Application code and local Convex |
| Web search | Three fixed synthetic sources for queries containing `arroz`; otherwise an empty result |
| Structured extraction and visual reading | Real `codex exec -m gpt-5.6-luna` calls with the application's JSON schema |
| Purchasing advice | Actual Convex Agent tools, then a real Luna CLI response using their outputs |
| AgentMail send | Local receipt only; no external email |
| Reply ingestion | Two signed synthetic webhook deliveries to the local app; original routing and deduplication |
| OpenAI API, Firecrawl service, AgentMail service | Not exercised by this harness |

The application already forces `evaluateScenarios` and `readEvidence` in that order. The bridge returns those forced tool-call envelopes; Convex executes the actual tools. Luna receives their results for the final qualitative explanation. This verifies application orchestration, not autonomous tool selection by Luna.

The bridge supports only the non-streaming structured Responses requests this app makes. It is deliberately sequential and rejects concurrent requests. It never substitutes another model or canned success after a CLI failure. Existing application timeouts and explicit retry rules remain in force.

## Setup

Use a separate checkout with no cloud selector, deploy key, private data or existing local deployment. Keep your normal development environment intact. Requirements: Node/npm, a signed-in Codex CLI with access to `gpt-5.6-luna`, and Poppler's `pdftoppm` with working font configuration for the PDF case. The observed CLI version was `0.153.0`.

```sh
npm ci
CONVEX_AGENT_MODE=anonymous npx convex dev --local-cloud-port 3240 --local-site-port 3241
```

After Convex reports the **local** backend ready, use another terminal in that checkout:

```sh
node scripts/rehearsal/configure.mjs
node scripts/rehearsal/server.mjs
```

In a third terminal:

```sh
npm run dev -- --port 5203 --strictPort
```

Open `http://127.0.0.1:5203`. The yellow notice must say that Luna CLI is real and web/mail are simulated. Configuration lives in ignored `.local/rehearsal/bridge.json` and `.env.local`. The configuration script sets dummy provider keys only on the verified anonymous local target. It rejects conflicting selectors. Do not run it on an ordinary cloud checkout or publish this rehearsal frontend.

The server transport accepts only loopback configuration on a loopback Convex deployment, strips provider authorization headers and restricts supported upstream paths. Its bridge token and signing secret remain server-side. Stop the bridge to end the rehearsal; keep this checkout separate from real provider configuration. The production bundle excludes the rehearsal banner and is checked for leaked bridge configuration names.

Configuration replaces any existing rehearsal flag with `VITE_REHEARSAL=true` before enabling simulated providers. New research runs and send reservations retain server-derived synthetic provenance, which reaches the review, saved comparison and advisor evidence even after the bridge is disabled. Earlier rehearsal records predate this marker: start a new research/send flow when verifying provenance; old records are not silently reclassified. Existing live records without the optional marker keep their original provenance.

Codex runs outside the repository with ephemeral sessions, read-only sandboxing, user configuration ignored, shell/plugins/memories/multi-agent disabled and web search disabled. Prompts use stdin and process arguments rather than shell interpolation. Unexpected CLI tool activity rejects the result. This is a manual local workflow using the operator's existing CLI login, not an account-auth workaround for a public service or CI. See the official [non-interactive CLI documentation](https://learn.chatgpt.com/docs/non-interactive-mode).

PDFs are rasterized locally before attaching their pages to Luna. This does not prove native PDF handling by the OpenAI API. The harness is limited to the application's bundled, single-page synthetic PDF; do not use it to validate arbitrary multipage/private files.

## Rehearsal checklist

1. Search `Arroz extra` in Lima with **Buscar en la web**, without a document or quantity. Verify two priced source candidates and one distributor without a published price.
2. Extract and review Casero Norte and Mayorista Volumen sequentially. Expected source facts: PEN 50 / 10 kg and PEN 110 / 25 kg. Review literal citations; quantity, freight and minimum are not inferred by the extraction schema.
3. Save Distribuidor Central as a candidate with the synthetic contact printed in the source. Prepare its inquiry without quantity. Before approving, verify that the send button is disabled and the bridge has no `mail_send` event.
4. Approve the simulated email. The server sends two signed webhook deliveries. Both return `200 Accepted`; exactly one reply must appear. Review it manually as a new offer: PEN 47 / 10 kg. For 20 kg the goods subtotal is PEN 94. Leave unknown freight/arrival pending and save the comparison.
5. Return to the web study, confirm equivalence and compare the two reviewed sources. Enter 20 kg. For this synthetic scenario, manually confirm Casero's minimum of one package, free freight, final tax-inclusive amounts and delivery; these are tester-supplied confirmations, not newly scraped facts. For Mayorista, confirm the source's minimum of five packages, PEN 40 freight, final amounts and delivery.
6. Independently check Casero: two packages, 20 kg received, zero excess, PEN 100 total. Mayorista: five packages, 125 kg received, 105 kg excess, PEN 550 goods + PEN 40 freight = PEN 590. The PEN 490 difference is required cash, not realized savings.
7. Save the comparison. Set cash priority, PEN 200 available, confirmed consumption of 2 kg/day, current stock of 4 kg and maximum coverage of 14 days. Save the scenario and request AI advice. The tools should identify Casero as eligible, with 12 days of coverage; Mayorista exceeds cash and coverage constraints. Reviewed conditions take precedence over older pending wording in original evidence.
8. Open another page, recover the comparison and scenario, and confirm that amounts, context and narrative return without a new `luna` log event. Change context to see the stale-analysis notice before another run.
9. Read the bundled PNG and PDF, compare against the original, and confirm PEN 80 / 18 kg. Tax, freight and minimum remain pending. Review before continuing to comparison.
10. Import `tests/fixtures/insumos-ejemplo.xlsx` through the browser file picker. Choose **Insumos**, the second column and header row; review Arroz/Aceite. Save and reload. Only reviewed names should return, not the file or the price column. Also exercise manual entry, removal of a duplicate row and save/recovery.
11. At 390 × 844, run an unknown-ingredient search. It must say no usable sources were retrieved, not that no suppliers exist. Reach document tools by keyboard, open/close the review and check focus and scrolling.

For the video, show one coherent decision: discovery → review → purchasing context → verdict. Use the no-price distributor and document routes as short branches or prepared examples. This verification was an interactive engineering rehearsal with fixes; it is **not evidence of a timed three-minute recording**, a submitted video or a full live-provider acceptance run.

## Observed results — September 9, 2026

- Chrome computer use completed the flows above against the isolated local app, including the native XLSX file picker and 390 × 844 mobile inspection. Saved manual/XLSX lists, document results, candidate, linked reply, comparison and advisor scenarios were recovered.
- Six substantive Luna CLI calls completed: two web extractions, two advisor explanations, PNG and rasterized PDF. Observed CLI durations were 8.1–13.3 seconds; this is a small synthetic sample, not a latency guarantee. A separate structured-output CLI smoke call also passed.
- The first actual extraction exposed `Specify userId or threadId`. All three stateless Agent call sites now receive a fresh server-generated scope with history retrieval and message storage disabled. Regression tests keep the real Agent and AI SDK while replacing only HTTP responses.
- The first advisor explanation repeated old pending-freight wording despite reviewed confirmations. The scenario tool now supplies those confirmed conditions explicitly and the instructions define their precedence. The next saved run used a PEN 210 budget and correctly respected confirmed delivery, zero freight and included taxes.
- PDF rasterization initially failed because the bundled Poppler could not find font configuration. Pointing the local process's `FONTCONFIG_FILE` at its installed configuration resolved it; no application/provider timeout was relaxed. The failed record remained visible and the user explicitly retried.
- Provider transport refusal/credential stripping tests, real Agent boundary tests and the existing suite pass: 138 unit/backend tests. Typecheck and hosting build checks passed. All 51 browser journeys passed on another anonymous local backend. After correcting a shared-dependency font path in that test checkout, all 12 focused responsive/keyboard checks passed again with a normal local install.

Local evidence stays outside Git: `.local/rehearsal/events.jsonl` records model calls, tool envelopes and duplicate webhook delivery; `persistence-evidence.json` contains a bounded, sanitized read-back of the local tables. CLI result/event files are retained in the temporary directories named in the log. No credentials, session token or private restaurant data belong in these artifacts.

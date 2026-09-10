# Source analysis and explicit product reads

This delivery addresses the counterexamples in [the initial Firecrawl validation](FIRECRAWL_VALIDATION.md). It adds local implementation and real-source model evidence; it does not complete hosted provider acceptance.

## Product behavior

1. Search still returns up to three candidate sources. A server inspection identifies missing text, recognizable error pages and sources with no meaningful query-token match. This is a lexical filter, not proof of relevance. Original links remain visible; unreadable pages can still be manually reviewed as supplier leads.
2. Analysis receives the ingredient, title, URL, truncation state and saved source text. The Agent classifies a product, catalog, contact, irrelevant source or unresolved ambiguity. Summary, warnings and literal references persist in Convex. Non-product results cannot become comparable offers through the extraction response.
3. A user can select an eligible same-site link from the source and explicitly read its product page. The server checks ownership and exact membership in the saved source's links. Each original source allows one child read, with no nested reads or automatic paid retries: at most three original sources plus three children per research run. Errors and uncertain reads remain visible.
4. The child retains its own URL, observation time, text, truncation status and parent relationship. Firecrawl `/v2/scrape` uses `maxAge: 0`, a 20-second provider timeout and a 25-second application deadline. Changed response URLs, including same-origin redirects, are rejected to avoid attributing another page's content to the selected URL.
5. Only a usable product extraction opens review. The user confirms values and equivalence before comparison; quantity, tax, freight, minimum and delivery remain separate. Legacy extractions are re-inspected at comparison save, so old records cannot bypass the new source-quality gate.

The model selects numbered source references. The server copies their exact text into the existing evidence fields, rejects nonexistent references, and clears non-product offers before field validation. Page titles are labeled metadata and normalized to one line. This guarantees literal provenance, not semantic correctness: user review remains necessary. Long evidence is collapsed by default in the interface; summaries and warnings stay visible.

No supplier-specific parser, recursive crawler, automatic contact message or new model gateway was introduced. Production uses the configured server-side OpenAI model through the existing Agent component. Luna CLI remains an isolated local test transport.

## Real-provider and model observations — September 10, 2026 UTC

The [sanitized evidence manifest](evidence/firecrawl-source-analysis-2026-09-10.json) records timestamps, source URLs, hashes, classifications and extracted values. Full page bodies, local capability tokens and raw model events are ignored operator evidence.

- **Real Firecrawl read:** the Brilhante Extra product URL returned 6,331 characters in 10.154 seconds through the new `readProductPage` adapter. It preserved the 50 kg presentation and PEN 208 published price. This is not a delivered quotation or proof of current availability.
- **Recorded-source inspection:** replaying all 15 original public search results identified the four unreadable pages, one site-error page and all three irrelevant negative-control results. No provider call was made for this replay.
- **Real Luna interpretation through local Convex/Agent/AI SDK:** the Mundo Abarrotes category remained a catalog with null offer fields and warnings about 49/50 kg, promotions and sold-out entries. The selected product yielded PEN 208 for 50 kg with literal field references. The Makro category stayed non-comparable; Monte Sol's catalog kept the requested 20 L price absent and recommended confirmation with the supplier.
- **Failures retained:** the first catalog and product responses classified correctly but failed literal-quote validation because the model joined noncontiguous text. Numbered references fixed that failure. An intermediate result confused split lines with truncation and over-expanded a specification; the final catalog/product rerun corrected both. Those final action calls took 13.088 and 13.297 seconds including local CLI/network work. Makro and Monte Sol used the earlier literal-quote output schema; they were not rerun on the final reference schema.

Nine real Luna generations ran in this delivery: four initial cases, two evidence-reference retries, two final catalog/product cases, and one browser-driven synthetic product analysis. No direct OpenAI API request or external email was sent. The selected real page was fetched once; recorded pages were reused for model work.

## Verification and limits

- 155 unit/backend/configuration tests passed. Regression coverage includes ownership, exact-link selection, idempotent child reads, persisted failures, cross-site/same-site redirects, legacy source gates, non-product fields, nonexistent references, multiline metadata and the actual Agent/SDK boundary with a simulated response.
- Three focused Playwright journeys passed: extraction review, catalog-to-child UI states and legacy web-review persistence. The transport-only quality test also checks stale reactive updates, an unrelated source, collapsed evidence and 390px reflow. The full browser suite was not rerun for this slice.
- In-app browser computer use exercised synthetic search → explicit child read → real Luna analysis → review → comparison → local Convex save. The normalized unit price was PEN 5/kg from PEN 50 per 10 kg; missing purchase conditions stayed pending. Mobile 390px and desktop 934px had no horizontal overflow. A development hot reload caused a repeat-search throttle; opening the saved research recovered the original read and analysis without another model call.
- Independent adversarial review closed without material findings after correcting legacy quality bypass, validation order, changed-URL provenance and multiline title labeling.

The source filter does not establish equivalence or guarantee detection of every misleading page. Discovery still may return empty or unreadable results; a fresh scrape does not prove the supplier updated its price. Contact-only sourcing, missing data and manual confirmation remain first-class outcomes. Direct OpenAI API acceptance, the combined hosted journey and restaurant validation remain open. No cloud deployment, repository visibility change or contest submission occurred in this delivery.

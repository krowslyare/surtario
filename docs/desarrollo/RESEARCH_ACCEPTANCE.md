# Research core acceptance — local, September 16, 2026

This validates the English research → cited extraction → human review → comparison → saved recovery path against the local anonymous Convex backend, using real Firecrawl and real Luna CLI. It does not certify direct OpenAI API acceptance or the hosted deployment. No supplier was contacted and no order was placed.

## Fixes verified

- Exact product counts survive a neighboring shipping-weight label; gift-box wording does not erase an explicit product count. Approximate quantities, shipping weight and counts of containers remain excluded.
- Explicit compressed currency labels such as `USDNow $3.24` are retained. A bare `$` remains ambiguous.
- Published product-currency metadata survives the text length limit. Conflicting currencies are not silently resolved.
- A numeric field must appear in its cited line; a real quote cannot justify a fabricated price or an unprinted calculated package weight.
- Reviewed selections survive switching between saved research rounds. The comparison still requires explicit review of matching ingredient, specification, base unit and currency.
- Date-only observation records display the recorded calendar day without shifting to the prior day in an American timezone.
- The planner is instructed not to require identical package sizes: normalization is handled by the existing deterministic comparison engine.

## Acceptance checks

| Boundary | Executed evidence |
| --- | --- |
| Real discovery and interpretation | Fresh all-purpose-flour adaptive case and fresh Gala apple discovery, with real Firecrawl and Luna CLI; final counts in the accompanying evidence JSON. |
| Numeric and source guards | Positive exact-count/currency cases plus negative approximate-weight, shipping-weight, container-count, missing-currency and fabricated-number regressions. |
| Cross-round product journey | Real Bakers Authority and King Arthur flour sources selected from different rounds; both 5 lb with explicit USD prices. |
| Independent calculation | 470 cents / 5 lb = USD 0.94/lb; 695 cents / 5 lb = USD 1.39/lb. Browser assertions verified both values after save/reload. |
| Missing commercial terms | At a test quantity of 10 lb, freight, supplier minimum and tax remain unknown. Final totals remain Pending, with no approved delivered-cost winner. |
| Review traceability | Test review normalized shared ingredient/specification labels to “all purpose flour” / “Unbleached all-purpose flour”; original source text, URL, proposals and manual corrections persisted. This is a test review, not the user's commercial approval. |
| Persistence and isolation | Browser restore of the actual-source comparison, existing saved-study cross-tab conflict/isolation test, and backend ownership/cancellation/stale-revision checks. |
| Mobile | Actual-source flow at 390 × 844, no horizontal overflow; source audit and comparison inspected. |
| Empty search and page failures | Prior real invented-ingredient control: two empty rounds and zero sources. Existing regression coverage preserves earlier evidence after an unreadable page. |

265 unit/backend tests across 42 files and TypeScript/build passed. Five focused browser journeys passed; after the final UI changes the two affected research journeys passed again. A separate real-source browser acceptance verified review across rounds, arithmetic, pending totals, save/reload and source audit.

## Real-provider outcomes

[Sanitized execution evidence](evidence/research-acceptance-2026-09-16.json): the fresh flour case completed six rounds in 592 seconds, with 24 unique sources, 22 interpreted, 12 priced product sources across 11 domains and five domains with price/currency/package fields. No interpretations failed. The run used its research budget and retained the incomplete-coverage label; it did not claim exhaustive search. The late rounds added Weisenberger Mill at USD 5.75 for 5 lb, among other alternatives.

Fresh Gala discovery retained 11 sources. Four selected pages were interpreted: Walmart's 3 lb bag retained USD 3.24, proving the compressed currency fix against real retrieved content and Luna output; BJ's sold-out status, ambiguous bare-dollar prices and Kauffman's multiple package choices remained visible rather than becoming confirmed offers. The four-page interpretation sample is not a claim that all eleven sources were interpreted.

## Meaning of the result

The tested product path can produce usable, cited price-per-unit comparisons. A supplier page may still omit delivery, stock, currency or order terms, and a broad ingredient request does not establish recipe-level equivalence. These are explicit product states with a review path, not hidden zero values or a claim of research failure. A final delivered-cost choice requires the missing facts; this acceptance test does not manufacture them. Research budgets and a review-ready threshold never prove exhaustive market coverage or the globally cheapest supplier.

Source extraction remains model-assisted. The regression checks constrain known failure modes; the retained review step is still necessary. The real-provider sample certifies these exercised cases, not every possible product or website. Spanish-market acceptance is outside this run.

No push or remote deployment was performed. The changed workflow must not be published over active instances without first finishing or explicitly stopping them, as documented in [adaptive research](ADAPTIVE_RESEARCH.md).

## PR scope

The provider runs above were recorded before separating this PR from the UI and demo changes. Source-dialog presentation and saved example changes are excluded. Fresh validation of this exact research-only tree is recorded in ETAPAS.md. Historical counts describe the trees exercised on those dates.

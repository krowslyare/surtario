# Adaptive supplier research

Implemented locally on September 16, 2026. This extends the existing persistent sourcing case, using the existing Convex Workflow and Agent components. Quick supplier search remains available as a separate initial scan.

## Product behavior

Open **Open research case**, save an ingredient/location question, and choose **Investigate this question**. The case alternates planning, a targeted search or reading a saved product page, and interpretation. Each interpretation is persisted separately, so earlier findings survive a slow page, an interpretation failure, navigation or reload. An unreadable page is retained as failed evidence and does not by itself fail the case. No supplier contact or purchase occurs.

The planner receives the accumulated unique sources, interpreted fields, missing evidence and prior actions. It no longer sees only the last fifteen candidates. Refined queries are actually used once, without appending the same three generic searches every round. Canonical URL deduplication excludes previously seen pages **before** paid reads. Saved recovered text can be interpreted without fetching it again. Candidate and query text remain untrusted data and do not authorize tool use outside the bounded server actions.

The server rejects unauthorized page links, avoids repeated queries and refuses a one-source success conclusion. If the model proposes an early stop or a repeated action, the server selects an unexamined recovered page or a new query aimed at the current evidence gap. These fallbacks are generic query themes, not product/supplier/price fixtures. Broadening the query does not change the requested ingredient or location.

## Completion is explicit

- **Candidates ready for review:** the model proposes stopping with at least three independent domains holding package/price/currency fields and at least two rounds performed. This is a minimum review threshold, not proof of equivalence, local fulfillment or optimal price.
- **Further rounds added no new evidence:** two consecutive rounds introduced no new sources or completed interpretations. Coverage remains incomplete; this is an operational saturation signal, not proof that no other supplier exists.
- **Remaining conditions need confirmation:** after further investigation, the model identifies unresolved conditions and there is no recovered page awaiting interpretation. It can stop without fabricating those conditions.
- **Research budget reached:** six rounds completed. The result is explicitly incomplete and can be continued from saved evidence, subject to the existing demo limit of three research runs per case.
- **Interrupted:** an orchestration/provider failure ends the run, preserving its completed evidence. Cancel and stale-revision guards prevent late results from changing a canceled case.

Policy values are centralized in `src/domain/researchCoverage.ts`: six rounds, up to six interpretations per round, a five-source presentation shortlist, and a three-domain minimum for the review-ready guard. Provider search/read limits remain in `convex/lib/firecrawl.ts`. These are operational budgets that can be tuned; they are not market-coverage measurements. The quick-search limit of thirty raw entries is not a ceiling across a case's targeted research rounds.

## Presentation and limits

A compact shortlist prioritizes product evidence and field completeness with one source per domain. It is not a lowest-price or delivered-cost ranking. All saved evidence remains accessible in the existing review flow. Counts deduplicate tracking URLs and distinguish unique sources, completed interpretations and domains with published prices. Outstanding delivery/equivalence questions remain explicit. Multiple domains can belong to the same commercial company; the application does not claim entity-level supplier deduplication.

Unknown currency, stock, package contents, minimums, taxes and delivery still require review. A price is not an approved offer. No claim of exhaustive web coverage or globally best supplier is made. Spanish-market research and exact semantic equivalence are not newly certified by this work.

## Verification and release boundary

Automated checks cover refusal of premature completion, duplicate-query replacement, two-round saturation, later discoveries with a lower published price, explicit budget exhaustion, unreadable-page recovery, query refinement, no duplicate page reads, durable per-source persistence, ownership, cancellation and stale revisions. Compact workflow checkpoints keep full page bodies out of repeated workflow query history.

The local real-provider validation uses Firecrawl and Luna CLI. One early run was interrupted by a workflow code reload (journal mismatch); a second exposed a page-read error aborting the case. Both failures are retained in local evidence. The latter behavior was corrected and regression-tested. Do not deploy this changed workflow definition over active instances: let old instances finish or explicitly stop them before publishing. No remote deployment was made.

## Executed real-provider result

[Sanitized evidence](evidence/adaptive-research-2026-09-16.json) records the completed Gala apples / New York case: 19 unique sources, 16 interpreted, five domains with published product prices and a five-source shortlist. The final six-round continuation took 272 seconds. These totals accumulate evidence from the two interrupted development attempts described above; they are not a clean first-run benchmark. Later targeted searches added eleven sources, including a BJ’s 4 lb listing with a published $5.49 price. Bare-dollar currency and local fulfillment remain unconfirmed. Zero domains met the complete package/currency threshold; the result correctly stopped as **budget / coverage incomplete**, not review-ready. Extracted fields can be conservative: mixed count/shipping-weight lines may be left unconfirmed. No source was accepted as an offer.

A separate fresh invented-ingredient case completed two empty rounds, retained zero candidates and stopped as **diminishing_returns**. This is evidence for the negative path, not a universal no-false-positive guarantee.

253 tests across 42 files, TypeScript/build and three focused browser tests passed. A real-case browser check at 390 × 844 verified five shortlisted sources, the all-evidence review entry, the terminal stop reason, persistence after reload and no horizontal overflow. The real-source results validate adaptive discovery and truthful incomplete outcomes; they do not certify equivalent delivered offers or exhaustive market coverage.

## Subsequent acceptance closeout

The next validation corrected lost explicit count/currency evidence and cross-round selection persistence, then exercised an actual-source comparison through save/reload. See [research acceptance](RESEARCH_ACCEPTANCE.md) for the fresh flour run, the independent arithmetic and the live Gala regression; this supersedes the earlier zero-structured-source example as the latest exercised core acceptance.

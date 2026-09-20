# Hosted acceptance · September 20, 2026

This is a bounded, manual acceptance on **development**, not a production certification or a load test. Public app: https://incredible-wolverine-122.convex.site. Deployed baseline: merged PR #38, `e25a058`; GitHub Actions run `35536762688` succeeded. Local development remained on its separate anonymous backend.

## Configuration and spending boundary

The hosted deployment was missing its OpenAI key and feature gates. With the owner's authorization, the existing server credential and the extraction, research, advisor, reply-extraction, draft-suggestion and automatic-review gates were configured in `dev:incredible-wolverine-122`, then read back without exposing secrets.

Both model settings are **`gpt-5.6-luna`**, with low reasoning. These calls went to the OpenAI API, not the Codex CLI bridge. Firecrawl and AgentMail used their existing credentials. Source watching stayed disabled; no recurring research was started. There was no stress test, model escalation or provider retry loop added. Exact OpenAI dollar consumption was not measured and is not claimed here.

## Executed journey

| Step | Observed result | Boundary |
| --- | --- | --- |
| Fresh search | `long grain white rice`, `Portland, OR, US`: 21 candidates, 16 with recovered text, 5 without readable text, 3 automatic interpretations. | Thirty is a retention ceiling, not a promise of thirty qualified suppliers. Counts are sources, not independent vendors or confirmed delivery. |
| Live progress and reload | Counters and source previews updated through Convex. A quiet period displayed elapsed-checkpoint feedback; completion appeared. Reload during the run recovered that run without launching another search or replaying the landing entrance. | A single bounded run, not a latency guarantee. |
| Review and study | Saved CHEF'STORE USD 25.69 / 50 lb and Della Rice USD 8 / 28 oz, plus F. Garcia Food Export as a no-price candidate. Explicitly reopening the saved study restored all three. | The regenerative specification remained distinct. USD for CHEF'STORE was manually confirmed against its source; minimum, tax and delivery were not invented. No equivalence was asserted. |
| Advanced research | A separate case completed six rounds: 21 unique sources, 15 interpreted, prices on seven independent domains. It stopped at its configured budget. | 210.288 seconds between workflow start and completion in this run. Coverage remained incomplete; a priced domain is not a qualified equivalent offer. |
| Suggested inquiry | Luna proposed a question about the missing terms. The subject/body were reviewed and edited before one approved send. | Sent only to the configured test recipient, not to the named web distributor. |
| AgentMail round trip | The branded request arrived. One reply sent through the test inbox reached the signed hosted webhook. Messages changed from waiting to reply received without reloading Surtario. | Real mail transport; explicitly synthetic commercial terms. No real supplier negotiation or purchase. |
| Reply review | Luna extracted supplier, ingredient, specification, package and price with citations in one attempt. A human reviewed and saved the proposal, then entered the minimum, delivery fee and tax treatment from the same reply. | Receiving/opening a reply did not silently update an offer. Delivery timing remained unconfirmed. |
| Calculation | Required 60 lb; 25 lb packs at USD 20, minimum two packs, USD 6 delivery, tax included: 3 packs, 75 lb received, 15 lb excess, USD 66 total. | Selection was correctly blocked by unconfirmed delivery timing. Choosing an offer was not claimed in this new run. |
| Advisor | One direct API analysis completed and invoked both `evaluateScenarios` and `readEvidence`. It identified the delivery blocker and retained the test-data provenance. | Advice did not override deterministic totals or confirm terms. |
| Stale advice and recovery | Changing 60 to 61 lb marked the analysis stale. Reload retained the comparison route and edited quantity. Returning to 60 restored the matching analysis without another model call. | Saved studies are explicitly reopened; this does not claim every unrelated unsaved market draft is restored across routes. |
| Session isolation | A fresh capability listed zero studies, comparisons, cases, messages and research runs. Direct case and advisor access were denied. | Read-only checks against hosted functions, not a complete security audit or a two-person browser rehearsal. |

The advanced case retained explicit differences between standard, enriched, organic and premium products. Public source observations are dated; none imply fulfillment to Portland merely because the query named Portland.

## Acceptance-driven UI correction

The final advanced round contained only one source, and the collapsed all-round summary made the research appear much smaller than it was. The follow-up now opens its accumulated findings, distinguishes the current search from all research, and provides **Review this source** on prioritized findings. That action opens the matching search, expands the source list and moves focus to the exact source with the shared smooth/reduced-motion behavior. It neither fetches the page again nor calls OpenAI. The quick-search three-page explanation is no longer incorrectly shown for multiround research.

Local manual checks covered 1920 × 1080, 390 px and 320 px layouts, the source jump, focus and sticky-header clearance, with no horizontal overflow or captured runtime errors. The final hosting build passed, as did 320 domain/Convex tests in 49 files with simulated providers. This frontend refinement is separate from the already deployed PR #38 and requires its own PR integration/publication.

## Evidence and remaining scope

Redacted count/acceptance records and screenshots are retained under ignored `.local/hosted-acceptance/`; provider configuration checks are under ignored `.local/provider-checks/`. No credentials, session capabilities, inbox addresses, raw message exports or database rows belong in Git. The visible journey was driven manually; this report does not describe an automated replay of live services.

The earlier local text/image API acceptance and positive selection/partial-confirmation journeys remain dated evidence in [CREDENTIALS_AND_E2E](CREDENTIALS_AND_E2E.md) and [ETAPAS](ETAPAS.md). Image extraction and positive selection were not repeated in this hosted pass.

The core integrations are exercised. Remaining delivery work is the final narrated recording, authorized public-repository release, public post and contest submission. The [recording script](ENSAYO_DEMO.md) and [submission draft](../entrega/SUBMISSION.md) are prepared; neither is evidence that a video was exported or an entry submitted.

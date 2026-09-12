# Integrated study, reply and advisor validation

Evidence collected on September 10, 2026 against an isolated anonymous local Convex backend. This is application and rehearsal evidence, not a production deployment or direct OpenAI API acceptance. Stage status remains in [ETAPAS.md](ETAPAS.md).

## Connected behavior

- **One market study:** reviewed web offers and no-price distributor candidates join selected examples in one count and saved selection. The server reconstructs owned web evidence, checks a shared ingredient/location, bounds the selection and preserves revision conflicts and idempotent retries. Recovery restores prices, missing values, provenance and contacts without requiring quantity or recipes.
- **Research hierarchy:** extraction is the primary next step for a readable source. Optional product-link reading is disclosed, opening for catalog/contact classifications and failed or active reads. Adding a reviewed offer explains that it enters the study; preparing a purchase remains separate.
- **Reply review:** explicit AI suggestions use only an owned linked reply. Manual entry remains available during extraction; late suggestions preserve edits. Saving distinguishes a manually entered review from the exact AI attempt the user reviewed. Original proposal, evidence and corrections remain separate.
- **Advisor:** a single explicit action saves the current comparison and context before calculation and optional AI explanation. It requires positive quantity, reuses a matching saved scenario and rejects stale async results after edits or navigation. The executive verdict precedes detailed tables.

## Computer-use rehearsal

The in-app browser exercised search without quantity → source analysis → reviewed offer plus no-price candidate → save study → reload and reopen. Both options returned with the same count and provenance. Preparing a quotation required inspection of its recipient/body and explicit approval; the local bridge simulated delivery and two signed webhook events produced one linked reply.

Real `gpt-5.6-luna` CLI generation proposed PEN 47 for a 10 kg rice presentation from that synthetic reply. The operator separately confirmed example minimum, tax, freight and delivery conditions. For 20 kg, the deterministic comparison required two presentations and PEN 94. The advisor's actual `evaluateScenarios` and `readEvidence` tools supplied the saved calculation and sources; its explanation correctly requested another verifiable offer rather than inventing savings. Reloading recovered the same analysis without another model request.

Five model generations ran in this pass: two analyses of the same recorded real Firecrawl page, one synthetic web analysis, one synthetic reply extraction and one advisor explanation. Bridge generation times were 10.743–13.553 seconds. These are individual local observations, not service-level measurements. Firecrawl observations and source hashes are in [the final source pass](FIRECRAWL_SOURCE_ANALYSIS.md) and its sanitized manifest. No real email was sent in this pass.

Desktop computer use and 390px DOM measurements found no horizontal overflow. The in-app viewport override produced an unreliable stitched screenshot; the local Playwright mobile captures were inspected separately. The advisor's open context, negotiation draft and action remained readable at 390px. This is not physical-device coverage or a complete accessibility audit.

## Verification

173 unit/backend/configuration tests passed, together with frontend/backend typechecks and production hosting build/asset checks. All 54 browser journeys passed in one complete run against the updated local backend, including the scripted demo. A final advisor hint change was followed by all five advisor journeys and another hosting build.

Independent adversarial review corrected mixed-study context, missing-price filtering, manual review during extraction, exact extraction-attempt provenance, late edits, duplicate advisor preparation, invalid quantity and stale async responses. The final bounded recheck found no remaining material issue. The first browser run exposed ambiguous test locators, an old synthetic-source copy assertion and a test recipient left configured in the isolated rehearsal backend. Locators now identify the intended controls, the assertion reflects source provenance, and the unconfigured-mail tests run without that local recipient. No business assertion was removed and no provider retry was added.

## Recording boundary

Development hot reload caused a repeated-search throttle during interaction; reopening the saved research preserved its original result. The final recording must use a stable hosted build. The [170-second shot plan](ENSAYO_DEMO.md) is a proposed budget, not a timed rehearsal or an exported video. Direct OpenAI API configuration, the combined hosted provider journey and final release acceptance remain outstanding; this delivery does not change repository visibility or submit the project.

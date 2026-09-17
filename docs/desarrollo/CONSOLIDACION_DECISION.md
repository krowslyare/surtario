# Decision-cycle consolidation after PR #35

Base reviewed: `3483f8a55b8ff0ded6e9e54d09ed913d05a16876`. Work is isolated in `codex/case-decision-demo`; existing UI work was carried forward without overwriting the original worktrees. This document describes this iteration, not the cumulative counts of older deliveries.

## Implemented

- Shared server-authorized direct-comparison examples: USD/lb and explicit Peru PEN/kg. Manipulated identities still fail.
- Consistent eighteen-artifact case retention across adaptive research and watch observations. Confirmed comparisons remain independent of that bounded context.
- Ten quick searches per session, separate from adaptive rounds and watches, including legacy IDs. Existing safety limits and cooldown remain.
- Mobile summary shortcut follows actual viewport visibility and focuses the summary by keyboard; reduced motion and narrow reflow remain covered.
- Contextual freight and minimum-order questions, immutable action context, stale-action guards and exact draft-revision approval. Optional AI drafting cannot see competitors' private offers.
- Partial supplier-term confirmation with original evidence, before/after under the same preferences, unchanged-recommendation outcomes and reload recovery. No automatic selection or purchase.
- Facts-first source review, progressive raw evidence/history, case brief and prioritized existing case library. Prioritization is based on missing terms, interrupted work and retained evidence; it is not total-basket optimization or an estimated savings ranking.

## Local verification

Verified locally on September 17, 2026 (UTC):

- `npm test`: 288 tests in 44 files passed.
- `npm run check:hosting`: TypeScript/build plus 30-file hosting validation passed.
- `npx tsc --noEmit -p convex/tsconfig.json`: passed.
- `npm run test:e2e`: 84 of 85 journeys passed in the complete pass. The remaining source-review regression exposed a missing synthetic-provenance label; after restoring it, that journey passed on a focused rerun. All 85 journeys are covered across that pass and correction, not claimed as a second fully green suite run.
- `npm run test:demo`: its one browser journey passed separately.
- The manual rehearsal reproduced a case-entry continuity bug: a recovered comparison was treated as an unsaved draft. Explicit unchanged snapshots now retain saved status; reviewed merges remain dirty. Four affected case/minimum/reply browser journeys passed after this correction, along with fresh hosting/build and backend type checks.
- The end-to-end result audit also caught default preferences replacing the saved action context after reopening. Reply confirmation now displays and enforces the question's saved preferences; changing current form preferences cannot silently change that report.
- Adversarial checks also found and fixed contextual-draft retry rejection caused by serialized object-key order, stale AI-draft generation, and inappropriate exposure of competing offers to the optional inquiry writer.

The isolated anonymous Convex backend uses loopback ports 3280/3281. Automated tests run before configuring the local provider bridge. Tests use synthetic records, mocked failures and controlled clocks; they do not certify provider acceptance.

The manual bridge rehearsal uses Luna CLI (`gpt-5.6-luna`) with synthetic web/mail transport. Real Firecrawl evidence from the earlier flour rehearsal remains documented in `REAL_RESEARCH_QUALITY.md`; it was not relabeled as a fresh run. No new paid Firecrawl call, real email or cloud deployment is required for these changes.

Watch tests cover registration, unchanged observations, change, unreadable/error outcomes, execution-lease timeout, expiry, cancellation and rejection of late/duplicate outcomes. Observations create evidence for review and preserve confirmed terms. Seven days of real observation are not claimed.

The manual preparation completed in **118.924 seconds**: two adaptive runs stopped with explicit incomplete coverage, a subsequent quick search succeeded, two product pages were reviewed, and the same-case comparison drove advisor tools, optional inquiry drafting and partial reply interpretation. The bridge recorded twelve real Luna CLI calls, eight simulated searches, two simulated reads, one simulated send and linked duplicate signed inbound events. Duplicate input did not create a second reply. These are local fixture results, not supplier acceptance.

The verified main walkthrough took **114.971 seconds**. A separately timed closing segment saved and explicitly restored the updated cash-priority scenario in **13.640 seconds**. Combined screen time is **128.611 seconds (2:09 rounded)**, with an explicit edit between segments of the same case. These are automated browser rehearsals with reading holds, not a narrated/exported video. The final result check confirmed the saved USD 50 budget, USD 45/39 totals, original evidence, one reply/confirmation for the current request, and recovered selection. The final scene shows the current saved scenario rather than stale AI advice.

The retake used one additional distinct, approved synthetic request after explicitly returning the fixture to freight-pending through a revisioned save. Prior history was preserved; there were no extra model or web calls. The final bridge totals are twelve Luna calls, eight simulated searches, two simulated reads, two distinct simulated sends and four signed inbound deliveries yielding one reply per request.

## Exact local rehearsal

1. On the dedicated anonymous backend, run `node scripts/rehearsal/configure.mjs`. It verifies the local target, writes dummy provider keys, and disables live Firecrawl forwarding.
2. Start `node scripts/rehearsal/server.mjs`; enable local `SOURCING_ENABLED`, `SOURCE_WATCH_ENABLED` and `QUOTATION_DRAFT_ENABLED` only for this manual rehearsal. These switches do not belong in automated test setup.
3. Create a Rice / Portland case, start adaptive research and continue it. A quick search afterward must still work. Review the synthetic 25 lb / USD 20 and 50 lb / USD 35 sources in that case. For the synthetic purchasing scenario, explicitly confirm 40 lb required, one-pack minimum, included tax and delivery availability; A freight USD 5, B freight pending. These terms are operator-supplied fixture assumptions, not extracted facts.
4. Save the comparison in the same case. Set cash priority and USD 50 budget. The advisor uses calculation/evidence tools through the local bridge; direct OpenAI API is not involved.
5. Prepare the delivery question for B. Its calculated freight boundary is USD 10 against A's USD 45 total. Review the draft and test recipient; an edited draft needs fresh approval.
6. For the explicitly simulated reply fixture, set the subject to `[rehearsal:delivery] Rice freight confirmation`, preserve the question body, approve that revision and send through the local bridge. No provider is contacted. The signed synthetic reply states USD 4 freight only.
7. Review the linked reply, confirm USD 4 using its literal excerpt, and inspect before/after: A USD 45; B USD 39 and now recommended under these preferences. Choose only after review, save, reload and recover the same comparison and case.
8. Save the updated deterministic scenario using the question's cash priority and USD 50 budget. After reload, explicitly restore that saved scenario; confirm it is current before ending the recording. No fresh AI explanation is necessary for the deterministic verdict.
9. For the second action, use the bounded minimum regression: 40 lb required, A 25 lb packs at USD 20 with USD 5 freight, minimum five packs and USD 50 budget. Propose two packs. Confirm a synthetic reply accepting two: A becomes USD 45 and viable; B USD 35 remains recommended. A reply retaining five does not improve viability.

## Final API and release acceptance — prepared, not executed

When the user configures the final server-side OpenAI key, verify on the intended target: source/document extraction with literal evidence; advisor `evaluateScenarios` and `readEvidence`; contextual inquiry drafting without competitor disclosure; partial reply interpretation; invalid schema/model failure and manual recovery. Repeat the complete saved-case journey with direct API responses, including reload and unchanged-decision outcomes.

A separately authorized hosted pass must check frontend assets/SPA, session boundaries, approved test mailbox and signed reply linkage. Luna CLI, deterministic mock tools and synthetic transport do not replace that pass. No merge, visibility change, automatic publication, real supplier communication or contest submission is authorized by this local rehearsal.

Product brief: Surtario connects adaptive research and reviewed evidence to constrained buying decisions, contextual questions and supplier-response follow-through. A response can improve or confirm a decision. It does not demonstrate autonomous negotiation, exhaustive best-market pricing or zero hallucinations.

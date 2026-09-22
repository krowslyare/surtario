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

Local manual checks covered 1920 × 1080, 390 px and 320 px layouts, the source jump, focus and sticky-header clearance, with no horizontal overflow or captured runtime errors. The final hosting build passed, as did 320 domain/Convex tests in 49 files with simulated providers. This frontend refinement was subsequently merged and published in PR #39; the September 21 follow-up below is a separate, unpublished change.

## Evidence and remaining scope

Redacted count/acceptance records and screenshots are retained under ignored `.local/hosted-acceptance/`; provider configuration checks are under ignored `.local/provider-checks/`. No credentials, session capabilities, inbox addresses, raw message exports or database rows belong in Git. The visible journey was driven manually; this report does not describe an automated replay of live services.

The earlier local text/image API acceptance and positive selection/partial-confirmation journeys remain dated evidence in `hackathon.md` and Git history. Image extraction and positive selection were not repeated in this hosted pass.

The core integrations are exercised. Remaining delivery work is the final narrated recording, authorized public-repository release, public post and contest submission. Recording and submission drafts are preserved in ignored local notes; neither is evidence that a video was exported or an entry submitted. See [delivery status](STATUS.md).

## September 21: recording UX follow-up (local)

The branch `codex/live-recording-fixes` adds sequential bulk analysis, explicit quick review, visible saved states and compact six-offer comparison. Unit/backend regression checks cover invalid bulk fields, six-offer save/reopen/remove/restore, immutable source wording, search-market currency audit, and the twelve-option study boundary. Browser verification uses an isolated anonymous local deployment with synthetic providers; the live rehearsal session is left intact. No paid provider calls or emails are required for these checks.

Verification passed 325 domain/backend tests in 49 files, frontend/backend TypeScript, the production build and the 35-file hosting check. All 136 browser cases were verified across the full run and targeted reruns: the first run exposed 16 outdated selectors/fixtures or expectations, which were corrected and rechecked without increasing timeouts or removing behavioral checks. The added bulk-unmount check also passed. Desktop/mobile computer-use inspection covered compact comparison and shared terms; six offers reflowed at 1920, 390 and 320 px. An initial concurrent unit run timed out in two tests; a two-worker rerun passed all 325.

PR #39 is already deployed: [Verify run 35572549527](https://github.com/krowslyare/restaurant-procurement/actions/runs/35572549527) passed 320 tests and verified 35 hosted files. This local follow-up has not been merged or deployed.

### PR #40 review corrections

Both Codex findings on `21ac376` were confirmed. Frontend save eligibility now uses the confirmed comparison identity for web reviews while retaining original source text; later incompatible edits remain unsaveable. Study filters now constrain comparison membership, slot counts and confirmation to visible offers.

Three focused local browser tests passed: differently worded offers save/reload/re-save with original evidence intact, eight-offer filtering frees hidden slots and excludes hidden offers, and the existing reviewed-offer recovery/selection flow remains intact. Responsive checks covered 1920 and 390 px. TypeScript/build and the 35-file hosting check passed. These are local checks with synthetic data, not new external-provider acceptance; merge and publication are tracked by PR #40 and its main workflow.

## September 21: sourcing overview and study refresh (isolated local acceptance)

The separate `codex/sourcing-overview` branch adds a reactive work overview and an explicit market-study refresh. The current hosted baseline is now PR #40 (`92d322d`): [Verify run 35596365804](https://github.com/krowslyare/restaurant-procurement/actions/runs/35596365804) deployed development and verified 35 published files. The overview acceptance below is local and does not claim publication of this branch.

### Real providers, real public evidence

A fresh, separate anonymous Convex backend on localhost:3260 and frontend on localhost:5493 used the existing server-side Firecrawl/OpenAI settings with the rehearsal bridge absent. Recurring watches stayed disabled. Automated tests ran against a different local backend, so synthetic fixtures could not populate the acceptance workspace.

- Started `long grain white rice` in `Portland, OR, US` from Overview. One actual Firecrawl discovery completed with 23 retained candidate sources, 17 readable sources and three direct OpenAI interpretations. Progress and later review priority appeared reactively. These are source counts, not verified suppliers or delivery coverage.
- Reviewed the captured CHEF'STORE product evidence and saved USD 25.69 per 50 lb. The page uses a dollar symbol; USD was explicitly confirmed for this US market. Minimum, delivery and tax remained pending. Marking the search reviewed cleared its reminder; reload preserved that acknowledgement.
- Used **Update market research** on the saved study. One additional real discovery and three interpretations completed: 23 sources, 17 readable, zero new URLs relative to the first search. Reload did not start a third run. Both persisted runs have `simulated: false`.
- The repeated extraction omitted currency while preserving price, package and specification. This exposed a false difference signal during acceptance. The final comparison ignores omitted fields as evidence of changed terms; the overview correctly showed zero sources with different explicit interpreted values. A regression check separately verifies that a changed numeric price does trigger review. No actual supplier price change is claimed.
- Reopening refreshed findings preserved the saved study at revision 1. Created a linked follow-up, then saved a one-offer comparison for a test requirement of 50 lb. Overview showed one related work item, not separate copies of the case, study, searches and comparison. Selection and order total remained pending because delivery, minimum and tax were not confirmed.
- No mail was sent or received in this new real-provider pass. The email transport acceptance remains the dated September 20 evidence above; current overview reply/confirmation/outcome behavior was exercised with clearly synthetic replies against real local Convex subscriptions. No supplier was contacted and no purchase was placed.

Redacted counts and browser screenshots are in ignored `.local/overview-acceptance/`. Source captures, session capabilities, credentials and raw database records are excluded from Git. The original checkout and hosted provider configuration were preserved.

### Regression and review boundaries

Convex review covered capability ownership, bounded indexed reads, concurrent refresh deduplication, unchanged study/comparison revisions, versioned research acknowledgements and frozen historical outcomes. The initial navigation changes exposed stale browser-test destinations; these were updated to the new overview without increasing timeouts or dropping the original save/reload/permission checks. A document-dialog timeout in the broad run passed on a focused rerun without a document implementation change.

Desktop (1920 × 1080), 390 px and 320 px checks covered layout without horizontal overflow, keyboard activation and reduced motion. The real-provider workspace was inspected manually; synthetic browser fixtures separately covered reactive reply arrival, exact conversation routing, confirmation, historical outcomes, resolved reminders after reload and another session seeing no work. A fresh overview subscribes to summaries; detailed market views mount on first use and then retain their drafts.

Final local verification: **334 domain/backend tests in 51 files passed**, frontend/backend TypeScript passed, and the production/hosting build verified 35 files. **All 141 browser cases were verified across the full run and focused reruns**: the broad run passed 129/140; corrected destinations and follow-up checks were re-exercised, one new study-refresh navigation case was added, and the last 24-case projection/navigation/messages/overview pass was green. The summary-only subscription check confirms a fresh Overview does not request research bodies, study/comparison payloads, mail text or document transcripts. No timeout increase or automatic retry was added.


## September 21: overview presentation and navigation

PR #41 was merged as `f053dc6`. [Main Verify run 35643296196](https://github.com/krowslyare/restaurant-procurement/actions/runs/35643296196) passed tests, published the development backend/frontend and verified 35 files, SPA fallback and missing assets. A read-only browser check opened the hosted Overview with existing saved work and no console errors. The following presentation changes belong to a new PR and are not deployed.

Manual inspection used the existing real-source acceptance workspace on localhost:5493, backed by its isolated Convex database on port 3260. The saved rice evidence, research question and pending comparison remained visible. Checks covered separated sections, explicit empty decision history, research detail → global Explore/Messages → browser Back, and reflow at 1920 × 1080, 390 and 320 px. All four global destinations remain visible on phones. No new search, interpretation, email or commercial confirmation was started; the real provider acceptance remains the dated evidence above.

The first browser run lacked the isolated backend's local CLI selector configuration; correcting that local setup resolved the harness failures. The configured run then exposed a route race when Back arrived during lazy mounting after reload, which was fixed and verified, and an old test expectation that incorrectly retained `from=overview` after global navigation. Assertions now check the same saved case with the correct origin. The added mobile navigation assertion was corrected to include the Messages reply-count label. No retry or timeout increase was added.

Final local checks passed **334 domain/backend tests in 51 files**, **38/38 focused browser tests in one final run**, frontend TypeScript and the production/hosting build (35 files). The browser run covers landing entry, market/save/reload, contextual research, mobile/global navigation, messages, comparison recovery, live local Convex subscriptions and explicit empty/outcome states. Existing nonfatal bundle-size and test-provider warnings remain. An adversarial frontend review checked route origins, event callback arguments, legacy links, preserved drafts and pending/empty states; backend/provider contracts are unchanged.


## September 21: ingredient-list import and independent research (local, separate PR)

The new branch was tested against two isolated anonymous Convex backends: a disposable automated-test dataset on port 3270, and a preserved real-provider dataset on port 3280. Neither changed the hosted deployment. The previously merged PR #42 is separately confirmed published by [Verify run 35653681215](https://github.com/krowslyare/restaurant-procurement/actions/runs/35653681215).

### Real external acceptance

A synthetic kitchen list was uploaded explicitly as PNG and then PDF through the actual browser/HTTP/OpenAI path. Both readings returned Long-grain white rice, All-purpose flour, Vegetable oil and Red onions. Original lines retained 40 lb, 25 lb, 1 jug and 10 lb as source notes; these did not become purchase requirements. The user-facing review and list save preserved original text, correction and file fingerprint. The PDF preview initially failed with the browser's native viewer; replacing it with local PDF.js canvas rendering resolved desktop and narrow-screen inspection. That final visual preview was checked by manual transcription without purchasing another AI reading.

A four-ingredient batch in Portland, Oregon used real Firecrawl and direct OpenAI calls. The UI showed two researching and two queued. Persisted start/completion events independently confirmed a maximum of two active cases over the entire batch and zero remaining at completion. Reload recovered the same batch and cases. Rice findings were opened while flour was still interpreting and the other ingredients remained queued; returning to Overview retained the ongoing work. Final backend read-back confirmed one inactive batch, four settled rows and exactly one research run per case:

| Ingredient | Distinct source URLs within the case | Interpreted URLs | Terminal result |
| --- | ---: | ---: | --- |
| Long-grain white rice | 17 | 12 | Six-round limit reached |
| All-purpose flour | 15 | 10 | Six-round limit reached |
| Vegetable oil | 15 | 12 | Six-round limit reached |
| Red onions | 25 | 12 | Six-round limit reached |

The sum is 72 per-ingredient source URLs and 46 interpretations, not 72 globally unique suppliers or verified offers. All four need human evidence review. The batch took about nine minutes; proposed video timings are editorial, not measured completion promises. The backend contained two completed list readings, zero stored file objects and zero quotation requests. No supplier message, offer selection, purchase, source watch or private customer document was involved. Ignored `.local/ingredient-acceptance/report.json` retains the redacted read-back; raw provider data and credentials are not committed.

### Automated and visual checks

340 domain/backend tests in 53 files pass with simulated providers, including durable two-lane concurrency, a stopped action retaining its slot, provider failure isolation, individual retry and duplicate retry, atomic capacity rejection, request replay, session ownership, ambiguous review, file signature/type/size rejection, sanitized provider errors reading expiry and compact deduplicated source counters for long URLs. Frontend and backend TypeScript pass. The hosting build resolves 37 files; PDF code and its worker are bundled separately. Existing bundle-size and test-provider warnings are nonfatal.

The full browser run passed 143 of 144 tests; its single failure was a stale “Open follow-up” locator left by the previous naming change. It was corrected to the visible “Open research question” label without changing the keyboard assertion; the final focused run passed all 13 funnel, ingredient-list and Overview tests. The browser suite verifies original quote/document flows, CSV/XLSX/text/manual image input, a resumed AI proposal, required ambiguity review, saved original/corrected provenance, navigation selection continuity and actual local PDF rendering. Browser fixtures simulate proposed rows; they do not establish model acceptance. Manual UI inspection covered 1920 × 1080, 390 px and 320 px, independent batch rows, explicit empty filters, source destinations and the original-document review. The real provider journey described above is separate evidence.

Adversarial review checked owned record access, input bounds, unchanged-replay recovery, asynchronous start versus workflow completion, stop/retry races, stale result rejection, coordinator recovery and the distinction between source quantities and purchase needs. Anonymous capabilities remain the existing demo security boundary; authenticated restaurant accounts/private-pilot enablement are outside this PR. This change is not merged or deployed by these checks.


### PR #43 review corrections, September 21

The three Codex comments on `c40bbf2` were checked against the implementation. Two idempotency issues were confirmed: a newly reviewed identical replacement could reuse the old request ID, and replay validation omitted title/source kind. Replacement now resets request identity; an unconfirmed retry retains it. The backend rejects changed persisted metadata while accepting equivalent whitespace-normalized title/area.

The third comment identified duplicate presentation, not double-counted totals. Batch cases now appear only in their grouped rows. Those rows reuse the shared Overview action and exact destination for pending evidence, failed research, supplier replies and comparisons, so removing duplicate attention cards does not hide later purchase-cycle actions. Manual desktop/320 px inspection used the existing real acceptance dataset without starting provider calls.

Targeted backend tests cover metadata replay and unchanged retries. New browser regressions simulate failed/successful launch acknowledgements without forwarding research, verify distinct request IDs after identical replacement, and use the isolated disposable local dataset to check one grouped case presentation plus exact evidence/comparison/reply navigation. Initial test-harness failures were corrected to emit Convex's committed query transition and provide an actually incomplete comparison fixture; product assertions were retained. No cloud configuration, real-provider request, message or deployment was performed for these corrections.

Final focused verification passed **3/3 backend tests**, **15/15 browser tests**, frontend/backend TypeScript and the 37-file hosting build. The retained real-provider acceptance from the previous section was not rerun.


## September 21: PR #43 publication and list-continuity follow-up

PR #43 was merged as `b393f10`. [Verify run 35663996163](https://github.com/krowslyare/restaurant-procurement/actions/runs/35663996163) passed 340 domain/backend tests, published the development backend/frontend and verified all 37 files, SPA fallback and missing-asset behavior. A browser check opened the hosted Overview and ingredient-list dialog without console errors. This did not repeat paid photo/PDF reading or batch research on hosting. Five additional local browser tests passed for study/comparison recovery, inquiries and synthetic reply linkage before merge.

The separate continuity follow-up keeps unlaunched rows selectable after the current research finishes, visibly marks launched rows and excludes them from subsequent selections. The active-research restriction remains unchanged. An uncertain HTTP reading keeps the same request identity when the user chooses recovery; a confirmed failure or completed empty result permits an explicit new reading. A late HTTP failure cannot replace an already applied server result. Cases with sources now lead with “Findings available”; the six-round stop and incomplete coverage remain visible, while empty, failed and stopped states retain their distinct labels.

The final focused local run passed **19/19 browser tests** covering ingredient continuity, extraction recovery, prior list behavior, Overview and the purchasing funnel. New simulated transport cases verify four ingredients → launch one → navigate away/back → finish → launch the remaining three without duplicating the first; response loss → same-ID recovery; and confirmed failed/empty readings → explicit new identity. Existing local-backend evidence/comparison/reply routing also asserts the budget-stop message and findings label. No research mutation or upload in these transport simulations reaches a provider. TypeScript and the 37-file hosting build passed; the existing bundle-size warning remains nonfatal.

UI inspection covered the pending-row layout at 1920, 390 and 320 px without horizontal overflow. The preserved real-provider workspace was also inspected manually on desktop/mobile for the updated findings hierarchy. Its source counts did not change. No new external provider calls, messages, purchases or deployment were performed for this follow-up. Pending-row markers apply to the currently reviewed list; replacing or reopening a list is a separate intake operation, and saved research continues to persist in Overview.

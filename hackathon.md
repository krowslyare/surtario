# Hackathon log

- **Project:** Surtario
- **Event:** Convex All Gas Hackathon
- **What it does:** Helps kitchens find suppliers, preserve source evidence, request missing terms and compare complete orders before choosing an offer.
- **Live app:** https://incredible-wolverine-122.convex.site
- **Repo:** private
- **Frontend:** Convex static hosting
- **Convex deployment:** https://incredible-wolverine-122.convex.cloud
- **Components:** @convex-dev/agent, @convex-dev/static-hosting, @convex-dev/workflow
- **Convex features:** schema, indexes, queries, mutations, actions, HTTP actions, scheduled mutations, crons, realtime queries
- **Auth:** Other (isolated anonymous capabilities; no restaurant accounts)
- **AI models:** gpt-5.6-luna (low reasoning; direct OpenAI API acceptance, with earlier local Codex CLI rehearsal recorded separately)
- **Started:** 2026-09-07T18:47:16Z
- **Last updated:** 2026-09-21T22:26:56Z

## Current delivery

The development app has exercised real Firecrawl discovery, direct OpenAI extraction/advice and an AgentMail test-inbox round trip with reactive Convex updates. People review evidence and commercial terms; neither a reply nor a selected offer places a purchase. [Executed acceptance and limits](docs/VERIFICATION.md).

The deployed baseline is PR #42 (`32f080e`), including the overview presentation/navigation follow-up; [Verify run 35653681215](https://github.com/krowslyare/restaurant-procurement/actions/runs/35653681215) completed development publication and hosted-file verification. Ingredient-list reading and batch research are implemented on a separate, unpublished PR branch with local real-provider acceptance. Final video, public repository release, social post and contest submission remain pending. [Delivery status](docs/STATUS.md).

## Log

Entries below consolidate related build milestones. Commits identify the corresponding implementation or integration; checks are attributed to their actual local, simulated or hosted environment. The [complete pre-consolidation log](https://github.com/krowslyare/restaurant-procurement/blob/cf8e3012599a51426db83b115f447e485c8f7987/hackathon.md) remains in Git history, including individual review corrections and failed attempts.

### 2026-09-07 - b8a2071 · Scope and setup

Defined ingredient-first research, optional purchase comparison, deterministic arithmetic and explicit unknown terms. Recipes and restaurant-private data were outside the initial delivery. Prepared design rules and an evidence-based build log; connected a private remote. This was planning and local setup, not a running or deployed application.

### 2026-09-09 - 846a01d · First comparison and saved studies

Integrated the initial React/Vite workspace, synthetic market exploration, no-price distributors, editable purchase needs and whole-pack calculations developed September 7–8. Added Convex schema/indexes and owner-scoped study queries/mutations, revision checks and idempotent saves. Local browser checks covered reload, multiple tabs and separate sessions; fixtures were not real supplier offers.

### 2026-09-09 - b785ca5 · Research, extraction and reviewed comparisons

Integrated PRs #2–#5: source evidence, editable AI proposals, saved comparison conditions and Firecrawl/OpenAI action adapters. Convex reconstructs the original source and reviewed values from owned records. Local tests used simulated providers and checked missing credentials, ownership, concurrent edits and preserved provenance; direct API acceptance was still pending.

### 2026-09-09 - 17bcc24 · Guarded mail, documents and CI

Integrated PRs #6–#9: approved quotation drafts, server-restricted test recipients, signed/correlated reply handling and bundled synthetic PNG/PDF review. Stored document reviews retain their source and corrections. GitHub Actions runs tests and builds without deploying PRs. Local checks exercised idempotency, uncertain delivery and reply boundaries; no real model or mail call was established by those tests.

### 2026-09-09 - a7aebce · Research without an order and reply follow-through

Integrated PRs #10–#13: request missing terms from a saved study, preserve web distributors without prices, review a linked reply into an offer and compare it alongside existing alternatives. No quantity, recipe or purchase intent is required to start. Incoming mail remains untrusted evidence; explicit review/save is required before changing a comparison.

### 2026-09-09 - df25ef5 · Advisor, recovery and ingredient lists

Integrated PRs #14–#16: Agent-based advice uses deterministic calculation/evidence tools; operator mail recovery reconciles verified provider receipts without resending. Reviewed ingredient lists preserve selected names/provenance while file bytes remain local. Ownership, stale revisions, ambiguous correspondence and recovery were tested locally with synthetic inputs.

### 2026-09-09 - 18a3d5f · First real provider checks and development hosting

Published the first development frontend through the registered Static Hosting component. Real Firecrawl returned three public sources. One approved synthetic AgentMail request and reply passed through owned test inboxes and the signed webhook; replay did not duplicate the reply. Manual review/save/reload preserved PEN 4.80/kg and PEN 96 for 20 kg.

Served assets, SPA fallback, missing-asset 404 and unsigned-webhook rejection passed. OpenAI extraction/advice remained unavailable; this was partial integration acceptance, not the complete hosted journey. Repository visibility and production were unchanged.

### 2026-09-09 - d95fe30 · Local Luna rehearsal

Reorganized the sourcing workspace and added an isolated Codex CLI bridge. Six real Luna CLI calls exercised structured extraction and advice while web/mail transports were simulated. The rehearsal exposed missing Agent context and stale evidence overriding confirmed terms; both were corrected. PNG/PDF review, saved studies and reply-to-comparison were traversed in Chrome.

138 domain/backend tests and 51 browser journeys passed. A PDF renderer failure was resolved through local font configuration and an explicit retry. This was local CLI rehearsal, not direct OpenAI API acceptance or externally delivered mail.

### 2026-09-10 - 4991570 · Source quality and integrated publication

Integrated PRs #21–#26: improved Firecrawl product/catalog discrimination, bounded page reading, retained distributor candidates and linked-reply extraction. Cross-page metadata no longer supplies another product's evidence; reactive reply suggestions preserve manual edits. Local verification reached 175 domain/backend tests, with focused browser checks and earlier full-suite coverage.

Published reviewed main to development and verified all eight served files against build hashes, SPA routing and webhook rejection. A hosted synthetic study with a priced offer and no-price distributor survived reload. Direct OpenAI and the combined live journey remained pending.

### 2026-09-13 - 40af5ac · Surtario identity and decision flow

Integrated English-first US workflows with explicit USD/lb context, conversion only between supported physical units, a separate preserved Peru fixture, and finding-to-decision follow-through. Added the product landing and sourcing walkthrough. The Surtario identity and shared controls replaced earlier visual experiments; prices, saved findings and completed purchases remained separate facts.

### 2026-09-14 - 5ca161e · Persistent sourcing follow-ups

Added owned sourcing cases and durable Workflow research with saved questions, rounds, source evidence and activity. Optional selected-source watches produce review proposals rather than silently changing prices. Local tests covered bounded work, cancellation, ownership and state recovery. Implementation of monitoring did not prove a seven-day live watch.

### 2026-09-15 - 07ca592 · Reply-confirmed delivery and cloud acceptance

A linked reply can confirm a specific freight term through an ownership/revision-checked mutation, retaining the excerpt and before/after deterministic reports. Hosted acceptance used real Firecrawl plus two approved AgentMail test requests and three signed replies. A manually reviewed 40 lb order changed from unknown freight to USD 40 total and recovered its selection after reload.

OpenAI was still unavailable. The acceptance exposed lost candidate/comparison continuity and excessive email text; focused UI fixes and seven browser journeys addressed them. The integrated branch passed 233 domain/backend tests and added guarded main-only development publication; no private pilot or production release was claimed.

### 2026-09-16 - c417f56 · Branded workspace arrival

Added the restrained Surtario entrance and brand-consistent controls with keyboard and reduced-motion behavior. The brand guide stayed development-only. Later reload testing refined when this entrance should run; it was not intended to replace normal loading on every navigation.

### 2026-09-19 - 71c3fd2 · Adaptive evidence and saved-case decisions

Integrated broader Firecrawl discovery and adaptive research from PR #35, followed by PR #36's saved comparison, missing-condition and decision continuity. Source budgets, independent price domains and explicit coverage gaps guide bounded research; they do not prove exhaustive coverage or local delivery. Review corrections addressed evidence provenance, stale state and follow-up navigation.

### 2026-09-19 - 637e9ca · Direct API and complete local integration

Direct Luna low acceptance through local Convex actions exercised clear/ambiguous text, a synthetic image and a real Firecrawl product page. Four initial calls recorded 6,896 input and 1,228 output tokens; those counts are not the total cost of later testing. An AgentMail inbox-read 403 was diagnosed separately from send/receive capability, and a local receiver subsequently completed an approved real test-mail round trip.

Integrated live search checkpoints, reviewed reply recovery, branded email and broader discovery. Quick search retains up to 30 sources and initially interprets up to three; advanced research allows six rounds with six interpretations per round. Actual useful coverage varies. Commercial test terms remained synthetic; no real supplier was contacted or purchase recorded.

### 2026-09-20 - e25a058 · Coherent navigation, messages and recovery

PR #38 separated persistent follow-ups from the main results, added a discoverable Messages inbox, grouped source review and animated disclosures, and improved search history, loading/completion and mobile layouts. F5 recovers workspace context without replaying the landing arrival or restarting provider work. Comparison recovery preserves raw inputs, preferences and the original selection.

Both Codex recovery findings were reproduced and corrected. Verification passed 320 domain/backend tests in 49 files, focused browser journeys, TypeScript/build and 35-file hosting checks, with desktop/mobile inspection. PR #38 merged and its development publication succeeded; frontend tests themselves did not establish live-provider acceptance.

### 2026-09-20 - cf8e301 · Hosted direct-API acceptance

Configured the authorized development deployment for Luna low and completed a fresh Firecrawl search: 21 candidates, 16 readable and three initial interpretations. Saved/reopened two distinct reviewed offers plus a no-price candidate. A separate six-round workflow retained 21 unique sources, interpreted 15 and found prices on seven independent domains in 210.288 seconds; its budget stop and specification differences stayed explicit.

One approved AgentMail inquiry and actual test-inbox reply reached the signed webhook and updated Messages without reload. One AI reply extraction was reviewed/saved. Synthetic terms for 60 lb produced three 25 lb packs, 15 lb excess and USD 66 including delivery; unconfirmed timing correctly blocked selection. One advisor call used both `evaluateScenarios` and `readEvidence`; changing quantity made it stale, and restoring inputs recovered the matching analysis without another call.

Read-only fresh-session checks denied access to owned records. Source watches stayed disabled and exact dollar spend was not measured. The acceptance exposed hidden accumulated findings: the frontend now opens the all-round summary and jumps to each finding's original review. Local 1920/390/320 px checks, all 320 tests and hosting validation passed; this PR #39 refinement is separate from the deployed baseline. [Detailed evidence](docs/VERIFICATION.md).

### 2026-09-21 - f37df58 · Repository handoff

Consolidated public documentation into five guides and a shorter README with a workflow diagram. Recording drafts, older plans and audit output were preserved locally before removal from the tracked tree; installed agent tools remain local and ignored. The full earlier log remains available in Git history. Updated contributor/setup links and corrected the outdated research-limit example without changing runtime behavior.

Verification passed 320 tests in 49 files and the 35-file hosting build from a snapshot containing only tracked files, with a fresh offline dependency installation. Local documentation links/code references and all 60 archive hashes checked clean. An initial shared-dependency snapshot failed two workflow tests; isolated installation resolved the test harness issue without changing code or assertions. Repository visibility, deployment, provider configuration and contest submission are unchanged; no new provider calls were made.

### 2026-09-21 - working tree · Recording flow and comparison review

Added visible extraction/saved states, sequential source analysis and an explicit quick-review queue. Studies hold twelve options and comparisons up to six offers. US search defaults missing currency to USD without rewriting source evidence. Compact comparison cards expose removal and shared terms; unknown costs still save as pending and block final selection. Confirmed equivalence can reconcile source wording while preserving originals.

Pre-PR review corrected saved-review recovery, currency audit parity, invalid bulk fields and re-saving normalized comparisons. Local checks use simulated providers and an isolated anonymous Convex deployment; no paid API calls, outbound emails, recurring watches, repository-visibility changes or contest submission were performed. The existing live rehearsal session remains available. This change is not merged or deployed.

Verification passed 325 domain/backend tests in 49 files, frontend/backend TypeScript, the production build and the 35-file hosting check. All 136 browser cases were verified across the full run and targeted reruns: the first run exposed 16 outdated selectors/fixtures or expectations, which were corrected and rechecked without increasing timeouts or removing behavioral checks. The added bulk-unmount check also passed. Desktop/mobile computer-use inspection covered compact comparison and shared terms; six offers reflowed at 1920, 390 and 320 px. An initial concurrent unit run timed out in two tests; a two-worker rerun passed all 325.

### 2026-09-21 - working tree · PR #40 review corrections

Validated and corrected both Codex review findings: normalized equivalent web offers can be saved and reopened, and filtered study comparisons only use visible offers. Source wording is preserved; incompatible manual identity edits still block saving. Three focused browser tests passed against isolated local Convex, including F5, re-save, filtered selection and existing selected-offer recovery. TypeScript/build and all 35 hosting files passed checks. No provider calls or mail were repeated. Integration and development publication remain separate outcomes tracked on PR #40.

### 2026-09-21 - Sourcing overview and manual market refresh

Added a session-scoped overview for pending replies, research, saved work and historical decision outcomes. Actual case/study/comparison links determine grouping; independent work stays separate. Review acknowledgements persist against an evidence version, and confirmed reply outcomes retain their original monetary context. Opening the overview uses summaries and does not launch research.

A manual study update uses the configured Firecrawl/OpenAI path, reuses the existing quota and deduplicates concurrent updates while preserving reviewed offers. An isolated local acceptance completed an initial discovery and one refresh, each retaining 23 sources with 17 readable pages and three direct model interpretations. The saved USD 25.69 / 50 lb CHEF'STORE evidence remained unchanged; absent commercial terms stayed pending. There were no new URLs or explicit changed price/package details in this repeated observation. A missing extracted currency was corrected as an unresolved value rather than a supplier-change signal.

The real study, follow-up and pending comparison appeared as one work item. No new email transport call, supplier contact, purchase, recurring watch or hosted deployment occurred in this acceptance. [Executed checks and limits](docs/VERIFICATION.md).

Validation: 334 domain/backend tests, frontend/backend TypeScript and the 35-file hosting build passed. All 141 browser cases were verified across a full run and focused reruns, including exact reply navigation, deterministic saved outcomes, review persistence, session isolation, summary-only loading, responsive layouts and preserved drafts. This is local validation plus bounded real-provider acceptance, not deployment of the overview.


### 2026-09-21 - PR #41 publication and overview presentation follow-up

Merged the authorized PR #41 into main as `f053dc6`. [Verify run 35643296196](https://github.com/krowslyare/restaurant-procurement/actions/runs/35643296196) passed tests and published the development backend/frontend, then verified 35 files, SPA fallback and the missing-asset response. The hosted Overview loaded existing saved work without browser console errors.

On a separate branch, clarified the decision-history empty state and separated next steps, work and outcomes. Removed the global Follow-ups intake; Research a question stays contextual and saved research stays accessible from its study and Overview. Global navigation clears obsolete return links, and early browser Back after reload reconciles the visible route. The four top-level destinations remain visible at 390 and 320 px. No source values or commercial terms are fabricated for the recording.

Validation passed 334 domain/backend tests, 38/38 focused browser tests in the final run, frontend TypeScript and the 35-file hosting build. Desktop/mobile review used existing real-source data; automated fixtures stayed on a separate local backend. Initial local selector setup and an early-Back route failure were corrected and rechecked without retries or relaxed assertions. The new presentation change is not merged or deployed; no new provider or mail calls were made.


### 2026-09-21 - Ingredient lists and independent research, separate PR

Implemented explicit photo/PDF reading with OpenAI, editable original/corrected rows, ambiguity review, source fingerprints and one/many selection. Excel/CSV/text remain available. Two durable Workflow lanes coordinate existing individual sourcing cases, with atomic capacity checks, idempotent starts, owner isolation, independent stop/retry and incremental Overview findings. PDF originals render locally; the interface uses the established visual system and preserves list selection during navigation.

On an isolated local backend, direct OpenAI read the synthetic kitchen list from both PNG and PDF into four correct ingredients. A real Firecrawl/OpenAI batch completed one run per ingredient: 17/15/15/25 sources and 12/10/12/12 interpretations respectively, all ending at the six-round budget. Observed two active/two queued, reloaded without duplicate cases, and opened rice evidence while other research continued. No files in Convex Storage, no mail requests and no purchases were created. This is local external acceptance, not hosted publication or private-customer enablement. Automated checks and the complete acceptance boundary are recorded in [VERIFICATION](docs/VERIFICATION.md).


### 2026-09-21 - PR #43 review corrections

Confirmed and fixed replacement-versus-retry request identity and incomplete metadata validation on batch replay. Removed repeated batch attention cards while retaining the shared priority actions inside each ingredient row. Regression checks cover identical replacement, unconfirmed retries, changed title/provenance and exact evidence/comparison/reply destinations. Desktop/mobile inspection used preserved local results; no additional provider calls, mail, merge or publication were made. Final validation is recorded in [VERIFICATION](docs/VERIFICATION.md).


### 2026-09-21 - PR #43 publication and ingredient-list continuity

PR #43 merged as `b393f10`; [Verify run 35663996163](https://github.com/krowslyare/restaurant-procurement/actions/runs/35663996163) passed 340 tests and published the development backend/frontend with 37-file verification. Hosted Overview/import-dialog checks passed; the recorded photo/PDF and four-ingredient provider acceptance remains local.

A separate follow-up preserves unlaunched ingredients after a partial start, retains the request identity when recovering an uncertain AI reading, and highlights available findings while keeping the six-round limit explicit. Nineteen focused browser tests and the hosting build passed. Desktop/mobile checks used synthetic continuity fixtures and the preserved real-source workspace. No new provider requests, mail or publication were performed for the follow-up. [Evidence and boundaries](docs/VERIFICATION.md).


### 2026-09-21 - PR #44 partial-launch navigation review

Corrected the remaining Explore-origin partial launch: it retains the visible pending list and navigates to Overview only when the full list has been launched. Five focused browser tests cover both entry points plus uncertain-reading recovery; TypeScript and the hosting build passed. The capture script and narration were finalized under ignored `.local/recording/`; no video, new provider call or message was produced by this preparation.

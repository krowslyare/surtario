# Architecture and product contracts

Surtario supports one ingredient/market at a time: explore public evidence, save a study, optionally ask for missing terms and compare a purchase. No recipe, purchase history, document or order quantity is required for market research. The interface is English-first; original source quotations retain their language.

## Runtime structure

| Layer | Source | Responsibility |
| --- | --- | --- |
| Workspace | `src/MarketStudy.tsx`, `src/components/SourcingCase.tsx`, `src/components/Messages.tsx` | Search/study, persistent follow-up and inbox navigation |
| Review | `src/components/LiveResearch.tsx`, quote/document/reply review components | Editable proposals, original evidence and explicit confirmation |
| Calculation | `src/domain/`, `src/Comparison.tsx` | Deterministic quantities, packs, minimums, excess, tax/freight and eligibility |
| Reactive backend | `convex/schema.ts`, queries and mutations | Owned records, revisions, live updates and validated state changes |
| External work | Convex actions, provider adapters and sourcing workflow | Firecrawl, OpenAI and AgentMail calls outside database transactions |
| Components | `convex/convex.config.ts` | Agent, Workflow and Static Hosting |
| HTTP | `convex/http.ts` | Signed mail webhook and SPA/static asset routing |

A browser holds an anonymous capability; the backend stores its hash and validates ownership. This supports isolated hackathon sessions, not authenticated restaurant accounts. Clearing browser data loses access to that capability's work. Queries update the UI reactively; a pending provider action is not recreated just because the page reloads.

## Research and saved evidence

A research run retains candidate URLs, captured text, observation dates, interpretation status and citations. Source classification separates a product page from a catalog, contact, reference or irrelevant page. Reading a selected same-site product URL is explicit. AI extraction remains a proposal; unknown package or commercial terms are not inferred. A missing currency can use an explicit search-market default (USD for US, PEN for Peru); the review identifies that default and preserves the missing original value. Other markets require currency confirmation.

A study can contain reviewed priced offers, no-price candidates and references. Supplier offers, market references and completed purchases are different facts. Public search location is not proof of fulfillment to that location. Review distinct product specifications before comparing; do not convert currencies or mix studies silently.

A study retains up to 12 options; one comparison accepts up to six offers. Bulk source analysis is explicit and sequential. Switching searches or closing the page stops further requests; completed extractions remain saved. Quick review requires valid package/price fields and human confirmation before adding offers. A decreasing ready count means fewer unreviewed offers, not lost selections. Candidate priority describes data completeness, not supplier quality.

Persistent follow-ups link a question, study, research rounds, messages, comparison and activity. The durable workflow stops on its actual budget, missing evidence, diminishing returns or an explicit cancellation. Counts describe retained sources and domains with prices, not exhaustive market coverage. Prioritized findings preserve their originating run and source review.

Search and study records persist independently of the UI's tab-scoped checkpoint. Checkpoints recover the current route, draft/filters and scroll; an explicitly saved study/comparison is the durable recovery mechanism. These mechanisms must not restart paid searches, replay the landing transition on F5, or resend mail.

## Mail and human confirmation

The server freezes the configured test recipient and approved request revision. Sending is idempotent; uncertain outcomes require operator inspection. The signed webhook correlates replies by provider identifiers, bounds retained text and quarantines unmatched/ambiguous events. Incoming documents and email are untrusted data, never instructions or authorization.

Messages shows drafts, awaiting replies, uncertain outcomes and replies requiring review. Opening a conversation does not update an offer. Optional AI fields cite the original reply; the person confirms them before creating or merging an offer. Reviewed partial confirmations change only the supported freight/minimum term, preserve the previous evidence and record a before/after comparison. Stale revisions and conflicting retries are rejected.

Copying a WhatsApp draft is a clipboard action, not a messaging integration. Research, reply arrival and saved decisions do not trigger autonomous reminders, negotiation or purchases.

## Order calculation and advice

Enter a required quantity only when preparing a purchase. Compare whole packs and minimum orders, not unit price alone. Excess remains inventory, not realized savings or waste. Missing tax, freight, delivery, equivalence or usage remain pending. Sources, dates, currencies and base units stay explicit.

Listed unit prices can be compared before entering final order terms. Explicitly confirmed product equivalence uses a common comparison label while preserving each source's original specification. Currency and base unit must still match. Shared terms apply only when the user confirms they hold for every offer; blank fields preserve existing values. Missing terms still block a final order choice.

The advisor uses `evaluateScenarios` and `readEvidence` on a saved context. Deterministic results remain authoritative; AI explains scenarios and uncertainties. Editing inputs makes an earlier explanation stale. Saving a revised comparison clears an invalid prior selection. Neither selecting an offer nor saving a calculation records a purchase.

Without sales and other business costs, the app cannot claim real profit or proven monthly savings. Recipes and inventory optimization are outside this delivery.

## Documents and optional monitoring

Manual lists and reviewed XLSX/CSV columns can be saved as ingredient names with provenance; file bytes and unrelated columns stay local. Bundled synthetic PNG/PDF quotes exercise model extraction. Private documents support local manual transcription only; anonymous private-file upload is not enabled.

Optional source watches are implemented but disabled in hosted acceptance. They cover up to three selected, reviewed real sources for seven days, with daily checks. Changed price/package values produce review proposals, not automatic offer updates. Failed or mismatched readings stay unverified. This is not global price surveillance or browser/email push notifications.

## Verification boundary

Tests exercise deterministic results, ownership, revisions, provider boundaries and recovery. Local fixtures/CLI rehearsals and external provider acceptance are different evidence. Read [VERIFICATION](VERIFICATION.md) for what was actually executed and [STATUS](STATUS.md) for delivery state.

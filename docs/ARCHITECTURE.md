# Architecture and product contracts

Each Surtario study supports one ingredient/market: explore public evidence, save a study, optionally ask for missing terms and compare a purchase. No recipe, purchase history, document or order quantity is required for market research. The interface is English-first; original source quotations retain their language.

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

Saved research questions link a question, study, research rounds, messages, comparison and activity. Their creation is a contextual dialog; saved details reopen from Overview or the linked study. Global navigation clears return provenance, and contextual detail links retain it. Browser Back reconciles the route even when it happens while the lazy workspace mounts after reload. The durable workflow stops on its actual budget, missing evidence, diminishing returns or an explicit cancellation. Counts describe retained sources and domains with prices, not exhaustive market coverage. Prioritized findings preserve their originating run and source review.

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

Manual lists and reviewed XLSX/CSV columns remain local until their selected names are explicitly saved. Ingredient-list reading is a separate path from supplier quote extraction: a list starts research; a quote proposes commercial fields for a single comparison. Bundled synthetic quotes retain their existing review flow.

An explicit **Read list with AI** sends a PNG/JPEG/WebP/PDF (up to 3 MB) through a capability-scoped HTTP action to OpenAI. The server checks format, signature, byte count and request identity. File bytes remain in memory and are never stored in Convex Storage or Agent messages. Proposed rows expire after 24 hours; explicitly saved reviewed text remains with the session. This is bounded anonymous demo access, not restaurant-account authentication or private-pilot enablement. Provider data handling still applies, and the UI discloses the transmission before reading.

Rows preserve the interpreted original line, page/position, file fingerprint and corrected ingredient. Ambiguous rows require review or removal. Quantities remain unconfirmed source context, never automatic purchase needs. A recent reading can be reopened without another model request; the original file must be reselected to preview it after reload. PDF pages render locally with PDF.js, independently of AI reading.

Optional source watches are implemented but disabled in hosted acceptance. They cover up to three selected, reviewed real sources for seven days, with daily checks. Changed price/package values produce review proposals, not automatic offer updates. Failed or mismatched readings stay unverified. This is not global price surveillance or browser/email push notifications.

## Verification boundary

Tests exercise deterministic results, ownership, revisions, provider boundaries and recovery. Local fixtures/CLI rehearsals and external provider acceptance are different evidence. Read [VERIFICATION](VERIFICATION.md) for what was actually executed and [STATUS](STATUS.md) for delivery state.

## Sourcing overview and manual study refresh

`overview.list` derives session-scoped work from existing case/study/comparison links and orphan searches or conversations. Ingredient/location text alone never joins independent work. Reads use existing bounded indexes and return summaries, excluding source bodies, transcripts and mail text. Case-run subscriptions return one summarized research run at a time. Limits are displayed when legacy data exceeds supported inventory caps.

Overview, case next steps and Messages share reply identifiers and mail priority. Counts describe work items and may overlap: a case can need review while research runs or a supplier reply is outstanding. Source review is a separate, versioned acknowledgement on a research run. Its evidence hash prevents a stale review from clearing newly changed evidence; it never confirms commercial terms. Saved decision cards use the original confirmation reports and flag later comparison revisions.

A manual refresh uses `research.search` with an owned `studyId`, preserving ingredient and market. It shares the existing quick-search allowance, cooldown and provider gates; overlapping refreshes for the same study reuse the active run. New sources are compared by URL; interpreted differences are review prompts, not verified supplier changes. Missing extracted fields do not establish changed terms. A refresh saves research only: reviewed studies and comparisons change through their existing explicit review/save paths. No recurring watch is enabled by opening or refreshing Overview.

## Ingredient research batches

A batch coordinates existing sourcing cases; each selected row has one independent case, evidence and review/comparison path. Creation is atomic and idempotent by session/request ID, rejects changed replay input and checks the entire selection against the remaining ten-case session allowance before starting anything. A list may hold 100 reviewed names; a batch can only start the available case capacity. Separate equal ingredient names are never silently merged.

Two durable Workflow lanes await complete child research workflows. A slot is released after the child finishes, not when its asynchronous start returns. Only one batch (or standalone research outside it) may run per session. Reloading or closing a tab does not own the queue. Queued cancellation, active stopping and an individual failed/stopped retry preserve other rows. Stop invalidates late writes while the outstanding request drains before releasing its lane; it cannot refund provider requests already sent. Explicit continuation from a batch case also uses the coordinator. The existing three-run/six-round case budgets remain in force.

Overview counts cases once, groups their batch progress and opens saved findings before the batch completes. Grouped rows carry the shared priority action for evidence, messages and comparisons; batch cases are excluded from separate attention cards. Replacing a reviewed list creates a new request identity even when its contents match; retrying the same unconfirmed launch retains its identity. A replay compares the normalized title and area, source kind and all selected rows. Backend phases and available counts drive progress; no timed percentages are fabricated. Source totals in batch rows deduplicate exact URLs across that case's rounds, while review cards describe their outstanding review scope. Research completion, reviewed evidence and a purchase decision remain different states. No batch sends mail or selects offers.

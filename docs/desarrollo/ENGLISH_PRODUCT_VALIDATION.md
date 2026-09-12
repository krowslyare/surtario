# English-first product validation

This delivery integrates the existing Surtario visual work with the current research, saved-study, quotation, reply-review, and purchasing-advisor workflows. English is the application language. The default optional example is fictional rice sourcing in Portland, Oregon, with explicit USD and pounds. `?example=pe` retains the Peru fixtures and PEN/metric regression coverage. Original source quotations and user-provided ingredient names retain their language.

## Decision flow

The application distinguishes finding a source, reviewing a quoted offer, saving a study, comparing a proposed purchase, and sending an explicitly approved test inquiry. No selection records a purchase. Unknown minimums, freight, taxes, and delivery remain pending.

The new **Resolve missing terms** insight applies when freight is the only missing condition and another eligible offer supplies a complete same-currency benchmark. At a 40 lb requirement, the synthetic comparison can require USD 40 versus USD 35 before the second supplier's freight. The boundary is USD 5: it is arithmetic, not a quote. Trying USD 8 shows a hypothetical USD 43 total without changing the offer. Entering confirmed terms is a separate edit. A changed comparison resets the hypothetical dialog. Cases without a complete benchmark, mixed currencies, and other unresolved terms do not produce a misleading boundary.

## Review and fixes

Independent Sol review covered the US example and Peru fallback, source provenance, context isolation, saved-study recovery, conditional English accessibility labels, freight arithmetic, hypothetical state, and desktop/mobile captures. Findings corrected include cross-market saved-study updates, remaining Spanish labels, stale hypothetical dialog state, and the default currency for a newly added manual offer.

A subsequent real Luna rehearsal exposed an additional integration error: reviewed web evidence included the analysis summary only after server persistence, so the freshly saved advisor narrative was hidden as stale. The client and server now share the reviewed-evidence constructor. A backend round-trip regression compares the complete reconstructed source to the client proposal. The corrected browser flow displays the newly generated narrative immediately and restores it after reload without another model call.

The final browser pass also corrected keyboard submission for live search and restricted supplier inquiries to distributor IDs actually saved in the current study. Saved research can be opened without another paid search. The About Surtario page is English; original downloadable brand artwork retains its Spanish copy.

A final independent Luna max review found that the saved snapshot includes unselected catalog entries. The UI now derives inquiry candidates from saved `selectedIds`, and the server rejects draft requests for an unselected distributor even when it exists in that snapshot. Two US/Peru backend regressions failed before the correction and passed afterward. Browser checks cover a priced-only US study after reload and a web-only study without an unrelated sample distributor.

## Verification

The initial full pass completed 197 unit/backend/configuration tests and all 63 browser journeys. After the Luna review correction, 199 unit/backend/configuration tests and three targeted browser regressions passed locally. Browser coverage includes 320–1920 px layouts, keyboard operation, reduced motion, preserved form drafts, US study recovery, Peru regressions, hypothetical freight versus confirmed terms, quotation/reply boundaries, and saved web-advisor evidence. Frontend/backend TypeScript checks and the hosting build/asset checks passed. Browser suites use one worker because snapshot imports share a local backend. A main-bundle size warning remains; physical-device performance and a full accessibility audit were not measured.

## Local Luna rehearsal

A dedicated anonymous local Convex backend ran separately from the browser-test backend and the original development checkout. The bridge performed fixed US discovery and real `gpt-5.6-luna` CLI generation. One extraction read the synthetic 25 lb bag at USD 20, preserving the original source evidence and leaving unquoted terms unresolved. Two advisor generations completed using actual Convex Agent calculation and evidence tools: one exposed the stale-display bug, and the next verified the corrected UI. Saved recovery caused zero additional model calls. Desktop and 390 px review found no horizontal overflow.

The model generated in English, retained source IDs, and requested missing terms instead of asserting a saving or completed purchase. Web discovery and page content were synthetic. The bridge prescribed the tool-call sequence; this proves application orchestration rather than autonomous tool selection. No external email was sent. This is not direct OpenAI API or hosted Firecrawl/AgentMail acceptance.

## Release boundary

The original mixed working tree was preserved by integrating into an isolated checkout. Provider credentials, local session state, raw traces and rehearsal configuration remain outside Git. Vendored design-skill provenance and asset/font licensing remain included. Repository visibility, the existing development preview, production, and contest submission are separate from these PRs.

The public demonstration remains limited to synthetic isolated sessions. Authenticated accounts and private-document handling require the separate pilot stage. A polished interface does not establish that stage as complete. The three-minute video still needs recording and timing; no timed recording or submission is claimed here.

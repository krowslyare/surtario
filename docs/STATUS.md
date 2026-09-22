# Delivery status

Updated September 22, 2026. This is the current status source; `hackathon.md` retains the dated build history. Implementation, local tests, external acceptance and contest submission are separate outcomes.

| Area | State | Evidence / boundary |
| --- | --- | --- |
| Product and calculations | Implemented | Ingredient-first study; deterministic order comparison; 343 domain/backend tests in CI; 320 at the September 20 hosted acceptance |
| Provider integration | Bounded acceptance passed | Firecrawl, direct Luna API, AgentMail round trip and Convex reactive updates; see [VERIFICATION](VERIFICATION.md) |
| Study and follow-up | Implemented and exercised | Reviewed offers/no-price candidates, sources, messages and recoverable comparisons |
| Decision | Implemented | Missing terms block selection; local five-offer flow reaches selection after synthetic terms are confirmed; hosted acceptance retained its delivery blocker |
| Hosted app | Development published | PR #45, `ffbdde8`; [Verify run 35680145456](https://github.com/krowslyare/restaurant-procurement/actions/runs/35680145456) verified 37 published files, SPA fallback and missing-asset behavior |
| Recording UX follow-up | Merged and published in PR #40 | Bulk analysis/review, explicit saved states, 12 study options, six-offer comparison, compact layout and shared terms |
| Sourcing overview and manual refresh | Merged and published in PR #41 | Reactive work priorities, exact destinations, persisted research review, historical reply outcomes and an explicit live study refresh. Real Firecrawl/OpenAI acceptance ran on an isolated local backend; see [VERIFICATION](VERIFICATION.md) |
| Overview presentation and navigation | Merged and published in PR #42 | Explicit decision empty states, separated sections, contextual research questions, four mobile navigation entries and corrected return destinations. Local verification is recorded in [VERIFICATION](VERIFICATION.md) |
| Ingredient-list research | Merged and published in PR #43 | Photo/PDF AI reading, reviewed provenance, one/many selection, durable two-lane research and independent Overview results. PR #43 review corrections distinguish replacement from retry, validate replay metadata and show each batch case once. Local real PNG/PDF + four-ingredient Firecrawl/OpenAI acceptance; details in [VERIFICATION](VERIFICATION.md) |
| Ingredient-list continuity | Merged and published in PR #44 | Pending rows remain available after a partial launch; uncertain AI readings reuse their request ID; available findings lead the row while the round-limit notice remains explicit. 19 focused browser tests passed, followed by 5/5 after correcting partial-launch navigation from Explore; the hosting build passed. |
| Hosted list-to-comparison acceptance | Bounded acceptance passed after PR #45 publication | Real PNG reading, four ingredients, two concurrent investigations, partial findings and reload recovery. Rice study and a pending 40 lb single-offer comparison were saved, reloaded and reopened from its batch row. No supplier communication or purchase; commercial terms remain pending. See [VERIFICATION](VERIFICATION.md). |
| Compatibility-hyphen review | Corrected with regression coverage | The PR #45 review reproduced save failures for U+FF0D/U+FE63 in OCR/imported ingredient names. The case-link separator set now includes both; 21 focused tests, frontend/backend TypeScript and the hosting build passed. Original text and ingredient/specification guards remain intact. |
| Mixed reviewed evidence | Fixed locally; not published | Existing and new reviewed offers can update one saved comparison without resetting known evidence or terms. 348 tests, two focused browser journeys with synthetic sources, and hosting build passed. |
| Repository cleanup | Verified locally | Five public guides, README workflow diagram, working notes/tooling excluded; 320 tests and hosting build passed from a tracked-file snapshot with a fresh offline dependency installation |
| Recipes / private pilot | Outside release | No customer-data enablement or validated restaurant pilot |
| Submission | Pending | Final video, public GitHub release, social post and entry confirmation remain outstanding |

The hosted configuration uses `gpt-5.6-luna` with low reasoning. Recurring source watching stays disabled. Test-mail recipients are restricted; no real supplier communication or purchase is implied by the acceptance.

[All Gas](https://www.convex.dev/hackathons/all-gas) requires a public repository with root `hackathon.md`, an accessible accepted-host URL, a video under three minutes and a sponsor-tagged social post. Requirements were checked September 20 and re-verified September 22. The live app is https://scrupulous-mandrill-717.convex.site; the repository remains private until an authorized release.

Recording/submission drafts and older planning notes are kept locally under ignored `.local/repository-notes/`; they are not required to build or evaluate the source. The overview is published. The presentation/navigation follow-up is published in PR #42; ingredient-list research is published in PR #43, with the continuity corrections published in PR #44; final recording and submission remain outstanding.

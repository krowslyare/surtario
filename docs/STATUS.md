# Delivery status

Updated September 20, 2026. This is the current status source; `hackathon.md` retains the dated build history. Implementation, local tests, external acceptance and contest submission are separate outcomes.

| Area | State | Evidence / boundary |
| --- | --- | --- |
| Product and calculations | Implemented | Ingredient-first study; deterministic order comparison; 320 domain/backend tests at the latest acceptance |
| Provider integration | Bounded acceptance passed | Firecrawl, direct Luna API, AgentMail round trip and Convex reactive updates; see [VERIFICATION](VERIFICATION.md) |
| Study and follow-up | Implemented and exercised | Reviewed offers/no-price candidates, sources, messages and recoverable comparisons |
| Decision | Implemented | Missing terms block selection; positive selection/partial confirmations have earlier acceptance, and the latest test retained its delivery blocker |
| Hosted app | Development published | Baseline PR #38, `e25a058`; its GitHub Actions publication succeeded |
| Acceptance follow-up | PR #39 | `cf8e301` passed CI and Codex review; its source-navigation refinement is not yet claimed deployed |
| Repository cleanup | Verified locally | Five public guides, README workflow diagram, working notes/tooling excluded; 320 tests and hosting build passed from a tracked-file snapshot with a fresh offline dependency installation |
| Recipes / private pilot | Outside release | No customer-data enablement or validated restaurant pilot |
| Submission | Pending | Final video, public GitHub release, social post and entry confirmation remain outstanding |

The hosted configuration uses `gpt-5.6-luna` with low reasoning. Recurring source watching stays disabled. Test-mail recipients are restricted; no real supplier communication or purchase is implied by the acceptance.

[All Gas](https://www.convex.dev/hackathons/all-gas) requires a public repository with root `hackathon.md`, an accessible accepted-host URL, a video under three minutes and a sponsor-tagged social post. Requirements were checked September 20. The live app is https://incredible-wolverine-122.convex.site; the repository remains private until an authorized release.

Recording/submission drafts and older planning notes are kept locally under ignored `.local/repository-notes/`; they are not required to build or evaluate the source. No further large product feature is required for the agreed recording scope.

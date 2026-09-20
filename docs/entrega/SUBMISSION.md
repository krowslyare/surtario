# Surtario · submission draft

Prepared September 20, 2026. These are reviewable materials, not a submitted entry.

## Links and delivery status

| Item | Value / state |
| --- | --- |
| Product | Surtario |
| Live app | https://incredible-wolverine-122.convex.site — public development hosting |
| Repository | https://github.com/krowslyare/restaurant-procurement — currently private; public release still requires owner approval |
| Build log | Root `hackathon.md`; started September 7, 2026 |
| Video | Not recorded/uploaded yet; use [the live recording script](../desarrollo/ENSAYO_DEMO.md) |
| Social post | Draft below; not published |
| Entry | Not submitted; https://vibeapps.dev |

The [official event page](https://www.convex.dev/hackathons/all-gas), checked September 20, requires a public GitHub repository with `hackathon.md`, an accessible app on an accepted host, a video under three minutes, and a social post tagging the sponsors. The stated deadline is **September 22 at 12:00 PM Pacific / 2:00 PM Lima**. Check the live submission form for its exact fields before submitting; this document does not claim registration or acceptance. Event registration: https://luma.com/convex-allgas-hackathon.

## One-line description

Surtario turns ingredient research into a saved supplier study, connecting public sources, reviewed quotes and order calculations while keeping missing terms visible.

## Product description

A kitchen can start with one ingredient and a delivery area, without recipes or purchase history. Surtario finds public supplier sources, distinguishes published prices from no-price candidates, and preserves the original evidence. A saved follow-up can research a specific question across multiple rounds or prepare an inquiry for human approval.

Incoming replies appear in Messages. OpenAI proposes cited fields, the user reviews them, and deterministic calculations show whole packs, minimum orders, excess inventory and total cash required. The advisor can evaluate scenarios and read evidence; it cannot silently confirm missing commercial terms. Saving or choosing an offer does not place an order.

## How the sponsors are used

| Service | Implemented role | Executed evidence |
| --- | --- | --- |
| Convex | Persistent studies, comparisons and follow-ups; reactive progress/messages; durable research workflow; server actions and static hosting. | Hosted reload/recovery and live reply arrival; separate-session reads denied. |
| OpenAI | Source interpretation, cited field extraction, inquiry suggestions and an advisor using deterministic tools. | Bounded direct `gpt-5.6-luna` API acceptance with low reasoning, including both advisor tools. No CLI substitute for this acceptance. |
| Firecrawl | Public web search and page reading, with source provenance and explicit failures. | New rice/Portland search and six-round research case; no fixture replacing the provider response. |
| AgentMail | Approved request send, correlated reply and signed webhook into Convex. | One live request/reply through configured test inboxes; reactive UI, then human-reviewed extraction. |

The September 20 acceptance returned 21 candidate sources in the quick search. A separate advanced case interpreted 15 unique sources and found prices on seven independent domains. These are dated observations, not a promise of complete coverage, product equivalence or delivery availability. Full scope: [HOSTED_ACCEPTANCE](../desarrollo/HOSTED_ACCEPTANCE.md).

## Current limits

The public experience uses isolated anonymous sessions and restricted test mail recipients. It is not a private restaurant pilot. Web evidence can be incomplete; price, package, currency, minimum, taxes and delivery require their own evidence. Private-document automation, recipes, commercial accounts and automated purchasing are outside this submission. Recurring source watching remains disabled. No measured savings or restaurant traction is claimed.

## Social post draft

Built Surtario for the All Gas Hackathon: ingredient research that continues into a supplier study, reviewed email replies and clear order calculations.

Live sources, visible research progress, and missing terms that stay missing until you confirm them.

Built with @convex, @OpenAI, @firecrawl and @agentmail.

Try it: https://incredible-wolverine-122.convex.site

Add the final public repository and video links before posting. On LinkedIn, select the actual sponsor pages rather than assuming plain text tags create mentions. Do not publish this instruction paragraph.

## Final handoff

- Review and integrate the acceptance PR, then verify its published UI.
- Record, inspect and upload the final video; insert its actual URL here.
- Review repository contents/history for public release; change visibility only with owner approval. Update the README/log visibility and verify anonymous access afterward.
- Publish the approved social text, verify the actual post and retain its URL.
- Complete the current entry form with these verified URLs and retain its confirmation. A prepared form is not a submitted entry.

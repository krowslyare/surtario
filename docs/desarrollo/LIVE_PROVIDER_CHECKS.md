# Live provider checks

Local browser/unit tests validate application behavior with disabled or simulated providers. Real-provider acceptance is a separate, explicit check against the configured development deployment. Existing Firecrawl/Luna and AgentMail evidence remains historical; Luna CLI is not direct OpenAI API acceptance.

## Reproducible checks

`npm run check:providers` reads configuration from `incredible-wolverine-122` using the existing CLI login. It reports only missing variable names. It rejects deployment-key/self-hosted overrides and rehearsal transport. It does not deploy code, create projects, change gates, or transmit a message.

`npm run check:providers -- --live` also runs one bounded `discovery:probe` through the deployed application for long-grain white rice in Portland, then performs AgentMail's [Get Inbox](https://docs.agentmail.to/api-reference/inboxes/get) request for the configured inbox. The probe can consume multiple provider requests/credits according to the deployed adapter budget. There are no runner retries. Authenticated inbox access does not establish send/delivery/webhook behavior.

The timestamped `.local/provider-checks/` report contains domains, body lengths/hashes, latency, missing variable names and pass/partial/blocked outcomes. It excludes keys, inbox addresses, message bodies and source text. Exit 1 is a runner/target failure; exit 2 means missing configuration or a failed/partial probe; exit 0 covers these limited checks only. `integratedJourney` always remains `not_executed` because this command does not exercise the saved-case journey. The deployed code is not assumed to equal the PR head.

## Remaining integrated acceptance

### Observed on September 17, 2026 (09:27 UTC)

- The deployed Firecrawl probe returned 13 sources, 11 with text, in 128,459 ms. Its warning was true: recorded as partial coverage, not validated supplier offers. No new deployment was made for this check.
- AgentMail Get Inbox returned HTTP 403. A focused diagnostic confirmed `missing_permission`: the configured key lacks `inbox_read`. This does not establish whether it can send; send/delivery/webhook behavior was not exercised in this run. Operator inspection requires an appropriately scoped key; broadening the app's send key is not necessary merely to run a diagnostic.
- `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` and `OPENAI_ADVISOR_MODEL` were absent. Sourcing, document, advisor, reply and draft flags were also absent. Extraction and the integrated AI journey are blocked, not passed.
- Fresh preflight and probe reports are retained under `.local/provider-checks/`. The follow-up runner distinguishes missing inbox permissions from a generic transport failure. Three focused runner tests and frontend TypeScript passed.

These results supersede any inference that green PR CI proves live-provider readiness. They do not invalidate the earlier dated, separately authorized mail round trip.

Once the intended server-side OpenAI credential and supported extraction/advisor models are configured, the development app must exercise the following sequence with synthetic purchasing data and actual provider responses:

1. Search and interpret real sources through the app; check literal evidence, incompatible products, missing package/currency, and one empty search. Persist and reload the study.
2. Review and confirm terms, save a comparison, invoke advisor scenario/evidence tools and compare its explanation against independently calculated totals. Change an input and check stale-analysis handling. Exercise the bundled synthetic document and recover manually from a rejected extraction.
3. Review the exact draft and owned test recipient, approve that revision, send once, confirm actual provider acceptance and delivery, and receive a linked signed reply. Replay the event once and verify one linked reply remains. Do not automatically resend after a timeout.
4. Interpret the reply using OpenAI, confirm only explicitly supported terms, verify before/after totals and unchanged-winner cases, save and reload. Confirm another session cannot read the first session's records.

The procedure in `CREDENTIALS_AND_E2E.md` supplies the existing application steps. Configuration checks, model authentication, and HTTP success alone do not satisfy this sequence. Missing OpenAI access blocks the AI portions; substituting Luna or enabling a flag without a credential does not close that gap.

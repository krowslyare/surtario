# Configure providers and verify the complete demo

Stage status lives in [ETAPAS.md](ETAPAS.md). This is the execution procedure after the author chooses to configure credentials; implementing an adapter or passing simulated tests does not establish provider behavior.

## Establish the target

Use a dedicated Convex development deployment for the first real round trip. Confirm the project, deployment and frontend backend URL together. A public HTTPS site URL is needed for the AgentMail webhook. Do not use another project's deployment or introduce restaurant documents during this demo.

Configure secrets in the Convex backend environment using its dashboard or interactive CLI prompts. Do not paste them into chat, command arguments, browser storage, GitHub Actions or any `VITE_*` variable. No provider capability is enabled by simply adding a key.

| Capability | Server configuration | Explicit gate |
| --- | --- | --- |
| Web research | `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` | `LIVE_RESEARCH_ENABLED=true` |
| Synthetic image/PDF extraction | `OPENAI_API_KEY`, a compatible `OPENAI_EXTRACTION_MODEL` | `DOCUMENT_EXTRACTION_ENABLED=true` |
| Linked reply extraction | `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` | `REPLY_EXTRACTION_ENABLED=true` |
| Purchasing advisor | `OPENAI_API_KEY`, `OPENAI_ADVISOR_MODEL` | `ADVISOR_ENABLED=true` |
| Test email | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `AGENTMAIL_TEST_RECIPIENT`, `AGENTMAIL_WEBHOOK_SECRET` | `AGENTMAIL_ENABLED=true` |

Model names must be selected from the project's actual OpenAI access and verified against the structured-output/multimodal/tool calls used here. Model credentials and API availability have not been tested yet.

## Run the acceptance flow

1. Search one precise ingredient and area. Inspect relevance, original URL and observation date. Exercise an empty result and a distributor without a published price. Missing prices remain pending; a search result does not prove delivery coverage.
2. Extract one returned source and the bundled synthetic image/PDF. Check the proposed presentation, price, currency and literal evidence; correct ambiguous fields before saving. Real private file upload remains outside the public demo.
3. Save and recover the study, list and comparison in the same session. Confirm that another browser session cannot retrieve them. Quantity is optional until preparing a purchase; stock and daily usage remain unknown unless supplied.
4. Complete one synthetic comparison, set cash/coverage context, save a scenario and request AI analysis. Confirm that both scenario and evidence tools executed, citations refer to active sources, and the prose agrees with the displayed deterministic verdict. Compare cash and unit-price priorities. Change an input and verify the saved analysis is marked stale. Reject unsupported interpretation instead of treating a successful HTTP response as correct advice.
5. Choose an author-approved test recipient. Review the exact quotation text and recipient in the UI before sending once. Confirm AgentMail acceptance, reply from that test inbox, and observe the signed webhook route. Duplicate events must not duplicate replies. A timeout is uncertain, not permission to resend; use the verified [operator recovery procedure](AGENTMAIL.md).
6. Review the received offer, confirm equivalence before adding it to a comparison, re-evaluate cash/coverage and save the new decision. Copying a negotiation draft does not send it. Selecting an offer never records a purchase.
7. Verify the hosted root, hashed assets, SPA reload and preserved webhook route using [HOSTING.md](HOSTING.md). Run the complete journey in two isolated sessions and record failures and limitations before public release.

Record actual outcomes and provider latency in the stage evidence. Do not commit message bodies, credentials or real customer data. Disable the corresponding gate after a failed integration check while investigating; automatic paid retries are not a substitute for confirmation.

## Rehearse the video after the live checks pass

Use one ingredient throughout: research → review → saved comparison → advisor cash/negotiation decision → approved test email → reviewed reply → updated scenario. Keep the executive recommendation, impact and pending condition visible. If email latency requires a previously received response, identify it as a prior test and preserve its actual request link. The rehearsal is not a recorded or submitted video.

The commercial stage still requires restaurant access, authenticated accounts, private-document handling and measured usefulness. Recipes and purchase history are separate extensions; they do not block the agreed hackathon decision flow.


## Recorded development run — September 9, 2026

The author authorized configuration through the logged-in Chrome provider consoles. The target was a newly created, dedicated Convex cloud development deployment; production was not used. Keys and the signing secret were transferred directly into backend environment fields. No secret values or message bodies are included in this record.

| Check | Observed result | Limit |
| --- | --- | --- |
| Firecrawl internal discovery probe | At 21:48 UTC, the rice/Lima query returned three sources from Makro, Costeño and Mundo Abarrotes without an adapter warning | Catalog sources only; OpenAI extraction, price validity and delivery coverage unverified |
| Approved AgentMail request | The browser displayed the frozen owned test recipient and exact text before approval; AgentMail accepted it and the second owned inbox received it | Synthetic study without a quantity or published price; no real supplier contacted |
| Signed reply and duplicate | The reply appeared under the original request; Svix reported `200 Accepted`. Replaying the same received event succeeded; one linked reply remained | One real request/reply; no real timeout or operator reconciliation exercised |
| Reviewed offer | Manual confirmation produced PEN 48 per 10 kg; confirmed synthetic conditions produced PEN 96 for 20 kg. Save/open recovered the same comparison and reply provenance | No automatic email extraction, purchase or measured savings |
| Hosting | Development upload, root/assets build match, SPA fallback, missing asset 404 and unsigned webhook 400 passed | Final contest release and complete hosted two-session provider flow remain pending |

OpenAI remained unconfigured because the intended account/project needed confirmation. Its extraction, document and advisor gates remain off; the public web-research gate also stays off until its OpenAI dependency is tested. Firecrawl's successful internal probe does not imply that the public research flow was exercised. AgentMail is enabled only with the configured test destination.

Provider latency was not instrumented during this manual run; timestamps do not establish a latency benchmark. The pre-existing 126 unit/backend tests and 49 local browser journeys used simulated or disabled providers and remain separate evidence. The real run found and corrected a static footer that incorrectly claimed no consultations had been sent; it now explains the per-send review requirement.

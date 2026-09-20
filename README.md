# Surtario

**Current baseline: merged PR #38.** Clearer navigation between supplier search, saved follow-ups, Messages and purchase comparisons. Follow-ups have their own workspace; the global Messages inbox surfaces sent inquiries and incoming replies, with explicit review and saving before prices or terms change. Source-review and conversation dialogs use compact layouts, accessible disclosures and reduced-motion support. See the [UX audit and local verification](docs/diseno/AUDITORIA_SEGUIMIENTO.md) and [dated delivery evidence](docs/desarrollo/ETAPAS.md). The [decision-flow contract](docs/desarrollo/CONSOLIDACION_DECISION.md) remains in force. Older test counts below belong to their dated deliveries. Publication and live-provider acceptance are tracked separately in the dated delivery evidence.

**Sourcing for your kitchen.** Surtario is a restaurant purchasing assistant built with React, TypeScript, Vite and Convex. Start with an ingredient and location, research prices and distributors, save the evidence, and prepare a purchase only when needed. The interface is English-first, with explicit currencies and units. The optional Portland rice example uses USD/lb; the Peru examples remain available through `?example=pe`.

Research does not require recipes, purchase history, stock or a document. Supplier offers, market references and completed purchases are different facts. Choosing an offer does not place or record a purchase.

## Current capabilities

- A compact product entrance at `/`, with an interactive, explicitly fictional delivery example and direct entry to `/?view=market`. [Landing behavior and design](docs/diseno/surfaces/LANDING.md).

- Recover explicitly linked studies, cases, searches and calculations through **Continue your work**. Unpriced supplier cards prepare a persistent inquiry for review; reviewed public candidates can open a prefilled research question. Neither action starts a provider call or sends a message.
- Calculate a purchase directly from a catalog or reviewed offer, retaining pending terms and any existing linked case comparison. Quantities remain user-entered and comparisons require an explicit save.
- Research examples without a quantity, including distributors without published prices. Explicitly gated Firecrawl search and OpenAI extraction preserve sources, dates and fields requiring review.
- Classify candidate sources before price review, retain cited summaries and warnings, and explicitly read a selected same-site product page. Catalogs, broken pages and unrelated sources cannot silently become comparable offers.
- Keep reviewed web offers, no-price distributor candidates and selected examples in one saved market study. Counts and recovery use the same selection; adding a different ingredient/location requires a new study.
- Enter a manual list or review an XLSX/CSV ingredient column. Save reviewed names by browser session and recover them after reload. File bytes and other columns remain local.
- Inspect bundled synthetic PNG/PDF documents, request extraction when enabled, correct proposed fields and preserve the reviewed comparison. Private image/PDF inputs currently support local manual transcription only.
- Compare whole packages, minimum orders, freight, confirmed tax conditions, excess and cash outlay. Unknown critical values remain pending. Resolve a missing freight quote with a calculated boundary and a separate hypothetical scenario before entering confirmed terms.
- Prepare contextual freight or minimum-order questions from saved comparisons; study and candidate cards open that comparison before offering these actions. Confirmed replies show the change in terms, order total and budget viability even when the recommended supplier stays the same. Review linked partial replies and compare before/after using the preferences saved with that question, without replacing other terms or recording a purchase. [Flow and verification](docs/desarrollo/DECISION_FOLLOWTHROUGH.md).
- Set purchasing priorities, available budget, confirmed daily usage/stock and maximum coverage. Save an executive verdict, inspect alternatives and copy a negotiation draft. An optional Agent action explains the saved scenario using read-only calculation and evidence tools. Changed inputs visibly invalidate old analyses.
- Prepare an explicitly reviewed quotation email to one configured test recipient. Optionally suggest fields from a linked reply with AI, then confirm the editable proposal before adding an offer; internal operator recovery handles uncertain sends and unmatched replies without resending.
- Serve the development preview through Convex static hosting while preserving the signed AgentMail webhook route.
- Use the Surtario visual system across the market and comparison workspaces: bundled wordmark and editorial assets, aubergine/radish/chili tokens, Bricolage Grotesque headings, Manrope body text, reduced-motion-aware interactions and shared controls. The brand guide is available locally at `/?view=brand`.

## Verified behavior

The [development app](https://incredible-wolverine-122.convex.site) runs the merged PR #38 frontend/backend. On September 20, a bounded hosted acceptance used **real Firecrawl, direct OpenAI API (`gpt-5.6-luna`, low reasoning), AgentMail test inboxes and reactive Convex queries**:

- Fresh rice/Portland search: 21 candidate sources, 16 with readable text and 3 initial AI reviews. Two reviewed web offers were saved with their distinct specifications and missing terms preserved.
- Adaptive research: six rounds in 210.288 seconds, 21 unique sources, 15 interpreted and published prices on 7 independent domains. It stopped at its operational budget with incomplete coverage explicitly stated.
- An approved test inquiry and reply arrived through AgentMail. Messages updated without reloading; AI proposed reply fields and a human confirmed them before saving a comparison.
- A 60 lb test need required three 25 lb bags: 75 lb received, 15 lb excess and USD 66 including the confirmed freight. Unconfirmed delivery timing kept selection disabled.
- The API advisor executed both calculation and evidence tools. Input changes invalidated its explanation; restoring the original inputs recovered it without another AI call. Reload retained the route and local draft. A different session could not read the saved work.

These are sources and test terms, not verified supplier coverage, a real purchase, negotiated savings or a restaurant pilot. The exact API spend was not measured. Recurring price monitoring remains disabled. The bundled clear/ambiguous document and image API checks were performed locally on September 19, not repeated in this hosted acceptance.

The acceptance found a navigation issue: the last one-source round obscured the accumulated findings. The follow-up source summary now opens by default, links prioritized findings to the matching review and distinguishes a single search from all research. This follow-up change is verified locally in the acceptance closeout branch and awaits integration/publication; it is separate from the already published PR #38.

See [hosted acceptance](docs/desarrollo/HOSTED_ACCEPTANCE.md), the authoritative [stage status](docs/desarrollo/ETAPAS.md), and the [live recording script](docs/desarrollo/ENSAYO_DEMO.md). Historical CLI rehearsals and earlier provider limitations remain in their dated records; they do not describe the current hosted configuration. Repository publication, the final video and contest submission are still pending.

## Run locally

Requires Node.js >=22.12 and npm. Install from the lockfile:

```sh
npm ci
npm run dev:backend
```

Keep the backend running. On an unconfigured checkout, the Convex CLI can create an anonymous local backend without an account. Confirm the selected target before reusing existing configuration. Use the local `VITE_CONVEX_URL` written by the CLI, or follow [.env.example](.env.example).

In another terminal:

```sh
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`, for the product entrance. Use `/?view=market` to open the workspace directly; comparison and brand links retain their explicit `view` parameter. Legacy `/?example=pe` still opens the Peru workspace. Restart Vite if its backend URL changes. With no backend URL, fixture exploration and calculations remain available; persistence is explicitly unavailable. Saving and reloading requires the local backend.

## Verify

```sh
npm test
npm run check:hosting
npx tsc --noEmit -p convex/tsconfig.json
npx playwright install chromium
npm run test:e2e
npm run test:demo
```

`check:hosting` runs frontend typechecking, a production build, entry-asset verification and a check for backend secret variable names in the bundle. GitHub Actions runs dependency installation, domain/Convex tests and the frontend build without provider secrets. After green checks on a push to `main`, a separate job publishes the development demo with `CONVEX_DEV_DEPLOY_KEY` and verifies its files. Pull requests do not deploy or receive that secret. Browser E2E requires the local backend and is run separately.

The browser configuration reads the anonymous local selector and public backend URL from `.env.local`. For a separate local checkout, set `E2E_LOCAL_DEPLOYMENT`, `E2E_LOCAL_BACKEND_URL` and `E2E_LOCAL_FRONTEND_URL` explicitly. Remote backend URLs, deployment keys and conflicting selectors are rejected. Browser data sockets must match the chosen backend; the configured local Vite socket is allowed for hot reload. Playwright starts its own Vite process and refuses an occupied frontend port so it cannot reuse a build connected to another local project. Tests write synthetic records in isolated browser sessions. They run sequentially because Convex snapshot imports share one deployment and cannot overlap.

`npm run test:backend` is the original calculation smoke check for the local backend at port 3210. It verifies known 10/18/20 kg scenarios, incomplete conditions and offer bounds.

Local verification includes desktop/mobile reflow, session isolation, stale revisions, immutable retries, reload recovery and a demo rehearsal. These checks do not establish real provider quality, commercial readiness, physical-device coverage or a full accessibility audit.

## Connect providers after implementation

Run `npm run check:providers` to inspect the fixed development deployment without changing its configuration. `npm run check:providers -- --live` additionally exercises the deployed Firecrawl discovery probe (consumes provider credits) and reads the configured AgentMail inbox. Reports are redacted and saved under `.local/provider-checks/`; missing configuration or failed/partial probes exit with code 2. Neither command sends mail or certifies the integrated journey. See [the live acceptance boundary](docs/desarrollo/LIVE_PROVIDER_CHECKS.md).

Follow the [credential and complete E2E procedure](docs/desarrollo/CREDENTIALS_AND_E2E.md). Keys belong only in the Convex backend environment. Do not put them in Git, chat, browser variables or `VITE_*` settings. Provider capabilities have separate explicit gates and remain disabled when unconfigured.

AgentMail needs an author-approved test recipient, a public HTTPS callback and a webhook signing secret. The UI requires review before sending; copied WhatsApp/negotiation drafts are not sent by the app. A timeout does not authorize an automatic retry.

The [hosting procedure](docs/desarrollo/HOSTING.md) explains target selection and verified HTTP behavior. `npm run deploy:hosting:dev` builds, checks and uploads the frontend to the configured development deployment after its backend has been deployed. The original `npm run deploy:hosting` targets production and publishes backend and frontend; do not use it for the development acceptance flow. Both are remote operations, separate from local readiness checks.

## Contracts and development

| Area | Reference |
| --- | --- |
| Product scope and decisions | [Product plan](docs/producto/PLAN_PRODUCTO.md), [adversarial planning review](docs/producto/REVISION_ADVERSARIAL.md) |
| Stage status | [ETAPAS.md](docs/desarrollo/ETAPAS.md) |
| Persistent sourcing cases | [Architecture, AI layers and monitoring](docs/desarrollo/CASOS_ABASTECIMIENTO.md) |
| Purchasing advisor | [Decision policy and evidence](docs/desarrollo/ASESOR_COMPRAS.md) |
| Ingredient intake | [Local intake](docs/desarrollo/ENTRADA_INSUMOS.md), [saved lists](docs/desarrollo/SAVED_INGREDIENT_LISTS.md) |
| Web research | [Search contract](docs/desarrollo/BUSQUEDA_WEB.md), [saved reviews](docs/desarrollo/REVISION_WEB_GUARDADA.md), [distributor candidates](docs/desarrollo/DISTRIBUIDORES_WEB.md) |
| Documents and comparisons | [Document reading](docs/desarrollo/LECTURA_DOCUMENTOS.md), [saved comparisons](docs/desarrollo/PERSISTENCIA_COMPARACIONES.md) |
| Email and replies | [AgentMail and operator recovery](docs/desarrollo/AGENTMAIL.md), [reply-to-offer contract](docs/desarrollo/RESPUESTA_A_OFERTA.md) |
| Design and rehearsal | [UI/UX tokens](docs/diseno/UI_UX.md), [demo rehearsal](docs/desarrollo/ENSAYO_DEMO.md) |

`src/` contains the interface and deterministic domain logic; `convex/` contains the backend; `fixtures/` contains synthetic evidence; `tests/` contains browser journeys. Follow [AGENTS.md](AGENTS.md) before changes. The factual build history is in [hackathon.md](hackathon.md).

The repository includes [Anthropic Frontend Design](.agents/skills/frontend-design/SKILL.md), the [hackathon log skill](.agents/skills/convex-hackathon-skill/SKILL.md), the official [Firecrawl integration skill](.agents/skills/firecrawl/SKILL.md), and managed Convex guidance. Their licenses and the [Firecrawl](.agents/skills/firecrawl/UPSTREAM.md) and [Convex](third_party/convex-agent-skills/README.md) attributions apply to those files, not to the rest of the application.

The commercial stage requires restaurant validation, authenticated accounts and verified private-document handling before accepting customer data. Recipes and purchase history are separate extensions. The [repository](https://github.com/krowslyare/restaurant-procurement) remains private during preparation; public visibility and contest submission are separate pending actions.


### AgentMail with the anonymous local backend

Configure `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `AGENTMAIL_TEST_RECIPIENT` and `AGENTMAIL_ENABLED=true` in the **local Convex server environment**, not Vite. The inbox-scoped key needs Message Read and Message Send; Inbox Read is not needed by the message-access probe. Enter secret values through stdin to `npx convex env set NAME`.

Run `npm run dev:mail` alongside the frontend and local backend. This development receiver subscribes to real AgentMail `message.received` events over an authenticated outbound WebSocket, filters to the configured inbox/test sender, and invokes the existing internal Convex reply mutation. It preserves deduplication, thread correlation and human review; it cannot send mail or approve terms. `npm run dev:mail -- --check` only verifies subscription acceptance, then exits.

The receiver requires matching anonymous localhost configuration and refuses remote targets or deployment overrides. Keep it running during the email test. It exits visibly on disconnect/persistence failure; it does not replay emails received while offline. Inspect the original inbox before retrying. Hosted development retains the signed webhook; this local connection does not reconfigure it or verify its delivery. For optional AI drafting/reply extraction, enable `QUOTATION_DRAFT_ENABLED` / `REPLY_EXTRACTION_ENABLED` with the configured OpenAI model; each action still requires a user request. Old drafts keep their frozen recipient: prepare a new request if a draft predates mail configuration.

### Progressive live search

With `SEARCH_AUTO_REVIEW_ENABLED=true` in the Convex server, a new live search also prepares up to three distinct product sources with OpenAI. The search button explains this before the call. Sources appear through the existing Convex subscription as page reads finish; extracted fields are proposals until reviewed. Explicit currency evidence is prioritized for the bounded review budget. The English quick search uses three queries of up to 20 hits, retains at most 30 candidate sources, and uses at most thirty page reads (two concurrent reads; existing bounded rate-limit retries). The complete set remains available behind “Show all sources”; the first twelve prioritize readable priced results. No fixture replaces a failed live search. Each new search spends provider credits; reopening saved results does not rerun it.

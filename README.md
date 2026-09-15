# Surtario

**Sourcing for your kitchen.** Surtario is a restaurant purchasing assistant built with React, TypeScript, Vite and Convex. Start with an ingredient and location, research prices and distributors, save the evidence, and prepare a purchase only when needed. The interface is English-first, with explicit currencies and units. The optional Portland rice example uses USD/lb; the Peru examples remain available through `?example=pe`.

Research does not require recipes, purchase history, stock or a document. Supplier offers, market references and completed purchases are different facts. Choosing an offer does not place or record a purchase.

## Current capabilities

- A compact product entrance at `/`, with an interactive, explicitly fictional delivery example and direct entry to `/?view=market`. [Landing behavior and design](docs/diseno/surfaces/LANDING.md).

- Research examples without a quantity, including distributors without published prices. Explicitly gated Firecrawl search and OpenAI extraction preserve sources, dates and fields requiring review.
- Classify candidate sources before price review, retain cited summaries and warnings, and explicitly read a selected same-site product page. Catalogs, broken pages and unrelated sources cannot silently become comparable offers.
- Keep reviewed web offers, no-price distributor candidates and selected examples in one saved market study. Counts and recovery use the same selection; adding a different ingredient/location requires a new study.
- Enter a manual list or review an XLSX/CSV ingredient column. Save reviewed names by browser session and recover them after reload. File bytes and other columns remain local.
- Inspect bundled synthetic PNG/PDF documents, request extraction when enabled, correct proposed fields and preserve the reviewed comparison. Private image/PDF inputs currently support local manual transcription only.
- Compare whole packages, minimum orders, freight, confirmed tax conditions, excess and cash outlay. Unknown critical values remain pending. Resolve a missing freight quote with a calculated boundary and a separate hypothetical scenario before entering confirmed terms.
- Connect a missing-delivery finding to a supplier question, a hypothetical decision preview, and an explicitly confirmed answer. See the before/after recommendation using your actual advisor context, then save the confirmed terms. [Flow and verification](docs/desarrollo/DECISION_FOLLOWTHROUGH.md).
- Set purchasing priorities, available budget, confirmed daily usage/stock and maximum coverage. Save an executive verdict, inspect alternatives and copy a negotiation draft. An optional Agent action explains the saved scenario using read-only calculation and evidence tools. Changed inputs visibly invalidate old analyses.
- Prepare an explicitly reviewed quotation email to one configured test recipient. Optionally suggest fields from a linked reply with AI, then confirm the editable proposal before adding an offer; internal operator recovery handles uncertain sends and unmatched replies without resending.
- Serve the development preview through Convex static hosting while preserving the signed AgentMail webhook route.
- Use the Surtario visual system across the market and comparison workspaces: bundled wordmark and editorial assets, aubergine/radish/chili tokens, Bricolage Grotesque headings, Manrope body text, reduced-motion-aware interactions and shared controls. The brand guide is available locally at `/?view=brand`.

**Verification boundary:** the September 15 development walkthrough exercised real Firecrawl search and AgentMail test delivery/replies, manual offer review, freight confirmation, selection and reload recovery. OpenAI API extraction/advice and the complete AI-assisted hosted journey remain unverified. See [current evidence](docs/desarrollo/ETAPAS.md). The [development preview](https://incredible-wolverine-122.convex.site) is not the final contest release; no video has been submitted. Earlier verification figures below describe their respective deliveries.

The preceding full-suite delivery covered **all 54 browser journeys**. The September 10 integrated review pass had **175 unit/backend/configuration tests and 10 focused browser journeys passing** (four reply/research checks and six advisor checks), together with frontend/backend typechecks and hosting build/asset checks. Computer use exercised unified study recovery, AI-assisted reply review and the guided advisor with real Luna CLI; web/mail transport in that rehearsal was simulated. Two separate real Firecrawl calls and recorded-page interpretation are documented in [source analysis evidence](docs/desarrollo/FIRECRAWL_SOURCE_ANALYSIS.md). See [the integrated flow validation](docs/desarrollo/DEMO_FLOW_VALIDATION.md) for observed results and limits. PRs #21–#26 are merged. Their integrated backend and frontend were published to the development preview on September 10, 2026; all eight hosted files matched the build and a synthetic study survived save/reload/reopen. Direct OpenAI API, the combined hosted provider journey and the final timed recording remain pending.

The English-first integration and US decision flow are described in [product validation](docs/desarrollo/ENGLISH_PRODUCT_VALIDATION.md), with [US market boundaries](docs/desarrollo/US_MARKET.md). Real Luna CLI extraction and advisor generation were exercised locally, including saved-analysis recovery without another model call. Web/mail in that rehearsal were synthetic. The English-first integration pass completed **199 unit/backend/configuration tests and all 64 browser journeys passing**, plus frontend/backend typechecks and hosting checks. The older figures above describe their respective deliveries.


Persistent sourcing cases now connect a bounded AI research loop, reviewed evidence, versioned comparisons, traceable quotation drafts/replies and explicit selected-source monitoring. AI can plan research and suggest supplier questions as well as interpret sources/replies and explain decisions. Monitoring checks selected real reviewed sources about every 24 hours for seven days and creates review proposals for price/package changes. Provider gates remain off by default; the new workflow has local mocked-provider verification, not real-provider or hosted acceptance. See [architecture, limits and configuration](docs/desarrollo/CASOS_ABASTECIMIENTO.md).

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

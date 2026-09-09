# restaurant-procurement

A restaurant purchasing assistant built with React, TypeScript, Vite and Convex. Start with an ingredient and location, research prices and distributors, save the evidence, and prepare a purchase only when needed. The initial interface is in Spanish with explicit currencies and units.

The demo does not require recipes, purchase history, stock or a document. Supplier offers, market references and completed purchases are different facts. Choosing an offer does not place or record a purchase.

## Current capabilities

- Research examples without a quantity, including distributors without published prices. Explicitly gated Firecrawl search and OpenAI extraction preserve sources, dates and fields requiring review.
- Enter a manual list or review an XLSX/CSV ingredient column. Save reviewed names by browser session and recover them after reload. File bytes and other columns remain local.
- Inspect bundled synthetic PNG/PDF documents, request extraction when enabled, correct proposed fields and preserve the reviewed comparison. Private image/PDF inputs currently support local manual transcription only.
- Compare whole packages, minimum orders, freight, confirmed tax conditions, excess and cash outlay. Unknown critical values remain pending.
- Set purchasing priorities, available budget, confirmed daily usage/stock and maximum coverage. Save an executive verdict, inspect alternatives and copy a negotiation draft. An optional Agent action explains the saved scenario using read-only calculation and evidence tools. Changed inputs visibly invalidate old analyses.
- Prepare an explicitly reviewed quotation email to one configured test recipient. Review linked replies before adding an offer; internal operator recovery handles uncertain sends and unmatched replies without resending.
- Prepare Convex static hosting while preserving the AgentMail webhook route.

**Verification boundary:** the combined application is tested locally with synthetic data and simulated providers. No real OpenAI, Firecrawl or AgentMail request has been verified. No public deployment or submitted video exists. Current stage status is maintained only in [ETAPAS.md](docs/desarrollo/ETAPAS.md).

Verified locally: **122 domain/backend tests and 49 browser journeys passed**, including the demo rehearsal. Frontend/backend typechecks and the hosting build check also passed. Provider transports were simulated or disabled.

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

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Restart Vite if its backend URL changes. With no backend URL, fixture exploration and calculations remain available; persistence is explicitly unavailable. Saving and reloading requires the local backend.

## Verify

```sh
npm test
npm run check:hosting
npx tsc --noEmit -p convex/tsconfig.json
npx playwright install chromium
npm run test:e2e
npm run test:demo
```

`check:hosting` runs frontend typechecking, a production build, entry-asset verification and a check for backend secret variable names in the bundle. GitHub Actions runs dependency installation, domain/Convex tests and the frontend build without provider secrets. Browser E2E requires the local backend and is run separately.

The browser configuration reads the anonymous local selector and public backend URL from `.env.local`. For a separate local checkout, set `E2E_LOCAL_DEPLOYMENT`, `E2E_LOCAL_BACKEND_URL` and `E2E_LOCAL_FRONTEND_URL` explicitly. Remote backend URLs, deployment keys and conflicting selectors are rejected. Browser data sockets must match the chosen backend; the configured local Vite socket is allowed for hot reload. Tests write synthetic records in isolated browser sessions. They run sequentially because Convex snapshot imports share one deployment and cannot overlap.

`npm run test:backend` is the original calculation smoke check for the local backend at port 3210. It verifies known 10/18/20 kg scenarios, incomplete conditions and offer bounds.

Local verification includes desktop/mobile reflow, session isolation, stale revisions, immutable retries, reload recovery and a demo rehearsal. These checks do not establish real provider quality, commercial readiness, physical-device coverage or a full accessibility audit.

## Connect providers after implementation

Follow the [credential and complete E2E procedure](docs/desarrollo/CREDENTIALS_AND_E2E.md). Keys belong only in the Convex backend environment. Do not put them in Git, chat, browser variables or `VITE_*` settings. Provider capabilities have separate explicit gates and remain disabled when unconfigured.

AgentMail needs an author-approved test recipient, a public HTTPS callback and a webhook signing secret. The UI requires review before sending; copied WhatsApp/negotiation drafts are not sent by the app. A timeout does not authorize an automatic retry.

The [hosting procedure](docs/desarrollo/HOSTING.md) explains the selected target and route checks. `npm run deploy:hosting` publishes backend and frontend; it is a separate remote operation, not part of the local readiness command.

## Contracts and development

| Area | Reference |
| --- | --- |
| Product scope and decisions | [Product plan](docs/producto/PLAN_PRODUCTO.md), [adversarial planning review](docs/producto/REVISION_ADVERSARIAL.md) |
| Stage status | [ETAPAS.md](docs/desarrollo/ETAPAS.md) |
| Purchasing advisor | [Decision policy and evidence](docs/desarrollo/ASESOR_COMPRAS.md) |
| Ingredient intake | [Local intake](docs/desarrollo/ENTRADA_INSUMOS.md), [saved lists](docs/desarrollo/SAVED_INGREDIENT_LISTS.md) |
| Web research | [Search contract](docs/desarrollo/BUSQUEDA_WEB.md), [saved reviews](docs/desarrollo/REVISION_WEB_GUARDADA.md), [distributor candidates](docs/desarrollo/DISTRIBUIDORES_WEB.md) |
| Documents and comparisons | [Document reading](docs/desarrollo/LECTURA_DOCUMENTOS.md), [saved comparisons](docs/desarrollo/PERSISTENCIA_COMPARACIONES.md) |
| Email and replies | [AgentMail and operator recovery](docs/desarrollo/AGENTMAIL.md), [reply-to-offer contract](docs/desarrollo/RESPUESTA_A_OFERTA.md) |
| Design and rehearsal | [UI/UX tokens](docs/diseno/UI_UX.md), [demo rehearsal](docs/desarrollo/ENSAYO_DEMO.md) |

`src/` contains the interface and deterministic domain logic; `convex/` contains the backend; `fixtures/` contains synthetic evidence; `tests/` contains browser journeys. Follow [AGENTS.md](AGENTS.md) before changes. The factual build history is in [hackathon.md](hackathon.md).

The repository includes [Anthropic Frontend Design](.agents/skills/frontend-design/SKILL.md), the [hackathon log skill](.agents/skills/convex-hackathon-skill/SKILL.md), and managed Convex guidance. Their licenses and [Convex skill attribution](third_party/convex-agent-skills/README.md) apply to those files, not to the rest of the application.

The commercial stage requires restaurant validation, authenticated accounts and verified private-document handling before accepting customer data. Recipes and purchase history are separate extensions. The [repository](https://github.com/krowslyare/restaurant-procurement) remains private during preparation; public visibility and contest submission are separate pending actions.

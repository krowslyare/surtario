# Convex development hosting

The React/Vite application uses `@convex-dev/static-hosting` 0.2.1. A dedicated cloud development preview was published and checked on September 9, 2026:

- Frontend: https://incredible-wolverine-122.convex.site
- Backend: https://incredible-wolverine-122.convex.cloud
- Target: `restaurant-procurement`, development deployment `incredible-wolverine-122`.

This is a development preview. Final demo acceptance, production release and contest submission remain separate work; current stage status lives in [ETAPAS.md](ETAPAS.md).

## Routing contract

The component is registered without taking ownership of the root router. `convex/http.ts` keeps `POST /agentmail/webhook` as an exact application route and registers the static fallback afterward. Extensionless SPA routes fall back to `index.html`; missing assets with file extensions return 404.

The upload CLI resolves the selected component's backend/site URLs, builds Vite with its public `VITE_CONVEX_URL`, and publishes `dist/` atomically. OpenAI, Firecrawl and AgentMail credentials belong only to the Convex backend environment and must never enter the frontend bundle.

Provider capabilities require their explicit server gates and corresponding credentials. Uploading frontend assets does not enable a provider. The configured test destination and per-send review still apply on the hosted app.

## Local check

```sh
npm ci
npm run check:hosting
```

The check runs TypeScript and Vite, confirms entry assets exist, and rejects backend secret variable names in generated HTML, JavaScript or CSS. It does not itself publish files or prove HTTP behavior.

## Publish to the selected development deployment

1. Authenticate with Convex and confirm the project, development deployment and frontend backend URL. Do not reuse another project's selector or set a production deploy key.
2. Deploy the backend to that development target with `npx convex dev --once`. For the first cloud setup, select the existing project and cloud development explicitly through `npx convex dev --configure existing --dev-deployment cloud --once`.
3. Confirm the registered component's public URLs with `npx convex run --component staticHosting lib:getUrls`.
4. Run `npm run deploy:hosting:dev`. It invokes `upload --dev --build-command "npm run check:hosting"`: the build check must pass before upload. This uploads frontend assets only; backend changes require step 2.
5. Verify with GET requests and a real browser. Convex HTTP does not currently support HEAD for this check.

The original `npm run deploy:hosting` command runs the component's one-shot `deploy`, which selects **production** for URL resolution, backend deployment and upload. Do not use it for development verification. These command behaviors were checked in the installed 0.2.1 CLI source and the development upload was executed successfully.

## Observed HTTP behavior

At 22:01 UTC on September 9, 2026:

| Request | Result |
| --- | --- |
| `GET /` | 200 HTML, byte-for-byte match with the build; `public, max-age=0, must-revalidate` |
| Entry JavaScript and CSS | 200, SHA-256 matches with local build files; `public, max-age=31536000` |
| `GET /comparison` | 200 with the same SPA shell |
| Missing `.js` asset | 404 |
| Unsigned `POST /agentmail/webhook` | 400 `Invalid signature`; the configured exact route was preserved |

Earlier in the same run, a real signed AgentMail reply returned `200 Accepted`; replaying that event succeeded without duplicating the reply. Without a configured signing secret, the route instead returns 503 as covered by the local router test.

Chrome loaded the hosted app, displayed an empty fixture search correctly, and saved/recovered a synthetic rice study in a fresh page. The HTTPS-origin session did not inherit the localhost session's saved study or email request. This smoke check does not replace the complete hosted two-session provider journey. OpenAI extraction and advisor calls remain pending; see [provider acceptance evidence](CREDENTIALS_AND_E2E.md).


## Reviewed main publication — September 10, 2026

Published the backend and frontend from reviewed main revision `6ed1dd1587562c5e8db630ec0f155eb20dffdd0a` to the same development deployment. `convex dev --once` completed successfully; `deploy:hosting:dev` rebuilt with the cloud backend URL and `VITE_REHEARSAL=false`, passed typechecking and hosting asset checks, and atomically published eight files. Provider environment variables were not changed.

HTTP checks started at 20:36:58 UTC:

| Check | Result |
| --- | --- |
| All eight files, including HTML, JS, CSS, font, worker, SVG and synthetic PNG/PDF | 200; SHA-256 matches the local build |
| `GET /comparison` | 200; same SPA shell |
| Missing `.js` asset | 404 |
| Unsigned `POST /agentmail/webhook` | 400 `Invalid signature` |
| In-app browser | App loaded; synthetic study with a priced rice offer and a distributor without a price saved and reopened after reload with both options preserved |

The application code matches reviewed main; the follow-up documentation commit records this deployment only. This verifies deployment and basic hosted persistence, not the combined real-provider journey. OpenAI API acceptance and final contest release remain pending. No external provider request, email, production deployment or repository visibility change occurred.


## Development acceptance — September 15, 2026

The development site was updated to merged PR #32 and subsequently to the uncommitted frontend readability/continuity changes in `codex/cloud-demo-acceptance-0915`. Firecrawl search is enabled; OpenAI remains pending. AgentMail test delivery, linked replies, manual offer review and USD 4 freight confirmation were exercised through the hosted UI. See [the stage evidence](ETAPAS.md) for boundaries and test results. The automatic deployment branch has not been published by this task.


## Automatic development publication

The `Verify` workflow includes a `deploy-demo` job after tests/build, only for pushes to `main`. Pull requests never receive deployment credentials or publish. Configure the repository Actions secret `CONVEX_DEV_DEPLOY_KEY` with a **deployment-scoped development key** for `incredible-wolverine-122`. Production, preview, project-wide, wrong-target and missing keys fail before publication; the key value must never be committed or pasted into logs.

The job publishes backend functions with `convex deploy --yes` (the checked development key selects the destination), then uses `deploy:hosting:dev` to build/check/upload the frontend. `VITE_REHEARSAL=false` is explicit. Development publications are serialized and are not canceled midway by a newer push. Verification downloads every build file and compares exact bytes, checks the SPA route and requires a missing asset to return 404. A failure is visible in Actions; backend and frontend publication are separate operations, so a frontend failure may leave a newer backend. Fix the cause and rerun the workflow; there is no automatic rollback.

The repository secret exists (verified September 15). Its value was not retrieved. Activation and credential acceptance remain pending until this workflow is merged into main and its first real Actions publication succeeds. Existing provider gates, credentials and per-email approval remain unchanged.

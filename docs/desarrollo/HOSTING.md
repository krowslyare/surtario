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

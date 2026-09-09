# Convex hosting preparation

The application is configured with `@convex-dev/static-hosting` 0.2.1, the official component for serving a React/Vite application at `https://<deployment>.convex.site`. This delivery prepares code only: it has not created a cloud deployment, uploaded files, or produced a public URL.

## Routing contract

The component is registered without taking ownership of the root router. `convex/http.ts` keeps `POST /agentmail/webhook` as an exact application route and registers the static fallback afterward. The webhook therefore keeps its current URL, while extensionless SPA routes fall back to `index.html`. Missing assets with file extensions continue to return 404.

The hosting CLI builds Vite with the `VITE_CONVEX_URL` for the selected deployment and publishes `dist/` atomically. OpenAI, Firecrawl, and AgentMail credentials belong only to the Convex backend environment and must never enter the frontend bundle.

All provider capabilities remain off when their explicit server gates are absent. `LIVE_RESEARCH_ENABLED`, `DOCUMENT_EXTRACTION_ENABLED`, `AGENTMAIL_ENABLED`, and `ADVISOR_ENABLED` each require the exact value `true` together with their corresponding server credentials. `OPENAI_ADVISOR_MODEL` selects the advisor model when that capability is enabled; it is backend configuration, not a `VITE_*` variable or a substitute for `OPENAI_API_KEY`.

## Local checks without credentials

```sh
npm ci
npm run check:hosting
npm test -- --run convex/quotationMail.test.ts
```

The hosting check runs TypeScript and the Vite build, confirms that `dist/index.html` references existing assets, and rejects backend secret variable names found in generated HTML, JavaScript, or CSS. The focused router test confirms that the exact AgentMail webhook still responds with 503 when its server secret is absent while the static GET fallback is registered. These checks do not validate real HTTP caching, storage, or SPA fallback behavior because that requires uploading to a Convex deployment.

## Remaining deployment steps

1. Sign in to Convex and confirm the exact cloud deployment. Do not reuse a deployment from another project.
2. Keep all four provider gates absent until each capability's credentials and model configuration have been tested separately.
3. Run `npm run deploy:hosting`. This command builds with the backend URL, deploys the Convex backend, and uploads `dist/`. It changes remote state and publishes a URL, so it is intentionally not run during this preparation.
4. Use `GET` to verify the root document, a hashed asset, and an SPA route after reload. Verify that `POST /agentmail/webhook` without its secret returns 503. Convex HTTP does not currently support `HEAD` for this hosting check.
5. Run the public demo flow in two isolated sessions with synthetic data before describing the demo as published.

API sources checked on September 9, 2026: the published README for `@convex-dev/static-hosting` 0.2.1 and the served Convex capability catalog. The final URL, cloud deployment, cache behavior, and hosted HTTP behavior remain unverified.

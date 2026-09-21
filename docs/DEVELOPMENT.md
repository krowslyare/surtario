# Development and operations

Requires Node.js 22.12+ and npm. The lockfile is authoritative. Product boundaries are in [ARCHITECTURE](ARCHITECTURE.md); executed acceptance is in [VERIFICATION](VERIFICATION.md).

## Local application

```sh
npm ci
npm run dev:backend
# Keep the backend running; in another terminal:
npm run dev
```

For isolated development, choose an anonymous local Convex backend. Confirm the selected project/deployment before reusing existing configuration. `.env.local` holds the CLI selector and the public `VITE_CONVEX_URL`; restart Vite after changing that URL. Without a backend, fixture exploration and calculations remain available, but persistence is unavailable.

The entrance is `/`; `/?view=market` opens the workspace. Messages, follow-ups and comparisons use their own `view` routes. `/?example=pe` preserves the separate Peru fixture and its original PEN/metric evidence. The development-only brand guide is `/?view=brand`.

## Provider configuration

Use the Convex dashboard or interactive CLI to configure the **server** environment. No provider credential belongs in Git or a `VITE_*` variable. A key alone does not enable a capability.

| Capability | Required server values | Gate |
| --- | --- | --- |
| Web search and review | `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `OPENAI_EXTRACTION_MODEL` | `LIVE_RESEARCH_ENABLED=true` |
| Initial web interpretations | Same as web review | `SEARCH_AUTO_REVIEW_ENABLED=true` |
| Multiround research | Same as web review, live research enabled | `SOURCING_ENABLED=true` |
| Bundled image/PDF extraction | OpenAI key and compatible extraction model | `DOCUMENT_EXTRACTION_ENABLED=true` |
| Reply field suggestions | OpenAI key and extraction model | `REPLY_EXTRACTION_ENABLED=true` |
| Inquiry drafting | OpenAI key and extraction model | `QUOTATION_DRAFT_ENABLED=true` |
| Purchasing advisor | OpenAI key, `OPENAI_ADVISOR_MODEL` | `ADVISOR_ENABLED=true` |
| Test email | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `AGENTMAIL_TEST_RECIPIENT`, `AGENTMAIL_WEBHOOK_SECRET` | `AGENTMAIL_ENABLED=true` |
| Optional selected-source watches | Research prerequisites | `SOURCE_WATCH_ENABLED=true` |

September 20 acceptance used `gpt-5.6-luna` with low reasoning for extraction and advice. Source watches remain disabled in the hosted development configuration. Watch enablement is a separate decision because it schedules recurring provider work.

Quick search retains at most 30 candidates and initially interprets up to three product sources. Each case allows at most three research runs. Each run allows six rounds with up to six interpretations per round; the actual result may stop earlier or retain fewer relevant sources. Reopening saved work does not rerun providers. See `src/domain/researchCoverage.ts` and `convex/lib/firecrawl.ts` for the implemented budgets.

### Hosted email

Configure AgentMail's signed webhook at `https://<deployment>.convex.site/agentmail/webhook`. The server fixes the test recipient; a discovered supplier contact cannot change it. The user reviews the exact draft/recipient before sending. Editing the draft invalidates its previous approval. A reply is correlated by provider identifiers and remains evidence until reviewed and saved.

A `sending` interruption or `uncertain` state is not permission to resend. Operator recovery is internal only:

1. Inspect `quotationMail.inspectRecoveryQueue` and compare the frozen request with the actual AgentMail inbox.
2. Only after verifying a sent message, use `quotationMail.recordVerifiedSentReceipt` with the exact provider message/thread identifiers and request revision.
3. Use `quotationMail.linkVerifiedUnmatchedReply` only for a verified matching quarantined reply. The server rejects ambiguous or conflicting routes.
4. If provider evidence is missing, leave the request unchanged. Recovery never sends a replacement email.

### Local email receiver

```sh
npm run dev:mail -- --check
npm run dev:mail
```

Run alongside the local frontend/backend. It subscribes to real AgentMail events over an authenticated outbound WebSocket, filters the configured test inbox/sender and calls the existing local internal reply mutation. It does not send mail, approve terms or reconfigure the hosted webhook. Old drafts keep their frozen destination; recreate an unsent draft if it predates configuration.

## Verification commands

```sh
npm test
npm run check:hosting
npx tsc --noEmit -p convex/tsconfig.json
```

`check:hosting` includes frontend typechecking, Vite build, entry-asset checks and backend-secret-name checks in the bundle. `test:backend` is the older calculation smoke check against local port 3210; it is not integrated provider acceptance.

### Browser tests

Keep the anonymous backend running, and leave the test frontend port free:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own Vite process and refuses an occupied frontend port. Backend selector/URL default to `.env.local`. For another local checkout, set `E2E_LOCAL_DEPLOYMENT`, `E2E_LOCAL_BACKEND_URL` and `E2E_LOCAL_FRONTEND_URL` explicitly. Only anonymous local backends and localhost URLs are accepted; remote keys/selectors are rejected. Tests use synthetic data and run with one worker because snapshot imports share a deployment. Do not point them at a valued development dataset.

`npm run test:demo` runs the original synthetic study journey. It is a regression check, not the final live-provider video.

### Provider checks

```sh
npm run check:providers
# Additional real discovery call; consumes provider credits:
npm run check:providers -- --live
```

The checker targets `dev:incredible-wolverine-122`, rejects deployment-key/bridge overrides, and writes redacted reports to ignored `.local/provider-checks/`. The default reads configuration only; `--live` also exercises discovery and an AgentMail inbox read. A restricted inbox-read permission does not prove send/receive failure. Neither command sends mail nor certifies the complete journey.

### Optional Codex CLI rehearsal

Use a separate checkout with a fresh anonymous local backend. `scripts/rehearsal/configure.mjs` configures the loopback bridge; `scripts/rehearsal/server.mjs` runs it. The bridge uses a signed-in Codex CLI and the app's schemas for model calls, but simulates web/mail by default. `REHEARSAL_LIVE_FIRECRAWL=true` allows real web requests only in this isolated local mode. PDF rehearsal needs Poppler. This harness is not direct OpenAI API or hosted acceptance, and must not be enabled on a cloud deployment.

## Development hosting

The `Verify` workflow tests/builds pull requests. Only a successful push to `main` proceeds to development publication using `CONVEX_DEV_DEPLOY_KEY`. The guard rejects production, preview, wrong-target and project-wide keys. PR jobs do not receive that secret. Publication is serialized and verifies every uploaded file, SPA routing and missing-asset behavior afterward.

The checked target is `dev:incredible-wolverine-122` in this repository's Convex project. Backend and frontend publishing are separate operations; a frontend failure can leave a newer backend. Inspect the failure before retrying; there is no automatic rollback.

For an explicitly authorized manual development publication, first confirm the CLI's development target, deploy its backend with `npx convex dev --once`, then run `npm run deploy:hosting:dev`. That command builds/checks and uploads the frontend only. **`npm run deploy:hosting` selects production; do not use it for development checks.**

`convex/http.ts` registers the exact AgentMail webhook before the static fallback. Extensionless routes serve the SPA shell; missing assets return 404. Verify the actual public app after publishing, not just a successful upload command.

## Agent tooling and local notes

`AGENTS.md` contains project instructions. Read `convex/_generated/ai/guidelines.md` before editing backend code. Optional Convex skills can be installed with `npx convex ai-files install`; the official hackathon skill is linked from [All Gas](https://www.convex.dev/hackathons/all-gas). Installed `.agents/skills/`, `.claude/skills/`, `skills-lock.json` and design-tool output are local tooling, ignored by Git and unnecessary for building the app.

The repository cleanup preserved earlier plans, audit dumps and recording drafts under ignored `.local/repository-notes/`. Those notes are not part of a fresh clone; current public instructions live in these five guides. Git history retains earlier tracked versions. Removing a file from the current tree is not erasing its history. Preserve third-party license notices when copying or reinstalling tools.

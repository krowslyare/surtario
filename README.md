# Surtario

experimenting with stuff. tokenmaxxing.

A personal sandbox for trying AI agents, web research, email workflows, and reactive state. The current experiment is ingredient sourcing: collect sources, review model output, and compare orders with deterministic calculations.

Built with React, TypeScript, Vite, and Convex. Experiments include OpenAI, Firecrawl, and AgentMail integrations.

## Run it locally

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev:backend
```

Choose an anonymous local Convex backend for isolated development. Keep it running, then start the frontend in another terminal:

```sh
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173`. See [.env.example](.env.example) and [setup and configuration](docs/DEVELOPMENT.md).

External services use server-side credentials and explicit feature gates. Sample exploration and calculations work without them; saving needs a backend.

## Verify

```sh
npm test
npm run check:hosting
```

Tests use simulated providers. [Development notes](docs/DEVELOPMENT.md), [architecture](docs/ARCHITECTURE.md), [design](docs/DESIGN.md), [past verification](docs/VERIFICATION.md), and [current status](docs/STATUS.md) live in `docs/`.

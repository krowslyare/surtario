import { defineConfig } from "@playwright/test";
import { localBackendTarget, localFrontendTarget } from "./tests/e2e-local";

const backend = localBackendTarget();
const frontend = localFrontendTarget();

export default defineConfig({
  testDir: "./tests",
  // Fixture imports share one deployment and cannot overlap.
  fullyParallel: false,
  workers: 1,
  use: { baseURL: frontend.url, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --host ${frontend.hostname} --port ${frontend.port} --strictPort`,
    url: frontend.url,
    env: { VITE_CONVEX_URL: backend.backendUrl },
    reuseExistingServer: !process.env.CI,
  },
});

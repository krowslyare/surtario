import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readiness } from "./verify-live-providers.mjs";

describe("live provider readiness", () => {
  it("rejects a deployment key before making any external call and never prints it", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/verify-live-providers.mjs", "--live"],
      {
        encoding: "utf8",
        env: { ...process.env, CONVEX_DEPLOY_KEY: "prod:other|test-secret" },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("conflicting credentials refused");
    expect(result.stdout + result.stderr).not.toContain("test-secret");
  });
  it("does not treat Firecrawl and mail configuration as OpenAI acceptance", () => {
    const result = readiness({
      FIRECRAWL_API_KEY: "synthetic-secret",
      LIVE_RESEARCH_ENABLED: "true",
    });
    expect(result.search.missing).toEqual([]);
    expect(result.extraction.missing).toEqual([
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
    ]);
    expect(JSON.stringify(result)).not.toContain("synthetic-secret");
  });
  it("rejects dummy credentials and disabled gates", () => {
    const result = readiness({
      OPENAI_API_KEY: "local-rehearsal-only",
      OPENAI_ADVISOR_MODEL: "fixture-model",
      ADVISOR_ENABLED: "false",
    });
    expect(result.advisor.missing).toEqual([
      "OPENAI_API_KEY",
      "ADVISOR_ENABLED",
    ]);
  });
});

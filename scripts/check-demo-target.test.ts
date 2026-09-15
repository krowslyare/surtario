import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("development deployment credential boundary", () => {
  it.each([
    ["", false],
    ["dev:incredible-wolverine-122|synthetic-test-value", true],
    ["prod:incredible-wolverine-122|synthetic-test-value", false],
    ["preview:incredible-wolverine-122|synthetic-test-value", false],
    ["dev:another-deployment|synthetic-test-value", false],
    ["project:team:project|synthetic-test-value", false],
    ["dev:incredible-wolverine-122|", false],
    ["dev:incredible-wolverine-122|synthetic-test-value\n", false],
  ])("validates target without revealing credential (%#)", (key, allowed) => {
    const result = spawnSync(process.execPath, ["scripts/check-demo-target.mjs"], {
      env: { ...process.env, CONVEX_DEPLOY_KEY: key },
      encoding: "utf8",
    });
    expect(result.status).toBe(allowed ? 0 : 1);
    expect(result.stdout + result.stderr).not.toContain("synthetic-test-value");
    if (allowed) expect(result.stdout).toContain("target: dev (incredible-wolverine-122");
    else expect(result.stderr).toContain("No deployment was attempted");
  });
});

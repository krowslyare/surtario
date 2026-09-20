import { afterEach, expect, test, vi } from "vitest";
import { logLocalModelUsage } from "./lib/modelUsage";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("usage evidence logs only token counts and model on local deployments", () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const args = {
    model: "gpt-5.6-luna",
    provider: "openai.responses",
    userId: "private-session",
    threadId: "private-thread",
    agentName: "reader",
    providerMetadata: { openai: { secret: "never-log-this" } },
    usage: {
      inputTokens: 10, outputTokens: 5, totalTokens: 15,
      inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
      outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
    },
  } satisfies Parameters<typeof logLocalModelUsage>[1];
  const ctx = {} as Parameters<typeof logLocalModelUsage>[0];
  vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3230");
  logLocalModelUsage(ctx, args);
  expect(log).toHaveBeenCalledExactlyOnceWith("model_usage", JSON.stringify({
    model: "gpt-5.6-luna", inputTokens: 10, outputTokens: 5, totalTokens: 15,
  }));
  log.mockClear();
  vi.stubEnv("CONVEX_CLOUD_URL", "https://example.convex.cloud");
  logLocalModelUsage(ctx, args);
  expect(log).not.toHaveBeenCalled();
});

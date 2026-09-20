import type { UsageHandler } from "@convex-dev/agent";
import { env } from "../_generated/server";

/** Local acceptance evidence only: never log prompts, source text or credentials. */
export const logLocalModelUsage: UsageHandler = (_ctx, { model, usage }) => {
  if (!env.CONVEX_CLOUD_URL) return;
  const url = new URL(env.CONVEX_CLOUD_URL);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname))
    return;
  console.info("model_usage", JSON.stringify({
    model,
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    totalTokens: usage.totalTokens ?? null,
  }));
};

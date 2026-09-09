import { Agent } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { providerFetch } from "./providerTransport";
import { components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import {
  extractedOfferSchema,
  extractionInstructions,
  validateExtraction,
} from "./extraction";

export async function extractOfferWithAgent(
  ctx: ActionCtx,
  sourceText: string,
  apiKey: string,
  model: string,
) {
  const extractor = new Agent(components.agent, {
    name: "Procurement document extraction",
    languageModel: createOpenAI({ apiKey, fetch: providerFetch })(model),
    instructions: extractionInstructions,
    storageOptions: { saveMessages: "none" },
    contextOptions: { recentMessages: 0, searchOtherThreads: false },
  });
  const result = await extractor.generateObject(
    ctx,
    // Agent requires a scope even for stateless calls. Never share context across runs.
    { userId: `stateless:${crypto.randomUUID()}` },
    {
      prompt: `Fuente web guardada para extraer:\n${JSON.stringify(sourceText)}`,
      schema: extractedOfferSchema,
      maxRetries: 0,
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(30000),
    },
  );
  return validateExtraction(result.object, sourceText);
}

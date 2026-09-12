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
import {
  webAnalysisInstructions,
  webAnalysisSchema,
  validateWebAnalysis,
  webSourceText,
  sourceEvidenceLines,
} from "./webAnalysis";

export async function analyzeWebSourceWithAgent(
  ctx: ActionCtx,
  input: {
    markdown: string;
    ingredient: string;
    title: string;
    url: string;
    contentTruncated: boolean;
  },
  apiKey: string,
  model: string,
) {
  const { markdown: _markdown, ...context } = input;
  const source = webSourceText(input);
  const agent = new Agent(components.agent, {
    name: "Procurement source analysis",
    languageModel: createOpenAI({ apiKey, fetch: providerFetch })(model),
    instructions: webAnalysisInstructions,
    storageOptions: { saveMessages: "none" },
    contextOptions: { recentMessages: 0, searchOtherThreads: false },
  });
  const result = await agent.generateObject(
    ctx,
    { userId: `stateless:${crypto.randomUUID()}` },
    {
      prompt: JSON.stringify({
        ...context,
        evidenceLines: sourceEvidenceLines(source).map((text, index) => ({
          line: index + 1,
          text,
        })),
      }),
      schema: webAnalysisSchema,
      maxRetries: 0,
      maxOutputTokens: 2600,
      abortSignal: AbortSignal.timeout(30000),
    },
  );
  return validateWebAnalysis(result.object, source);
}

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
      prompt: `Saved web source to extract:\n${JSON.stringify(sourceText)}`,
      schema: extractedOfferSchema,
      maxRetries: 0,
      maxOutputTokens: 2000,
      abortSignal: AbortSignal.timeout(30000),
    },
  );
  return validateExtraction(result.object, sourceText);
}

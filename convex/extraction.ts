import { Agent } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { v } from "convex/values";
import { env, internalAction } from "./_generated/server";
import { components } from "./_generated/api";
import { extractionSource } from "../fixtures/extraction";
import {
  extractedOfferSchema,
  extractionInstructions,
  validateExtraction,
} from "./lib/extraction";

const field = v.object({
  value: v.union(v.string(), v.null()),
  evidence: v.union(v.string(), v.null()),
});
/** Synthetic-only operator probe. No anonymous uploads, public LLM calls, or stored messages. */
export const probe = internalAction({
  args: { example: v.union(v.literal("ambiguous"), v.literal("clear")) },
  returns: v.object({
    sourceText: v.string(),
    model: v.string(),
    offer: v.object({
      supplier: field,
      ingredient: field,
      specification: field,
      packageContent: field,
      packageUnit: field,
      price: field,
      currency: field,
    }),
  }),
  handler: async (ctx, { example }) => {
    const key = env.OPENAI_API_KEY;
    const model = env.OPENAI_EXTRACTION_MODEL;
    if (!key?.trim() || !model?.trim())
      throw new Error(
        "Configura OPENAI_API_KEY y OPENAI_EXTRACTION_MODEL en Convex para probar la extracción.",
      );
    const sourceText =
      example === "ambiguous"
        ? extractionSource.text
        : "Distribuidora de ejemplo\nArroz blanco extra\nSaco de 18 kg: PEN 80.00";
    const extractor = new Agent(components.agent, {
      name: "Procurement document extraction",
      languageModel: createOpenAI({ apiKey: key })(model),
      instructions: extractionInstructions,
      storageOptions: { saveMessages: "none" },
    });
    try {
      const result = await extractor.generateObject(
        ctx,
        {},
        {
          prompt: `Documento de ejemplo para extraer:\n${JSON.stringify(sourceText)}`,
          schema: extractedOfferSchema,
          maxRetries: 0,
          maxOutputTokens: 2000,
          abortSignal: AbortSignal.timeout(30000),
        },
      );
      return {
        sourceText,
        model,
        offer: validateExtraction(result.object, sourceText),
      };
    } catch {
      throw new Error(
        "No se obtuvo una extracción verificable. Revisa configuración, disponibilidad y respuesta del modelo. No se reintenta automáticamente.",
      );
    }
  },
});

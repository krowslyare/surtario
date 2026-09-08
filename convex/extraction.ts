import { v } from "convex/values";
import { env, internalAction } from "./_generated/server";
import { extractionSource } from "../fixtures/extraction";
import { extractOfferWithAgent } from "./lib/agentExtraction";

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
    try {
      return {
        sourceText,
        model,
        offer: await extractOfferWithAgent(ctx, sourceText, key, model),
      };
    } catch {
      throw new Error(
        "No se obtuvo una extracción verificable. Revisa configuración, disponibilidad y respuesta del modelo. No se reintenta automáticamente.",
      );
    }
  },
});

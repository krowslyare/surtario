import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { PurchaseSeed } from "../../src/domain/market";
import {
  extractionFields,
  extractionToPurchase,
  type ReviewedValues,
} from "../../src/domain/extraction";
import { inspectSource } from "./sourceQuality";
import { webSourceText } from "./webAnalysis";

export type WebReview = {
  runId: Doc<"researchRuns">["_id"];
  sourceIndex: number;
  values: ReviewedValues;
  confirmed: true;
};

export async function reconstructWebReview(
  ctx: MutationCtx,
  owner: string,
  review: WebReview,
): Promise<PurchaseSeed> {
  if (
    !Number.isSafeInteger(review.sourceIndex) ||
    review.sourceIndex < 0 ||
    extractionFields.some((key) => review.values[key].length > 120)
  )
    throw new ConvexError("Revisión web no válida.");
  const ref = `${review.runId}:${review.sourceIndex}`;
  const run = await ctx.db.get("researchRuns", review.runId);
  if (!run || run.ownerHash !== owner)
    throw new ConvexError("Búsqueda no disponible en esta sesión.");
  if (run.status !== "complete")
    throw new ConvexError("La búsqueda todavía no está completa.");
  const source = run.sources[review.sourceIndex];
  if (!source) throw new ConvexError("Fuente no válida.");
  if (
    inspectSource(source, run.ingredient).state !== "readable" ||
    (source.parentSourceIndex !== undefined && source.readStatus !== "complete")
  )
    throw new ConvexError(
      "La fuente no contiene evidencia utilizable para comparar.",
    );
  if (source.analysis && source.analysis.kind !== "product")
    throw new ConvexError(
      "Selecciona y revisa una ficha de producto antes de compararla.",
    );
  if (
    source.extractionStatus !== "complete" ||
    !source.extraction ||
    !source.markdown
  )
    throw new ConvexError("La extracción de esta fuente no está completa.");
  try {
    const seed = extractionToPurchase(
      {
        id: ref,
        url: source.url,
        title: source.title,
        text: source.analysis
          ? `${webSourceText({ title: source.title, markdown: source.markdown })}\n\nAnálisis propuesto de la fuente (requiere revisión): ${source.analysis.summary}\n${source.analysis.warnings.join("\n")}`
          : source.markdown,
        observedAt: source.observedAt ?? run.observedAt,
        simulated: run.simulated ?? false,
      },
      source.extraction,
      review.values,
      review.confirmed,
    );
    seed.sources[ref].webReview = { ...review };
    return seed;
  } catch (error) {
    throw new ConvexError(
      error instanceof Error ? error.message : "Revisión web no válida.",
    );
  }
}

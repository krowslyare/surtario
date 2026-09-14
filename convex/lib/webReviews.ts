import { reviewedWebEvidence } from "../../src/domain/webEvidence";
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
    throw new ConvexError("Invalid web review.");
  const ref = `${review.runId}:${review.sourceIndex}`;
  const run = await ctx.db.get("researchRuns", review.runId);
  if (!run || run.ownerHash !== owner)
    throw new ConvexError("Search unavailable in this session.");
  if (run.status !== "complete")
    throw new ConvexError("The search is not complete yet.");
  const source = run.sources[review.sourceIndex];
  if (!source) throw new ConvexError("Invalid source.");
  if (
    inspectSource(source, run.ingredient).state !== "readable" ||
    (source.parentSourceIndex !== undefined && source.readStatus !== "complete")
  )
    throw new ConvexError(
      "The source contains no usable evidence for comparison.",
    );
  if (source.analysis && source.analysis.kind !== "product")
    throw new ConvexError(
      "Select and review a product listing before comparing it.",
    );
  if (
    source.extractionStatus !== "complete" ||
    !source.extraction ||
    !source.markdown
  )
    throw new ConvexError("Extraction for this source is incomplete.");
  try {
    const seed = extractionToPurchase(
      {
        id: ref,
        url: source.url,
        title: source.title,
        text: reviewedWebEvidence(source),
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
      error instanceof Error ? error.message : "Invalid web review.",
    );
  }
}

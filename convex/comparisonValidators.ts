import { v } from "convex/values";
import {
  procurementRequestValidator,
  supplierOfferValidator,
} from "./validators";
import { extractedOfferValidator } from "./researchValidators";

export const reviewedValuesValidator = v.object({
  supplier: v.string(),
  ingredient: v.string(),
  specification: v.string(),
  packageContent: v.string(),
  packageUnit: v.string(),
  price: v.string(),
  currency: v.string(),
});

export const webReviewValidator = v.object({
  runId: v.string(),
  sourceIndex: v.number(),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});

export const webReviewInputValidator = v.object({
  runId: v.id("researchRuns"),
  sourceIndex: v.number(),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});

export const documentReviewInputValidator = v.object({
  runId: v.id("documentRuns"),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});
export const documentReviewValidator = v.object({
  runId: v.string(),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});
export const replyReviewInputValidator = v.object({
  requestId: v.id("quotationRequests"),
  messageId: v.string(),
  extractionAttempt: v.optional(v.number()),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});
export const replyReviewValidator = v.object({
  requestId: v.string(),
  messageId: v.string(),
  extractionAttempt: v.optional(v.number()),
  values: reviewedValuesValidator,
  confirmed: v.literal(true),
});
export const comparisonContent = {
  request: procurementRequestValidator,
  offers: v.array(supplierOfferValidator),
  sources: v.record(
    v.string(),
    v.object({
      label: v.string(),
      date: v.string(),
      original: supplierOfferValidator,
      edited: v.boolean(),
      extraction: v.optional(
        v.object({
          proposed: extractedOfferValidator,
          reviewed: reviewedValuesValidator,
        }),
      ),
      webReview: v.optional(webReviewValidator),
      documentReview: v.optional(documentReviewValidator),
      replyReview: v.optional(replyReviewValidator),
      marketSource: v.optional(
        v.object({
          title: v.string(),
          url: v.union(v.string(), v.null()),
          observedAt: v.string(),
          publishedAt: v.union(v.string(), v.null()),
          evidence: v.string(),
          simulated: v.boolean(),
        }),
      ),
    }),
  ),
  selectedOfferId: v.union(v.string(), v.null()),
  revision: v.number(),
  updatedAt: v.number(),
};
export const savedComparisonValidator = v.object({
  id: v.id("comparisons"),
  ...comparisonContent,
});

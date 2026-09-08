import { v, type Infer } from "convex/values";

export const extractedFieldValidator = v.object({
  value: v.union(v.string(), v.null()),
  evidence: v.union(v.string(), v.null()),
});

export const extractedOfferValidator = v.object({
  supplier: extractedFieldValidator,
  ingredient: extractedFieldValidator,
  specification: extractedFieldValidator,
  packageContent: extractedFieldValidator,
  packageUnit: extractedFieldValidator,
  price: extractedFieldValidator,
  currency: extractedFieldValidator,
});

export const researchStatusValidator = v.union(
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
);

export const extractionStatusValidator = v.union(
  v.literal("idle"),
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
);

export const savedResearchSourceValidator = v.object({
  url: v.string(),
  title: v.string(),
  description: v.string(),
  markdown: v.union(v.string(), v.null()),
  contentTruncated: v.boolean(),
  extraction: v.union(extractedOfferValidator, v.null()),
  extractionStatus: extractionStatusValidator,
  extractionError: v.union(v.string(), v.null()),
});

export const savedResearchValidator = v.object({
  id: v.id("researchRuns"),
  ingredient: v.string(),
  region: v.string(),
  observedAt: v.string(),
  status: researchStatusValidator,
  error: v.union(v.string(), v.null()),
  sources: v.array(savedResearchSourceValidator),
  discarded: v.number(),
  warning: v.boolean(),
});

export type ExtractedOffer = Infer<typeof extractedOfferValidator>;
export type SavedResearch = Infer<typeof savedResearchValidator>;

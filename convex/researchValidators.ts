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

export const sourceAnalysisValidator = v.object({
  kind: v.union(
    v.literal("product"),
    v.literal("catalog"),
    v.literal("contact"),
    v.literal("irrelevant"),
    v.literal("uncertain"),
  ),
  summary: v.string(),
  evidence: v.array(v.string()),
  warnings: v.array(v.string()),
});
export const sourceInspectionValidator = v.object({
  state: v.union(
    v.literal("readable"),
    v.literal("unreadable"),
    v.literal("blocked"),
    v.literal("unrelated"),
  ),
  reason: v.union(v.string(), v.null()),
  links: v.array(v.object({ url: v.string(), label: v.string() })),
});
export const sourceExtensionFields = {
  analysis: v.optional(sourceAnalysisValidator),
  parentSourceIndex: v.optional(v.number()),
  observedAt: v.optional(v.string()),
  readStatus: v.optional(researchStatusValidator),
  readError: v.optional(v.union(v.string(), v.null())),
};

export const savedResearchSourceValidator = v.object({
  ...sourceExtensionFields,
  inspection: v.optional(sourceInspectionValidator),
  url: v.string(),
  title: v.string(),
  description: v.string(),
  markdown: v.union(v.string(), v.null()),
  contentTruncated: v.boolean(),
  extraction: v.union(extractedOfferValidator, v.null()),
  extractionStatus: extractionStatusValidator,
  extractionError: v.union(v.string(), v.null()),
});

export const researchProgressValidator = v.object({
  stage: v.union(v.literal("searching"), v.literal("reading"), v.literal("reviewing")),
  reviewsCompleted: v.optional(v.number()),
  reviewsTotal: v.optional(v.number()),
  searchesCompleted: v.number(),
  searchesTotal: v.number(),
  candidates: v.number(),
  pagesChecked: v.number(),
  currentHost: v.union(v.string(), v.null()),
});
export type ResearchProgress = Infer<typeof researchProgressValidator>;

export const savedResearchValidator = v.object({
  studyId: v.optional(v.id("studies")),
  clientId: v.optional(v.string()),
  progress: v.optional(researchProgressValidator),
  id: v.id("researchRuns"),
  simulated: v.boolean(),
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

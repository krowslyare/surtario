import { v } from "convex/values";
import {
  extractedOfferValidator,
  sourceAnalysisValidator,
} from "./researchValidators";
export const caseFields = {
  studyId: v.optional(v.id("studies")),
  comparisonId: v.optional(v.id("comparisons")),
  ingredient: v.string(),
  region: v.string(),
  objective: v.string(),
  status: v.union(
    v.literal("idle"),
    v.literal("running"),
    v.literal("complete"),
    v.literal("failed"),
    v.literal("canceled"),
  ),
  revision: v.number(),
  steps: v.number(),
  researchRunIds: v.array(v.id("researchRuns")),
  summary: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
};
export const caseView = v.object({ id: v.id("sourcingCases"), ...caseFields });
export const eventFields = {
  caseId: v.id("sourcingCases"),
  eventKey: v.string(),
  kind: v.string(),
  summary: v.string(),
  createdAt: v.number(),
  sourceId: v.optional(v.string()),
  query: v.optional(v.string()),
  url: v.optional(v.string()),
  researchRunId: v.optional(v.id("researchRuns")),
  proposal: v.optional(extractedOfferValidator),
};
export const eventView = v.object({
  id: v.id("sourcingEvents"),
  ...eventFields,
});
export const watchFields = {
  caseId: v.id("sourcingCases"),
  resultId: v.string(),
  url: v.string(),
  title: v.string(),
  baseline: v.string(),
  lastObservation: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("checking"),
    v.literal("stopped"),
    v.literal("expired"),
  ),
  nextCheckAt: v.number(),
  expiresAt: v.number(),
  checks: v.number(),
  revision: v.number(),
  lastOutcome: v.union(
    v.literal("pending"),
    v.literal("unchanged"),
    v.literal("changed"),
    v.literal("unverified"),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
};
export const watchView = v.object({
  id: v.id("sourceWatches"),
  ...watchFields,
});
export const candidate = v.object({
  url: v.string(),
  title: v.string(),
  description: v.string(),
  markdown: v.union(v.string(), v.null()),
  contentTruncated: v.boolean(),
  analysis: v.optional(sourceAnalysisValidator),
  extraction: v.union(extractedOfferValidator, v.null()),
  extractionStatus: v.union(
    v.literal("idle"),
    v.literal("complete"),
    v.literal("failed"),
  ),
  extractionError: v.union(v.string(), v.null()),
  extractionAttempts: v.number(),
});
export const planValidator = v.object({
  action: v.union(v.literal("search"), v.literal("read"), v.literal("stop")),
  query: v.string(),
  url: v.string(),
  reason: v.string(),
});

import { v } from "convex/values";
import { comparisonContent } from "./comparisonValidators";
export const advisorContext = v.object({
  priority: v.union(
    v.literal("cash"),
    v.literal("unit_price"),
    v.literal("balanced"),
  ),
  budgetCents: v.union(v.number(), v.null()),
  dailyUsage: v.union(v.number(), v.null()),
  stockQuantity: v.union(v.number(), v.null()),
  maxCoverageDays: v.union(v.number(), v.null()),
  preferredOfferId: v.union(v.string(), v.null()),
});
export const advisorReport = v.object({
  alternatives: v.array(
    v.object({
      offerId: v.string(),
      supplier: v.string(),
      totalCents: v.union(v.number(), v.null()),
      unitPriceCents: v.union(v.number(), v.null()),
      excessQuantity: v.union(v.number(), v.null()),
      coverageDays: v.union(v.number(), v.null()),
      affordable: v.union(v.boolean(), v.null()),
      eligible: v.boolean(),
      warnings: v.array(v.string()),
    }),
  ),
  recommendedOfferId: v.union(v.string(), v.null()),
  action: v.union(
    v.literal("buy"),
    v.literal("negotiate"),
    v.literal("clarify"),
    v.literal("research"),
  ),
  recommendation: v.string(),
  impact: v.string(),
  warning: v.string(),
  negotiationDraft: v.union(v.string(), v.null()),
  missing: v.array(v.string()),
});
export const advisorNarrative = v.object({
  reasoning: v.string(),
  questions: v.array(v.string()),
  sourceIds: v.array(v.string()),
});
export const advisorRunContent = {
  comparisonId: v.id("comparisons"),
  comparisonRevision: v.number(),
  context: advisorContext,
  snapshot: v.object(comparisonContent),
  report: advisorReport,
  status: v.union(
    v.literal("calculated"),
    v.literal("running"),
    v.literal("complete"),
    v.literal("failed"),
  ),
  narrative: v.union(advisorNarrative, v.null()),
  error: v.union(v.string(), v.null()),
  createdAt: v.number(),
  toolCalls: v.array(v.string()),
};
export const savedAdvisorRun = v.object({
  id: v.id("advisorRuns"),
  ...advisorRunContent,
});

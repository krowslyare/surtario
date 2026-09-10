import { v } from "convex/values";
export const prospectContent = {
  runId: v.id("researchRuns"),
  sourceIndex: v.number(),
  supplier: v.string(),
  contact: v.union(v.string(), v.null()),
  ingredient: v.string(),
  region: v.string(),
  sourceTitle: v.string(),
  sourceUrl: v.string(),
  observedAt: v.string(),
  createdAt: v.number(),
  simulated: v.optional(v.boolean()),
};
export const savedProspect = v.object({
  id: v.id("webProspects"),
  ...prospectContent,
});

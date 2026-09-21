import { v } from "convex/values";
export const listRow = v.object({
  id: v.string(),
  ingredient: v.string(),
  original: v.string(),
  reference: v.string(),
  needsReview: v.boolean(),
  documentHash: v.optional(v.string()),
});
export const batchRow = v.object({
  ...listRow.fields,
  caseId: v.id("sourcingCases"),
  state: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("settled"),
  ),
});
export const batchFields = {
  clientId: v.string(),
  title: v.string(),
  region: v.string(),
  sourceKind: v.string(),
  rows: v.array(batchRow),
  active: v.boolean(),
  generation: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
};
export const extractionFields = {
  contentHash: v.string(),
  clientId: v.string(),
  status: v.union(
    v.literal("running"),
    v.literal("complete"),
    v.literal("failed"),
  ),
  rows: v.array(listRow),
  error: v.union(v.string(), v.null()),
  createdAt: v.number(),
};

import { v } from "convex/values";

export const quotationReplyValidator = v.object({
  messageId: v.string(),
  text: v.string(),
  receivedAt: v.string(),
});

export const savedQuotationValidator = v.object({
  id: v.id("quotationRequests"),
  comparisonId: v.id("comparisons"),
  subject: v.string(),
  text: v.string(),
  recipient: v.union(v.string(), v.null()),
  state: v.union(
    v.literal("draft"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("uncertain"),
    v.literal("failed"),
  ),
  revision: v.number(),
  receipt: v.union(
    v.object({ messageId: v.string(), threadId: v.string() }),
    v.null(),
  ),
  failure: v.union(v.string(), v.null()),
  replies: v.array(quotationReplyValidator),
  createdAt: v.number(),
});

export type SavedQuotation = typeof savedQuotationValidator.type;

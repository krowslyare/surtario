import { v } from "convex/values";
import {
  extractedOfferValidator,
  extractionStatusValidator,
} from "./researchValidators";

export const quotationReplyValidator = v.object({
  messageId: v.string(),
  text: v.string(),
  receivedAt: v.string(),
  extraction: v.union(extractedOfferValidator, v.null()),
  extractionStatus: extractionStatusValidator,
  extractionError: v.union(v.string(), v.null()),
  extractionAttempts: v.number(),
  extractionAttempt: v.union(v.number(), v.null()),
});

export const savedQuotationValidator = v.object({
  id: v.id("quotationRequests"),
  simulated: v.boolean(),
  comparisonId: v.optional(v.id("comparisons")),
  studyId: v.optional(v.id("studies")),
  prospectId: v.optional(v.id("webProspects")),
  resultId: v.optional(v.string()),
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
export type QuotationReply = typeof quotationReplyValidator.type;

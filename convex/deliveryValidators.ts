import { v } from "convex/values";
import { advisorContext, advisorReport } from "./advisorValidators";

export const deliveryConfirmationFields = {
  currency: v.optional(v.union(v.literal("USD"), v.literal("PEN"))),
  ingredient: v.optional(v.string()),
  previousMinimumPackages: v.optional(v.union(v.number(), v.null())),
  requestId: v.id("quotationRequests"),
  messageId: v.string(),
  comparisonId: v.id("comparisons"),
  offerId: v.string(),
  freightCents: v.union(v.number(), v.null()),
  minimumPackages: v.optional(v.number()),
  evidenceQuote: v.string(),
  receivedAt: v.string(),
  context: advisorContext,
  before: advisorReport,
  after: advisorReport,
  comparisonRevision: v.number(),
  createdAt: v.number(),
};
export const savedDeliveryConfirmation = v.object({
  id: v.id("deliveryConfirmations"),
  ...deliveryConfirmationFields,
});

import { v } from "convex/values";
import { advisorContext, advisorReport } from "./advisorValidators";

export const deliveryConfirmationFields = {
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

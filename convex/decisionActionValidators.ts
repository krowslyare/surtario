import { v } from "convex/values";
import { advisorContext } from "./advisorValidators";
export const decisionActionKind = v.union(v.literal("delivery"), v.literal("minimum"));
export const decisionActionInput = v.object({ kind: decisionActionKind, offerId: v.string(), expectedRevision: v.number(), context: advisorContext });
export const decisionActionSnapshot = v.object({
  kind: decisionActionKind, offerId: v.string(), comparisonRevision: v.number(), context: advisorContext,
  reason: v.string(), evidenceOfferIds: v.array(v.string()), proposedMinimumPackages: v.optional(v.number()),
});

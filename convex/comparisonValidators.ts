import { v } from "convex/values";
import {
  procurementRequestValidator,
  supplierOfferValidator,
} from "./validators";

export const comparisonContent = {
  request: procurementRequestValidator,
  offers: v.array(supplierOfferValidator),
  sources: v.record(
    v.string(),
    v.object({
      label: v.string(),
      date: v.string(),
      original: supplierOfferValidator,
      edited: v.boolean(),
      marketSource: v.optional(
        v.object({
          title: v.string(),
          url: v.union(v.string(), v.null()),
          observedAt: v.string(),
          publishedAt: v.union(v.string(), v.null()),
          evidence: v.string(),
          simulated: v.boolean(),
        }),
      ),
    }),
  ),
  selectedOfferId: v.union(v.string(), v.null()),
  revision: v.number(),
  updatedAt: v.number(),
};
export const savedComparisonValidator = v.object({
  id: v.id("comparisons"),
  ...comparisonContent,
});

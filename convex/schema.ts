import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { comparisonContent } from "./comparisonValidators";
import { studyContent } from "./studyValidators";
import {
  extractedOfferValidator,
  extractionStatusValidator,
  researchStatusValidator,
} from "./researchValidators";

export default defineSchema({
  comparisons: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ...comparisonContent,
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
  // Demo-only capability ownership. Raw browser secrets are never stored or returned.
  studies: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ...studyContent,
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
  researchRuns: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ingredient: v.string(),
    region: v.string(),
    observedAt: v.string(),
    createdAt: v.number(),
    status: researchStatusValidator,
    error: v.union(v.string(), v.null()),
    sources: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        description: v.string(),
        markdown: v.union(v.string(), v.null()),
        contentTruncated: v.boolean(),
        extraction: v.union(extractedOfferValidator, v.null()),
        extractionStatus: extractionStatusValidator,
        extractionError: v.union(v.string(), v.null()),
        extractionAttempts: v.number(),
      }),
    ),
    discarded: v.number(),
    warning: v.boolean(),
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { studyContent } from "./studyValidators";

export default defineSchema({
  // Demo-only capability ownership. Raw browser secrets are never stored or returned.
  studies: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ...studyContent,
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
});

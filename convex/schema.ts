import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { comparisonContent } from "./comparisonValidators";
import { studyContent } from "./studyValidators";
import {
  extractedOfferValidator,
  extractionStatusValidator,
  researchStatusValidator,
  sourceExtensionFields,
} from "./researchValidators";

import { documentKind, documentResult } from "./documentValidators";
import { prospectContent } from "./prospectValidators";
import { advisorRunContent } from "./advisorValidators";
import { caseFields, eventFields, watchFields } from "./sourcingValidators";
export default defineSchema({
  sourcingCases: defineTable({
    ownerHash: v.string(),
    ...caseFields,
    workflowId: v.optional(v.string()),
    runs: v.number(),
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_studyId", ["studyId"])
    .index("by_comparisonId", ["comparisonId"]),
  sourcingEvents: defineTable(eventFields)
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_eventKey", ["caseId", "eventKey"]),
  sourceWatches: defineTable(watchFields)
    .index("by_caseId", ["caseId"])
    .index("by_caseId_and_resultId", ["caseId", "resultId"])
    .index("by_status_and_nextCheckAt", ["status", "nextCheckAt"]),
  ingredientLists: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ingredients: v.array(v.string()),
    sourceKind: v.union(v.literal("manual"), v.literal("spreadsheet")),
    updatedAt: v.number(),
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
  advisorRuns: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    ...advisorRunContent,
  })
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"])
    .index("by_comparisonId", ["comparisonId"]),
  webProspects: defineTable({ ownerHash: v.string(), ...prospectContent })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_runId_and_sourceIndex", [
      "ownerHash",
      "runId",
      "sourceIndex",
    ]),
  documentRuns: defineTable({
    ownerHash: v.string(),
    clientId: v.string(),
    kind: documentKind,
    createdAt: v.number(),
    status: researchStatusValidator,
    result: v.union(documentResult, v.null()),
    error: v.union(v.string(), v.null()),
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"]),
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
    simulated: v.optional(v.boolean()),
    ingredient: v.string(),
    region: v.string(),
    observedAt: v.string(),
    createdAt: v.number(),
    status: researchStatusValidator,
    error: v.union(v.string(), v.null()),
    sources: v.array(
      v.object({
        ...sourceExtensionFields,
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
  quotationRequests: defineTable({
    aiDraftStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("complete"),
        v.literal("failed"),
      ),
    ),
    aiDraftAttempts: v.optional(v.number()),
    aiDraftSubject: v.optional(v.string()),
    aiDraftText: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    approvedRevision: v.optional(v.number()),
    ownerHash: v.string(),
    clientId: v.string(),
    simulated: v.optional(v.boolean()),
    comparisonId: v.optional(v.id("comparisons")),
    studyId: v.optional(v.id("studies")),
    prospectId: v.optional(v.id("webProspects")),
    resultId: v.optional(v.string()),
    recipient: v.union(v.string(), v.null()),
    inboxId: v.union(v.string(), v.null()),
    subject: v.string(),
    text: v.string(),
    state: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("uncertain"),
      v.literal("failed"),
    ),
    revision: v.number(),
    idempotencyKey: v.string(),
    receipt: v.union(
      v.object({ messageId: v.string(), threadId: v.string() }),
      v.null(),
    ),
    failure: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerHash", ["ownerHash"])
    .index("by_ownerHash_and_clientId", ["ownerHash", "clientId"])
    .index("by_state", ["state"])
    .index("by_inboxId_and_receipt_messageId", ["inboxId", "receipt.messageId"])
    .index("by_inboxId_and_receipt_threadId", ["inboxId", "receipt.threadId"]),
  quotationReplies: defineTable({
    requestId: v.id("quotationRequests"),
    eventId: v.string(),
    messageId: v.string(),
    threadId: v.string(),
    from: v.string(),
    text: v.string(),
    receivedAt: v.string(),
    // Optional while existing replies migrate; public reads expose explicit defaults.
    extraction: v.optional(v.union(extractedOfferValidator, v.null())),
    extractionStatus: v.optional(extractionStatusValidator),
    extractionError: v.optional(v.union(v.string(), v.null())),
    extractionAttempts: v.optional(v.number()),
    extractionAttempt: v.optional(v.union(v.number(), v.null())),
  })
    .index("by_requestId", ["requestId"])
    .index("by_eventId", ["eventId"])
    .index("by_messageId", ["messageId"]),
  quotationUnmatchedEvents: defineTable({
    eventId: v.string(),
    messageId: v.string(),
    inboxId: v.string(),
    threadId: v.string(),
    from: v.string(),
    text: v.string(),
    receivedAt: v.string(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_messageId", ["messageId"]),
});

import { ConvexError, v } from "convex/values";
import {
  providerFetch,
  providerRehearsalEnabled,
} from "./lib/providerTransport";
import {
  action,
  env,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ownerHash } from "./lib/demoSession";
import { extractReplyOfferWithAgent } from "./lib/replyExtraction";
import {
  quotationReplyValidator,
  savedQuotationValidator,
  type QuotationReply,
  type SavedQuotation,
} from "./quotationValidators";
import {
  extractedOfferValidator,
  type ExtractedOffer,
} from "./researchValidators";

const MAX_PER_SESSION = 10;
const MAX_GLOBAL = 100;
const MAX_REPLIES = 10;
const MAX_RECOVERY_ITEMS = 100;
const COOLDOWN_MS = 30_000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEND_FAILED =
  "AgentMail rejected the send. Create a new request to try again.";
const SEND_UNCERTAIN =
  "The send result could not be confirmed. It will not retry automatically.";
const REPLY_EXTRACTION_ERROR =
  "No verifiable suggestion was produced. Complete the fields manually or try once more.";

function normalizedSender(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .match(/<([^>]+)>$/)?.[1] ?? value.trim().toLowerCase()
  );
}

function assertProviderId(value: string, maximum: number) {
  if (value.length === 0 || value.length > maximum)
    throw new ConvexError("Provider identifier is invalid.");
}

function configured() {
  const recipient = env.AGENTMAIL_TEST_RECIPIENT?.trim().toLowerCase() || null;
  const inboxId = env.AGENTMAIL_INBOX_ID?.trim() || null;
  return {
    enabled:
      env.AGENTMAIL_ENABLED === "true" &&
      !!env.AGENTMAIL_API_KEY?.trim() &&
      !!inboxId &&
      !!recipient,
    recipient,
    inboxId,
  };
}

function replyExtractorConfigured() {
  return (
    env.REPLY_EXTRACTION_ENABLED === "true" &&
    !!env.OPENAI_API_KEY?.trim() &&
    !!env.OPENAI_EXTRACTION_MODEL?.trim()
  );
}

function publicReply(doc: Doc<"quotationReplies">): QuotationReply {
  return {
    messageId: doc.messageId,
    text: doc.text,
    receivedAt: doc.receivedAt,
    extraction: doc.extraction ?? null,
    extractionStatus: doc.extractionStatus ?? "idle",
    extractionError: doc.extractionError ?? null,
    extractionAttempts: doc.extractionAttempts ?? 0,
    extractionAttempt: doc.extractionAttempt ?? null,
  };
}

async function publicRequest(
  ctx: QueryCtx | MutationCtx,
  doc: Doc<"quotationRequests">,
): Promise<SavedQuotation> {
  const replies = await ctx.db
    .query("quotationReplies")
    .withIndex("by_requestId", (q) => q.eq("requestId", doc._id))
    .order("desc")
    .take(MAX_REPLIES);
  return {
    id: doc._id,
    simulated: doc.simulated ?? false,
    ...(doc.comparisonId ? { comparisonId: doc.comparisonId } : {}),
    ...(doc.studyId ? { studyId: doc.studyId, resultId: doc.resultId } : {}),
    ...(doc.prospectId ? { prospectId: doc.prospectId } : {}),
    subject: doc.subject,
    text: doc.text,
    recipient: doc.recipient,
    state: doc.state,
    revision: doc.revision,
    receipt: doc.receipt,
    failure: doc.failure,
    createdAt: doc.createdAt,
    replies: replies.map(publicReply),
  };
}

export const status = query({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    recipient: v.union(v.string(), v.null()),
    extractionEnabled: v.boolean(),
  }),
  handler: async () => {
    const value = configured();
    return {
      enabled: value.enabled,
      recipient: value.recipient,
      extractionEnabled: replyExtractorConfigured(),
    };
  },
});

export const list = query({
  args: { token: v.string() },
  returns: v.array(savedQuotationValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const docs = await ctx.db
      .query("quotationRequests")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    return await Promise.all(docs.map((doc) => publicRequest(ctx, doc)));
  },
});

const replyExtractionReservation = v.union(
  v.object({ kind: v.literal("complete"), reply: quotationReplyValidator }),
  v.object({ kind: v.literal("running") }),
  v.object({
    kind: v.literal("reserved"),
    replyId: v.id("quotationReplies"),
    text: v.string(),
    attempt: v.number(),
  }),
);

export const reserveReplyExtraction = internalMutation({
  args: {
    token: v.string(),
    requestId: v.id("quotationRequests"),
    messageId: v.string(),
  },
  returns: replyExtractionReservation,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!args.messageId || args.messageId.length > 500)
      throw new ConvexError("Invalid reply.");
    const request = await ctx.db.get(args.requestId);
    if (!request || request.ownerHash !== hash)
      throw new ConvexError("Request unavailable in this session.");
    const reply = await ctx.db
      .query("quotationReplies")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (!reply || reply.requestId !== request._id)
      throw new ConvexError("Reply not linked to this request.");
    const status = reply.extractionStatus ?? "idle";
    const attempts = reply.extractionAttempts ?? 0;
    if (!Number.isSafeInteger(attempts) || attempts < 0)
      throw new Error("Invalid reply extraction state.");
    if (status === "complete" && reply.extraction)
      return { kind: "complete" as const, reply: publicReply(reply) };
    if (status === "running") return { kind: "running" as const };
    if (attempts >= 2)
      throw new ConvexError(
        "This reply reached the two-attempt limit. Complete the fields manually.",
      );
    await ctx.db.patch(reply._id, {
      extraction: null,
      extractionStatus: "running",
      extractionError: null,
      extractionAttempts: attempts + 1,
      extractionAttempt: null,
    });
    return {
      kind: "reserved" as const,
      replyId: reply._id,
      text: reply.text,
      attempt: attempts + 1,
    };
  },
});

export const finishReplyExtraction = internalMutation({
  args: {
    replyId: v.id("quotationReplies"),
    attempt: v.number(),
    offer: extractedOfferValidator,
  },
  returns: quotationReplyValidator,
  handler: async (ctx, { replyId, attempt, offer }) => {
    const reply = await ctx.db.get(replyId);
    if (
      !reply ||
      reply.extractionStatus !== "running" ||
      reply.extractionAttempts !== attempt
    )
      throw new Error("Missing reserved reply extraction.");
    await ctx.db.patch(replyId, {
      extraction: offer,
      extractionStatus: "complete",
      extractionError: null,
      extractionAttempt: attempt,
    });
    return publicReply((await ctx.db.get(replyId))!);
  },
});

export const failReplyExtraction = internalMutation({
  args: { replyId: v.id("quotationReplies") },
  returns: quotationReplyValidator,
  handler: async (ctx, { replyId }) => {
    const reply = await ctx.db.get(replyId);
    if (!reply) throw new Error("Missing reserved reply extraction.");
    if (reply.extractionStatus === "running")
      await ctx.db.patch(replyId, {
        extraction: null,
        extractionStatus: "failed",
        extractionError:
          (reply.extractionAttempts ?? 0) >= 2
            ? "No verifiable suggestion was produced in two attempts. Complete the fields manually."
            : REPLY_EXTRACTION_ERROR,
      });
    return publicReply((await ctx.db.get(replyId))!);
  },
});

export const extractReply = action({
  args: {
    token: v.string(),
    requestId: v.id("quotationRequests"),
    messageId: v.string(),
  },
  returns: quotationReplyValidator,
  handler: async (ctx, args): Promise<QuotationReply> => {
    if (!replyExtractorConfigured())
      throw new ConvexError("Reply extraction is not enabled.");
    const reservation:
      | { kind: "complete"; reply: QuotationReply }
      | { kind: "running" }
      | {
          kind: "reserved";
          replyId: Id<"quotationReplies">;
          text: string;
          attempt: number;
        } = await ctx.runMutation(
      internal.quotationMail.reserveReplyExtraction,
      args,
    );
    if (reservation.kind === "complete") return reservation.reply;
    if (reservation.kind === "running")
      throw new ConvexError(
        "Extraction for this reply is already running or requires operator review.",
      );
    let offer: ExtractedOffer;
    try {
      offer = await extractReplyOfferWithAgent(
        ctx,
        reservation.text,
        env.OPENAI_API_KEY!,
        env.OPENAI_EXTRACTION_MODEL!,
      );
    } catch {
      return await ctx.runMutation(internal.quotationMail.failReplyExtraction, {
        replyId: reservation.replyId,
      });
    }
    // If persistence is uncertain, keep the paid reservation running so a retry
    // cannot issue a second provider call.
    try {
      return await ctx.runMutation(
        internal.quotationMail.finishReplyExtraction,
        {
          replyId: reservation.replyId,
          attempt: reservation.attempt,
          offer,
        },
      );
    } catch {
      throw new ConvexError(
        "Extraction returned, but saving was not confirmed. Do not repeat the call; operator review is required.",
      );
    }
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    comparisonId: v.optional(v.id("comparisons")),
    studyId: v.optional(v.id("studies")),
    prospectId: v.optional(v.id("webProspects")),
    resultId: v.optional(v.string()),
    clientId: v.string(),
  },
  returns: savedQuotationValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!UUID.test(args.clientId))
      throw new ConvexError("Invalid request.");
    if (
      [args.comparisonId, args.studyId, args.prospectId].filter(Boolean)
        .length !== 1 ||
      (!args.studyId && args.resultId !== undefined)
    )
      throw new ConvexError(
        "Choose one source: comparison, study, or web candidate.",
      );
    const comparison = args.comparisonId
      ? await ctx.db.get(args.comparisonId)
      : null;
    const study = args.studyId ? await ctx.db.get(args.studyId) : null;
    if (args.comparisonId && (!comparison || comparison.ownerHash !== hash))
      throw new ConvexError("Comparison unavailable in this session.");
    if (args.studyId && (!study || study.ownerHash !== hash))
      throw new ConvexError("Study unavailable in this session.");
    const prospect = args.prospectId ? await ctx.db.get(args.prospectId) : null;
    if (args.prospectId && (!prospect || prospect.ownerHash !== hash))
      throw new ConvexError("Candidate unavailable in this session.");
    const distributor = study?.results.find(
      (result) => result.id === args.resultId && result.kind === "distributor",
    );
    if (study && !distributor)
      throw new ConvexError(
        "The distributor must belong to the saved study.",
      );
    const existing = await ctx.db
      .query("quotationRequests")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.comparisonId !== args.comparisonId ||
        existing.studyId !== args.studyId ||
        existing.resultId !== args.resultId ||
        existing.prospectId !== args.prospectId
      )
        throw new ConvexError("This request already exists with different data.");
      return await publicRequest(ctx, existing);
    }
    const own = await ctx.db
      .query("quotationRequests")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError(
        "This session supports up to 10 quote requests.",
      );
    if (own[0] && Date.now() - own[0].createdAt < COOLDOWN_MS)
      throw new ConvexError(
        "Wait 30 seconds before creating another request.",
      );
    const global = await ctx.db
      .query("quotationRequests")
      .withIndex("by_creation_time")
      .take(MAX_GLOBAL);
    if (global.length >= MAX_GLOBAL)
      throw new ConvexError(
        "The demo request capacity has been reached.",
      );
    const cfg = configured();
    const quantity =
      comparison && comparison.request.quantity > 0
        ? `${comparison.request.quantity} ${comparison.request.unit}`
        : "a quantity to be determined";
    const ingredient =
      comparison?.request.ingredient ??
      prospect?.ingredient ??
      distributor!.ingredient;
    const subject = `Quote request: ${ingredient}`;
    const text = prospect
      ? [
          "Hello,",
          "",
          `Catalog request for ${prospect.supplier}: ${ingredient} in ${prospect.region}.`,
          "Quantity is still to be determined. This is not a purchase order.",
          "Please provide package options, prices, tax, minimum order, and delivery area.",
          "Thank you.",
        ].join("\n")
      : study
        ? [
            "Hello,",
            "",
            `Catalog request for ${distributor!.supplier}: ${ingredient} in ${study.region}.`,
            "Quantity is still to be determined. This is not a purchase order.",
            "Please provide package options, prices, tax, minimum order, and delivery area.",
            "Thank you.",
          ].join("\n")
        : [
            "Hello,",
            "",
            `I would like to request a quote for ${quantity} of ${comparison!.request.ingredient}.`,
            `Specification: ${comparison!.request.specification}.`,
            "",
            "Please provide package size, price, minimum order, and delivery terms.",
            "",
            "Thank you.",
          ].join("\n");
    const now = Date.now();
    const id = await ctx.db.insert("quotationRequests", {
      ownerHash: hash,
      clientId: args.clientId,
      ...(args.comparisonId
        ? { comparisonId: args.comparisonId }
        : args.prospectId
          ? { prospectId: args.prospectId }
          : { studyId: args.studyId!, resultId: args.resultId! }),
      recipient: cfg.recipient,
      inboxId: cfg.inboxId,
      subject,
      text,
      state: "draft",
      revision: 1,
      idempotencyKey: `quotation-${hash.slice(0, 16)}-${args.clientId}`,
      receipt: null,
      failure: null,
      createdAt: now,
      updatedAt: now,
    });
    return await publicRequest(ctx, (await ctx.db.get(id))!);
  },
});

const reservationValidator = v.union(
  v.object({ kind: v.literal("existing"), request: savedQuotationValidator }),
  v.object({
    kind: v.literal("reserved"),
    id: v.id("quotationRequests"),
    inboxId: v.string(),
    recipient: v.string(),
    subject: v.string(),
    text: v.string(),
    idempotencyKey: v.string(),
  }),
);

export const reserveSend = internalMutation({
  args: {
    token: v.string(),
    id: v.id("quotationRequests"),
    expectedRevision: v.number(),
    confirmed: v.literal(true),
  },
  returns: reservationValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.ownerHash !== hash)
      throw new ConvexError("Request unavailable in this session.");
    if (doc.state === "sent")
      return {
        kind: "existing" as const,
        request: await publicRequest(ctx, doc),
      };
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      doc.revision !== args.expectedRevision
    )
      throw new ConvexError("The request changed in another view.");
    if (doc.state !== "draft")
      throw new ConvexError(
        "This request was already processed. Operator review is required before another send.",
      );
    const cfg = configured();
    if (!cfg.enabled || !doc.recipient || !doc.inboxId)
      throw new ConvexError(
        "AgentMail is not enabled for this request.",
      );
    if (doc.recipient !== cfg.recipient || doc.inboxId !== cfg.inboxId)
      throw new ConvexError(
        "The configuration changed. Create a new request before sending.",
      );
    await ctx.db.patch(doc._id, {
      state: "sending",
      simulated: providerRehearsalEnabled(),
      revision: doc.revision + 1,
      updatedAt: Date.now(),
    });
    return {
      kind: "reserved" as const,
      id: doc._id,
      inboxId: doc.inboxId,
      recipient: doc.recipient,
      subject: doc.subject,
      text: doc.text,
      idempotencyKey: doc.idempotencyKey,
    };
  },
});

export const finishSend = internalMutation({
  args: {
    id: v.id("quotationRequests"),
    outcome: v.union(
      v.object({
        kind: v.literal("sent"),
        messageId: v.string(),
        threadId: v.string(),
      }),
      v.object({ kind: v.literal("failed") }),
      v.object({ kind: v.literal("uncertain") }),
    ),
  },
  returns: savedQuotationValidator,
  handler: async (ctx, { id, outcome }) => {
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Missing reserved quotation request.");
    if (doc.state === "sending")
      await ctx.db.patch(
        id,
        outcome.kind === "sent"
          ? {
              state: "sent",
              receipt: {
                messageId: outcome.messageId,
                threadId: outcome.threadId,
              },
              failure: null,
              revision: doc.revision + 1,
              updatedAt: Date.now(),
            }
          : {
              state: outcome.kind,
              failure: outcome.kind === "failed" ? SEND_FAILED : SEND_UNCERTAIN,
              revision: doc.revision + 1,
              updatedAt: Date.now(),
            },
      );
    return await publicRequest(ctx, (await ctx.db.get(id))!);
  },
});

export const send = action({
  args: {
    token: v.string(),
    id: v.id("quotationRequests"),
    expectedRevision: v.number(),
    confirmed: v.literal(true),
  },
  returns: savedQuotationValidator,
  handler: async (ctx, args): Promise<SavedQuotation> => {
    const reservation: typeof reservationValidator.type = await ctx.runMutation(
      internal.quotationMail.reserveSend,
      args,
    );
    if (reservation.kind === "existing") return reservation.request;
    let outcome:
      | { kind: "sent"; messageId: string; threadId: string }
      | { kind: "failed" }
      | { kind: "uncertain" };
    try {
      const response = await providerFetch(
        `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(reservation.inboxId)}/messages/send`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.AGENTMAIL_API_KEY!.trim()}`,
            "content-type": "application/json",
            "Idempotency-Key": reservation.idempotencyKey,
          },
          body: JSON.stringify({
            to: [reservation.recipient],
            subject: reservation.subject,
            text: reservation.text,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        outcome =
          response.status >= 500 || [408, 409, 429].includes(response.status)
            ? { kind: "uncertain" }
            : { kind: "failed" };
      } else {
        const declared = Number(response.headers.get("content-length"));
        if (Number.isFinite(declared) && declared > 64_000)
          outcome = { kind: "uncertain" };
        else {
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Empty provider response");
          let size = 0;
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 64_000) {
              await reader.cancel();
              throw new Error("Provider response too large");
            }
            chunks.push(value);
          }
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          const raw = new TextDecoder().decode(bytes);
          if (raw.length > 64_000) outcome = { kind: "uncertain" };
          else {
            let body: unknown;
            try {
              body = JSON.parse(raw) as unknown;
            } catch {
              body = null;
            }
            outcome =
              body &&
              typeof body === "object" &&
              "message_id" in body &&
              "thread_id" in body &&
              typeof body.message_id === "string" &&
              typeof body.thread_id === "string" &&
              body.message_id.length > 0 &&
              body.message_id.length <= 500 &&
              body.thread_id.length > 0 &&
              body.thread_id.length <= 500
                ? {
                    kind: "sent",
                    messageId: body.message_id,
                    threadId: body.thread_id,
                  }
                : { kind: "uncertain" };
          }
        }
      }
    } catch {
      outcome = { kind: "uncertain" };
    }
    // Keep persistence outside the provider try/catch: if this commit fails, throwing
    // preserves the reserved state for operator reconciliation with the same key.
    return await ctx.runMutation(internal.quotationMail.finishSend, {
      id: reservation.id,
      outcome,
    });
  },
});

const recoveryRequestValidator = v.object({
  id: v.id("quotationRequests"),
  state: v.union(v.literal("sending"), v.literal("uncertain")),
  revision: v.number(),
  clientId: v.string(),
  inboxId: v.union(v.string(), v.null()),
  recipient: v.union(v.string(), v.null()),
  subject: v.string(),
  idempotencyKey: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const recoveryEventValidator = v.object({
  id: v.id("quotationUnmatchedEvents"),
  eventId: v.string(),
  messageId: v.string(),
  inboxId: v.string(),
  threadId: v.string(),
  from: v.string(),
  text: v.string(),
  receivedAt: v.string(),
  createdAt: v.number(),
});

export const inspectRecoveryQueue = internalQuery({
  args: { limit: v.number() },
  returns: v.object({
    requests: v.array(recoveryRequestValidator),
    unmatchedEvents: v.array(recoveryEventValidator),
  }),
  handler: async (ctx, { limit }) => {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_RECOVERY_ITEMS)
      throw new ConvexError("Recovery limit must be an integer from 1 to 100.");
    const [sending, uncertain, unmatched] = await Promise.all([
      ctx.db
        .query("quotationRequests")
        .withIndex("by_state", (q) => q.eq("state", "sending"))
        .order("desc")
        .take(limit),
      ctx.db
        .query("quotationRequests")
        .withIndex("by_state", (q) => q.eq("state", "uncertain"))
        .order("desc")
        .take(limit),
      ctx.db
        .query("quotationUnmatchedEvents")
        .withIndex("by_creation_time")
        .order("desc")
        .take(limit),
    ]);
    const requests = [...sending, ...uncertain]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((request) => ({
        id: request._id,
        state: request.state as "sending" | "uncertain",
        revision: request.revision,
        clientId: request.clientId,
        inboxId: request.inboxId,
        recipient: request.recipient,
        subject: request.subject,
        idempotencyKey: request.idempotencyKey,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      }));
    return {
      requests,
      unmatchedEvents: unmatched.map((event) => ({
        id: event._id,
        eventId: event.eventId,
        messageId: event.messageId,
        inboxId: event.inboxId,
        threadId: event.threadId,
        from: event.from,
        text: event.text,
        receivedAt: event.receivedAt,
        createdAt: event._creationTime,
      })),
    };
  },
});

export const recordVerifiedSentReceipt = internalMutation({
  args: {
    requestId: v.id("quotationRequests"),
    expectedRevision: v.number(),
    inboxId: v.string(),
    messageId: v.string(),
    threadId: v.string(),
    operatorVerified: v.literal(true),
  },
  returns: v.union(v.literal("recorded"), v.literal("existing")),
  handler: async (ctx, args) => {
    assertProviderId(args.inboxId, 300);
    assertProviderId(args.messageId, 500);
    assertProviderId(args.threadId, 500);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Quotation request was not found.");
    if (request.inboxId !== args.inboxId)
      throw new ConvexError(
        "Verified inbox does not match the frozen request.",
      );
    if (
      request.state === "sent" &&
      request.receipt?.messageId === args.messageId &&
      request.receipt.threadId === args.threadId
    )
      return "existing" as const;
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      request.revision !== args.expectedRevision
    )
      throw new ConvexError("Quotation request revision changed.");
    if (request.state !== "sending" && request.state !== "uncertain")
      throw new ConvexError(
        "Only sending or uncertain requests can be reconciled.",
      );
    if (request.receipt)
      throw new ConvexError(
        "Quotation request already has a different receipt.",
      );
    const messageCollision = await ctx.db
      .query("quotationRequests")
      .withIndex("by_inboxId_and_receipt_messageId", (q) =>
        q.eq("inboxId", args.inboxId).eq("receipt.messageId", args.messageId),
      )
      .take(1);
    if (messageCollision.length > 0)
      throw new ConvexError(
        "Verified message is already assigned to another request.",
      );
    const collision = await ctx.db
      .query("quotationRequests")
      .withIndex("by_inboxId_and_receipt_threadId", (q) =>
        q.eq("inboxId", args.inboxId).eq("receipt.threadId", args.threadId),
      )
      .take(1);
    if (collision.length > 0)
      throw new ConvexError(
        "Verified thread is already assigned to another request.",
      );
    await ctx.db.patch(request._id, {
      state: "sent",
      receipt: { messageId: args.messageId, threadId: args.threadId },
      failure: null,
      revision: request.revision + 1,
      updatedAt: Date.now(),
    });
    return "recorded" as const;
  },
});

export const linkVerifiedUnmatchedReply = internalMutation({
  args: {
    requestId: v.id("quotationRequests"),
    eventId: v.string(),
    operatorVerified: v.literal(true),
  },
  returns: v.union(v.literal("linked"), v.literal("existing")),
  handler: async (ctx, args) => {
    assertProviderId(args.eventId, 300);
    const existing = await ctx.db
      .query("quotationReplies")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) {
      if (existing.requestId !== args.requestId)
        throw new ConvexError("Reply is already linked to another request.");
      return "existing" as const;
    }
    const event = await ctx.db
      .query("quotationUnmatchedEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (!event) throw new ConvexError("Quarantined event was not found.");
    const request = await ctx.db.get(args.requestId);
    if (
      !request ||
      request.state !== "sent" ||
      !request.receipt ||
      !request.inboxId ||
      !request.recipient
    )
      throw new ConvexError("Request does not have a frozen sent route.");
    if (
      event.inboxId !== request.inboxId ||
      event.threadId !== request.receipt.threadId ||
      normalizedSender(event.from) !== request.recipient
    )
      throw new ConvexError(
        "Quarantined event does not match the frozen route.",
      );
    const candidates = await ctx.db
      .query("quotationRequests")
      .withIndex("by_inboxId_and_receipt_threadId", (q) =>
        q.eq("inboxId", event.inboxId).eq("receipt.threadId", event.threadId),
      )
      .take(2);
    if (candidates.length !== 1 || candidates[0]._id !== request._id)
      throw new ConvexError("Frozen route is ambiguous.");
    const duplicateMessage = await ctx.db
      .query("quotationReplies")
      .withIndex("by_messageId", (q) => q.eq("messageId", event.messageId))
      .unique();
    if (duplicateMessage)
      throw new ConvexError("Provider message is already linked.");
    const replies = await ctx.db
      .query("quotationReplies")
      .withIndex("by_requestId", (q) => q.eq("requestId", request._id))
      .take(MAX_REPLIES);
    if (replies.length >= MAX_REPLIES)
      throw new ConvexError("Quotation request already has 10 replies.");
    await ctx.db.insert("quotationReplies", {
      requestId: request._id,
      eventId: event.eventId,
      messageId: event.messageId,
      threadId: event.threadId,
      from: normalizedSender(event.from),
      text: event.text,
      receivedAt: event.receivedAt,
    });
    await ctx.db.delete(event._id);
    return "linked" as const;
  },
});

export const recordReceived = internalMutation({
  args: {
    eventId: v.string(),
    messageId: v.string(),
    inboxId: v.string(),
    threadId: v.string(),
    from: v.string(),
    text: v.string(),
    receivedAt: v.string(),
  },
  returns: v.union(
    v.literal("matched"),
    v.literal("duplicate"),
    v.literal("unmatched"),
    v.literal("discarded"),
  ),
  handler: async (ctx, args) => {
    if (
      args.eventId.length > 300 ||
      args.messageId.length > 500 ||
      args.inboxId.length > 300 ||
      args.threadId.length > 500 ||
      args.from.length > 500 ||
      args.text.length > 20_000 ||
      args.receivedAt.length > 100
    )
      throw new Error("Webhook fields exceed limits.");
    const duplicateEvent =
      (await ctx.db
        .query("quotationReplies")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .unique()) ??
      (await ctx.db
        .query("quotationUnmatchedEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .unique());
    if (duplicateEvent) return "duplicate" as const;
    const duplicateMessage =
      (await ctx.db
        .query("quotationReplies")
        .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
        .unique()) ??
      (await ctx.db
        .query("quotationUnmatchedEvents")
        .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
        .unique());
    if (duplicateMessage) return "duplicate" as const;
    const sender = normalizedSender(args.from);
    const candidates = await ctx.db
      .query("quotationRequests")
      .withIndex("by_inboxId_and_receipt_threadId", (q) =>
        q.eq("inboxId", args.inboxId).eq("receipt.threadId", args.threadId),
      )
      .take(2);
    const matches = candidates.filter(
      (candidate) =>
        candidate.state === "sent" && candidate.recipient === sender,
    );
    if (candidates.length === 1 && matches.length === 1) {
      const request = matches[0];
      const replies = await ctx.db
        .query("quotationReplies")
        .withIndex("by_requestId", (q) => q.eq("requestId", request._id))
        .take(MAX_REPLIES);
      if (replies.length >= MAX_REPLIES) return "discarded" as const;
      await ctx.db.insert("quotationReplies", {
        requestId: request._id,
        eventId: args.eventId,
        messageId: args.messageId,
        threadId: args.threadId,
        text: args.text,
        receivedAt: args.receivedAt,
        from: sender,
      });
      return "matched" as const;
    }
    const unmatched = await ctx.db
      .query("quotationUnmatchedEvents")
      .withIndex("by_creation_time")
      .take(100);
    if (unmatched.length >= 100) return "discarded" as const;
    await ctx.db.insert("quotationUnmatchedEvents", { ...args, from: sender });
    return "unmatched" as const;
  },
});

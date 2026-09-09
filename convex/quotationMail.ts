import { ConvexError, v } from "convex/values";
import {
  action,
  env,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { ownerHash } from "./lib/demoSession";
import {
  savedQuotationValidator,
  type SavedQuotation,
} from "./quotationValidators";

const MAX_PER_SESSION = 10;
const MAX_GLOBAL = 100;
const MAX_REPLIES = 10;
const COOLDOWN_MS = 30_000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEND_FAILED =
  "AgentMail rechazó el envío. Crea una solicitud nueva para volver a intentarlo.";
const SEND_UNCERTAIN =
  "No se pudo confirmar el resultado del envío. No se reintentará automáticamente.";

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
    comparisonId: doc.comparisonId,
    subject: doc.subject,
    text: doc.text,
    recipient: doc.recipient,
    state: doc.state,
    revision: doc.revision,
    receipt: doc.receipt,
    failure: doc.failure,
    createdAt: doc.createdAt,
    replies: replies.map((reply) => ({
      messageId: reply.messageId,
      text: reply.text,
      receivedAt: reply.receivedAt,
    })),
  };
}

export const status = query({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    recipient: v.union(v.string(), v.null()),
  }),
  handler: async () => {
    const value = configured();
    return { enabled: value.enabled, recipient: value.recipient };
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

export const create = mutation({
  args: {
    token: v.string(),
    comparisonId: v.id("comparisons"),
    clientId: v.string(),
  },
  returns: savedQuotationValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!UUID.test(args.clientId))
      throw new ConvexError("Solicitud no válida.");
    const comparison = await ctx.db.get(args.comparisonId);
    if (!comparison || comparison.ownerHash !== hash)
      throw new ConvexError("Comparación no disponible en esta sesión.");
    const existing = await ctx.db
      .query("quotationRequests")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (existing.comparisonId !== args.comparisonId)
        throw new ConvexError("La solicitud ya existe con otros datos.");
      return await publicRequest(ctx, existing);
    }
    const own = await ctx.db
      .query("quotationRequests")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError(
        "Esta sesión admite hasta 10 solicitudes de cotización.",
      );
    if (own[0] && Date.now() - own[0].createdAt < COOLDOWN_MS)
      throw new ConvexError(
        "Espera 30 segundos antes de crear otra solicitud.",
      );
    const global = await ctx.db
      .query("quotationRequests")
      .withIndex("by_creation_time")
      .take(MAX_GLOBAL);
    if (global.length >= MAX_GLOBAL)
      throw new ConvexError(
        "Se alcanzó la capacidad total de solicitudes de la demo.",
      );
    const cfg = configured();
    const quantity =
      comparison.request.quantity > 0
        ? `${comparison.request.quantity} ${comparison.request.unit}`
        : "una cantidad por definir";
    const subject = `Solicitud de cotización: ${comparison.request.ingredient}`;
    const text = [
      "Hola,",
      "",
      `Quisiera solicitar una cotización para ${quantity} de ${comparison.request.ingredient}.`,
      `Especificación: ${comparison.request.specification}.`,
      "",
      "Por favor, indicar presentación, precio, mínimo de compra y condiciones de entrega.",
      "",
      "Gracias.",
    ].join("\n");
    const now = Date.now();
    const id = await ctx.db.insert("quotationRequests", {
      ownerHash: hash,
      clientId: args.clientId,
      comparisonId: args.comparisonId,
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
      throw new ConvexError("Solicitud no disponible en esta sesión.");
    if (doc.state === "sent")
      return {
        kind: "existing" as const,
        request: await publicRequest(ctx, doc),
      };
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      doc.revision !== args.expectedRevision
    )
      throw new ConvexError("La solicitud cambió en otra vista.");
    if (doc.state !== "draft")
      throw new ConvexError(
        "Esta solicitud ya fue procesada. Requiere revisión del operador antes de cualquier nuevo envío.",
      );
    const cfg = configured();
    if (!cfg.enabled || !doc.recipient || !doc.inboxId)
      throw new ConvexError(
        "AgentMail no está habilitado para esta solicitud.",
      );
    if (doc.recipient !== cfg.recipient || doc.inboxId !== cfg.inboxId)
      throw new ConvexError(
        "La configuración cambió. Crea una solicitud nueva antes de enviar.",
      );
    await ctx.db.patch(doc._id, {
      state: "sending",
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
      const response = await fetch(
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
    const sender =
      args.from
        .trim()
        .toLowerCase()
        .match(/<([^>]+)>$/)?.[1] ?? args.from.trim().toLowerCase();
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

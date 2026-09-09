/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function insertRequest(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    state: "sending" | "uncertain" | "sent";
    inboxId: string;
    recipient: string;
    receipt: { messageId: string; threadId: string } | null;
  }> = {},
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("quotationRequests", {
      ownerHash: "server-derived-owner",
      clientId: crypto.randomUUID(),
      recipient: overrides.recipient ?? "supplier@example.test",
      inboxId: overrides.inboxId ?? "inbox-frozen",
      subject: "Solicitud sintética",
      text: "Contenido sintético",
      state: overrides.state ?? "uncertain",
      revision: 2,
      idempotencyKey: crypto.randomUUID(),
      receipt: overrides.receipt ?? null,
      failure: "Resultado incierto",
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function insertUnmatched(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    eventId: string;
    messageId: string;
    inboxId: string;
    threadId: string;
    from: string;
  }> = {},
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("quotationUnmatchedEvents", {
      eventId: overrides.eventId ?? crypto.randomUUID(),
      messageId: overrides.messageId ?? crypto.randomUUID(),
      inboxId: overrides.inboxId ?? "inbox-frozen",
      threadId: overrides.threadId ?? "thread-verified",
      from: overrides.from ?? "Supplier <supplier@example.test>",
      text: "S/ 92 por saco",
      receivedAt: "2026-09-09T12:00:00Z",
    }),
  );
}

test("operator records a verified receipt and links a matching quarantined reply idempotently", async () => {
  const t = convexTest(schema, modules);
  const requestId = await insertRequest(t);
  const eventId = "event-verified";
  await insertUnmatched(t, { eventId });

  const queue = await t.query(internal.quotationMail.inspectRecoveryQueue, {
    limit: 10,
  });
  expect(queue.requests).toMatchObject([
    { id: requestId, state: "uncertain", revision: 2, inboxId: "inbox-frozen" },
  ]);
  expect(queue.unmatchedEvents).toMatchObject([
    {
      eventId,
      threadId: "thread-verified",
      from: "Supplier <supplier@example.test>",
    },
  ]);

  const receipt = {
    requestId,
    expectedRevision: 2,
    inboxId: "inbox-frozen",
    messageId: "message-sent",
    threadId: "thread-verified",
    operatorVerified: true as const,
  };
  expect(
    await t.mutation(internal.quotationMail.recordVerifiedSentReceipt, receipt),
  ).toBe("recorded");
  expect(
    await t.mutation(internal.quotationMail.recordVerifiedSentReceipt, receipt),
  ).toBe("existing");

  const link = { requestId, eventId, operatorVerified: true as const };
  expect(
    await t.mutation(internal.quotationMail.linkVerifiedUnmatchedReply, link),
  ).toBe("linked");
  expect(
    await t.mutation(internal.quotationMail.linkVerifiedUnmatchedReply, link),
  ).toBe("existing");
  await t.run(async (ctx) => {
    expect(
      await ctx.db
        .query("quotationUnmatchedEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .unique(),
    ).toBeNull();
    expect(
      await ctx.db
        .query("quotationReplies")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .unique(),
    ).toMatchObject({ requestId, from: "supplier@example.test" });
  });
});

test("reconciliation rejects changed revisions, frozen-route mismatch and ambiguous threads", async () => {
  const t = convexTest(schema, modules);
  const requestId = await insertRequest(t);
  await expect(
    t.mutation(internal.quotationMail.recordVerifiedSentReceipt, {
      requestId,
      expectedRevision: 1,
      inboxId: "inbox-frozen",
      messageId: "message-sent",
      threadId: "thread-verified",
      operatorVerified: true,
    }),
  ).rejects.toThrow(/revision changed/);
  await t.mutation(internal.quotationMail.recordVerifiedSentReceipt, {
    requestId,
    expectedRevision: 2,
    inboxId: "inbox-frozen",
    messageId: "message-sent",
    threadId: "thread-verified",
    operatorVerified: true,
  });
  const wrongSender = "wrong-sender";
  await insertUnmatched(t, {
    eventId: wrongSender,
    from: "other@example.test",
  });
  await expect(
    t.mutation(internal.quotationMail.linkVerifiedUnmatchedReply, {
      requestId,
      eventId: wrongSender,
      operatorVerified: true,
    }),
  ).rejects.toThrow(/does not match/);

  await insertRequest(t, {
    state: "sent",
    receipt: { messageId: "other-sent", threadId: "thread-verified" },
  });
  const ambiguous = "ambiguous-event";
  await insertUnmatched(t, { eventId: ambiguous });
  await expect(
    t.mutation(internal.quotationMail.linkVerifiedUnmatchedReply, {
      requestId,
      eventId: ambiguous,
      operatorVerified: true,
    }),
  ).rejects.toThrow(/ambiguous/);
});

test("operator inspection is bounded and rejects invalid limits", async () => {
  const t = convexTest(schema, modules);
  for (let index = 0; index < 3; index += 1) {
    await insertRequest(t, { state: index % 2 ? "sending" : "uncertain" });
    await insertUnmatched(t);
  }
  const queue = await t.query(internal.quotationMail.inspectRecoveryQueue, {
    limit: 2,
  });
  expect(queue.requests).toHaveLength(2);
  expect(queue.unmatchedEvents).toHaveLength(2);
  await expect(
    t.query(internal.quotationMail.inspectRecoveryQueue, { limit: 101 }),
  ).rejects.toThrow(/1 to 100/);
});

test("complete recovery inspection keeps the oldest retained rows reachable", async () => {
  const t = convexTest(schema, modules);
  let oldestRequestId: Awaited<ReturnType<typeof insertRequest>> | null = null;
  let oldestEventId: string | null = null;
  for (let index = 0; index < 100; index += 1) {
    const requestId = await insertRequest(t);
    const eventId = `retained-event-${index}`;
    await insertUnmatched(t, { eventId });
    if (index === 0) {
      oldestRequestId = requestId;
      oldestEventId = eventId;
    }
  }
  const queue = await t.query(internal.quotationMail.inspectRecoveryQueue, {
    limit: 100,
  });
  expect(queue.requests).toHaveLength(100);
  expect(queue.unmatchedEvents).toHaveLength(100);
  expect(queue.requests.some((request) => request.id === oldestRequestId)).toBe(
    true,
  );
  expect(
    queue.unmatchedEvents.some((event) => event.eventId === oldestEventId),
  ).toBe(true);
});

test("a provider message cannot be assigned twice within one inbox", async () => {
  const t = convexTest(schema, modules);
  await insertRequest(t, {
    state: "sent",
    receipt: { messageId: "shared-message", threadId: "first-thread" },
  });
  const requestId = await insertRequest(t);
  await expect(
    t.mutation(internal.quotationMail.recordVerifiedSentReceipt, {
      requestId,
      expectedRevision: 2,
      inboxId: "inbox-frozen",
      messageId: "shared-message",
      threadId: "different-thread",
      operatorVerified: true,
    }),
  ).rejects.toThrow(/message is already assigned/);
});

test("recovery preserves quarantine when the request reply limit is reached", async () => {
  const t = convexTest(schema, modules);
  const requestId = await insertRequest(t, {
    state: "sent",
    receipt: { messageId: "sent-message", threadId: "thread-verified" },
  });
  await t.run(async (ctx) => {
    for (let index = 0; index < 10; index += 1) {
      await ctx.db.insert("quotationReplies", {
        requestId,
        eventId: `existing-event-${index}`,
        messageId: `existing-message-${index}`,
        threadId: "thread-verified",
        from: "supplier@example.test",
        text: "Respuesta sintética",
        receivedAt: "2026-09-09T12:00:00Z",
      });
    }
  });
  const eventId = "overflow-event";
  await insertUnmatched(t, { eventId });
  await expect(
    t.mutation(internal.quotationMail.linkVerifiedUnmatchedReply, {
      requestId,
      eventId,
      operatorVerified: true,
    }),
  ).rejects.toThrow(/already has 10 replies/);
  await t.run(async (ctx) => {
    expect(
      await ctx.db
        .query("quotationUnmatchedEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .unique(),
    ).not.toBeNull();
  });
});

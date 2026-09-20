// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { Webhook } from "svix";
import http from "./http";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { riceOffers, riceRequest } from "../fixtures/procurement";

const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("keeps the disabled AgentMail webhook ahead of the static fallback", async () => {
  expect(http.lookup("/agentmail/webhook", "POST")).toBeDefined();
  expect(http.lookup("/demo/route", "GET")).toBeDefined();

  const t = convexTest(schema, modules);
  const response = await t.fetch("/agentmail/webhook", { method: "POST" });
  expect(response.status).toBe(503);
  expect(await response.text()).toBe("Webhook disabled");
});

async function comparison(t: ReturnType<typeof convexTest>) {
  return await t.mutation(api.comparisons.save, {
    token,
    clientId: "11111111-1111-4111-8111-111111111111",
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
}

function enableMail() {
  vi.stubEnv("AGENTMAIL_ENABLED", "true");
  vi.stubEnv("AGENTMAIL_API_KEY", "test-key");
  vi.stubEnv("AGENTMAIL_INBOX_ID", "inbox-test");
  vi.stubEnv("AGENTMAIL_TEST_RECIPIENT", "buyer@example.test");
}

function enableRehearsal() {
  vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3240");
  vi.stubEnv("REHEARSAL_BRIDGE_URL", "http://127.0.0.1:8789");
  vi.stubEnv("REHEARSAL_BRIDGE_TOKEN", "r".repeat(64));
}

test("creates an owned fixed draft without credentials and never accepts message text", async () => {
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  expect(draft.recipient).toBeNull();
  expect(draft.text).toContain("10 kg of Arroz");
  expect(draft.text).toContain("Arroz blanco, misma calidad confirmada");
  expect(await t.query(api.quotationMail.status, {})).toEqual({
    enabled: false,
    recipient: null,
    extractionEnabled: false,
    draftEnabled: false,
  });
  expect(
    await t.query(api.quotationMail.list, { token: "b".repeat(64) }),
  ).toEqual([]);
  await expect(
    t.mutation(api.quotationMail.create, {
      token: "b".repeat(64),
      comparisonId: saved.id,
      clientId: "33333333-3333-4333-8333-333333333333",
    }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.action(api.quotationMail.send, {
      token,
      id: draft.id,
      expectedRevision: 1,
      confirmed: true,
    }),
  ).rejects.toThrow(/not enabled/);
});

test("reserves once, sends the frozen payload with idempotency, and prevents duplicate calls", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-key",
      "Idempotency-Key": expect.stringContaining("quotation-"),
    });
    expect(JSON.parse(init.body as string)).toEqual({
      to: ["buyer@example.test"],
      subject: draft.subject,
      text: `${draft.text}\n\n—\nPrepared with Surtario · Sourcing for your kitchen`,
      html: expect.stringContaining("<!doctype html>"),
    });
    expect(JSON.parse(init.body as string).html).toContain("Quote request: Arroz");
    expect(JSON.parse(init.body as string).html).toContain("10 kg of Arroz");
    return new Response(
      JSON.stringify({ message_id: "msg-out", thread_id: "thread-1" }),
      { status: 200 },
    );
  });
  vi.stubGlobal("fetch", fetch);
  const sent = await t.action(api.quotationMail.send, {
    token,
    id: draft.id,
    expectedRevision: 1,
    confirmed: true,
  });
  expect(sent.state).toBe("sent");
  expect(sent.simulated).toBe(false);
  expect(sent.receipt).toEqual({ messageId: "msg-out", threadId: "thread-1" });
  expect(
    (
      await t.action(api.quotationMail.send, {
        token,
        id: draft.id,
        expectedRevision: sent.revision,
        confirmed: true,
      })
    ).state,
  ).toBe("sent");
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("send reservation freezes validated rehearsal provenance on the request", async () => {
  enableMail();
  enableRehearsal();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  await t.mutation(internal.quotationMail.reserveSend, {
    token,
    id: draft.id,
    expectedRevision: 1,
    confirmed: true,
  });
  vi.stubEnv("REHEARSAL_BRIDGE_URL", "");
  vi.stubEnv("REHEARSAL_BRIDGE_TOKEN", "");
  expect((await t.query(api.quotationMail.list, { token }))[0].simulated).toBe(
    true,
  );
  await t.run(async (ctx) => {
    expect((await ctx.db.get(draft.id))?.simulated).toBe(true);
  });
});

test("network ambiguity is terminal for the public API", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("secret transport detail");
    }),
  );
  const result = await t.action(api.quotationMail.send, {
    token,
    id: draft.id,
    expectedRevision: 1,
    confirmed: true,
  });
  expect(result.state).toBe("uncertain");
  expect(JSON.stringify(result)).not.toContain("secret transport detail");
  await expect(
    t.action(api.quotationMail.send, {
      token,
      id: draft.id,
      expectedRevision: result.revision,
      confirmed: true,
    }),
  ).rejects.toThrow(/Operator/);
});

test("verified replies require frozen inbox, thread and sender; duplicates are harmless", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  await t.mutation(internal.quotationMail.reserveSend, {
    token,
    id: draft.id,
    expectedRevision: 1,
    confirmed: true,
  });
  await t.mutation(internal.quotationMail.finishSend, {
    id: draft.id,
    outcome: { kind: "sent", messageId: "msg-out", threadId: "thread-1" },
  });
  const event = {
    eventId: "evt-1",
    messageId: "msg-in",
    inboxId: "inbox-test",
    threadId: "thread-1",
    from: "Buyer <buyer@example.test>",
    text: "S/ 92 por saco",
    receivedAt: "2026-09-08T12:00:00Z",
  };
  expect(await t.mutation(internal.quotationMail.recordReceived, event)).toBe(
    "matched",
  );
  expect(await t.mutation(internal.quotationMail.recordReceived, event)).toBe(
    "duplicate",
  );
  expect((await t.query(api.quotationMail.list, { token }))[0].replies).toEqual(
    [
      {
        messageId: "msg-in",
        text: "S/ 92 por saco",
        receivedAt: event.receivedAt,
        extraction: null,
        extractionStatus: "idle",
        extractionError: null,
        extractionAttempts: 0,
        extractionAttempt: null,
      },
    ],
  );
  expect(
    await t.mutation(internal.quotationMail.recordReceived, {
      ...event,
      eventId: "evt-2",
      messageId: "msg-2",
      threadId: "other",
    }),
  ).toBe("unmatched");
  expect(
    JSON.stringify(await t.query(api.quotationMail.list, { token })),
  ).not.toContain("msg-2");
});

test("webhook rejects forged or stale signatures and accepts the exact signed raw body", async () => {
  const t = convexTest(schema, modules);
  const secret = `whsec_${btoa("01234567890123456789012345678901")}`;
  vi.stubEnv("AGENTMAIL_WEBHOOK_SECRET", secret);
  const payload = JSON.stringify({
    event_type: "message.received",
    event_id: "evt-http",
    message: {
      message_id: "msg-http",
      inbox_id: "other",
      thread_id: "other",
      from: "sender@example.test",
      text: "literal",
      timestamp: "2026-09-08T12:00:00Z",
    },
  });
  const id = "msg_delivery";
  const now = new Date();
  const signature = new Webhook(secret).sign(id, now, payload);
  const headers = {
    "svix-id": id,
    "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
    "svix-signature": signature,
  };
  expect(
    (
      await t.fetch("/agentmail/webhook", {
        method: "POST",
        headers,
        body: `${payload} `,
      })
    ).status,
  ).toBe(400);
  const old = new Date(Date.now() - 10 * 60_000);
  const oldHeaders = {
    "svix-id": "old",
    "svix-timestamp": String(Math.floor(old.getTime() / 1000)),
    "svix-signature": new Webhook(secret).sign("old", old, payload),
  };
  expect(
    (
      await t.fetch("/agentmail/webhook", {
        method: "POST",
        headers: oldHeaders,
        body: payload,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await t.fetch("/agentmail/webhook", {
        method: "POST",
        headers,
        body: payload,
      })
    ).status,
  ).toBe(200);
});

test("configuration drift and foreign sessions cannot send a reviewed draft", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const args = {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  };
  const draft = await t.mutation(api.quotationMail.create, args);
  expect((await t.mutation(api.quotationMail.create, args)).id).toBe(draft.id);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(
    t.action(api.quotationMail.send, {
      token: "b".repeat(64),
      id: draft.id,
      expectedRevision: 1,
      confirmed: true,
    }),
  ).rejects.toThrow(/unavailable/);
  vi.stubEnv("AGENTMAIL_INBOX_ID", "changed-inbox");
  await expect(
    t.action(api.quotationMail.send, {
      token,
      id: draft.id,
      expectedRevision: 1,
      confirmed: true,
    }),
  ).rejects.toThrow(/configuration changed/);
  expect(fetch).not.toHaveBeenCalled();
});

test("oversized and server-error send results stay uncertain without retry", async () => {
  for (const response of [
    new Response("error", { status: 503 }),
    new Response("x".repeat(64_001)),
  ]) {
    enableMail();
    const t = convexTest(schema, modules);
    const saved = await comparison(t);
    const draft = await t.mutation(api.quotationMail.create, {
      token,
      comparisonId: saved.id,
      clientId: "22222222-2222-4222-8222-222222222222",
    });
    const fetch = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await t.action(api.quotationMail.send, {
          token,
          id: draft.id,
          expectedRevision: 1,
          confirmed: true,
        })
      ).state,
    ).toBe("uncertain");
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});

test("an early reply is quarantined and never exposed or silently reassigned", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  await t.mutation(internal.quotationMail.reserveSend, {
    token,
    id: draft.id,
    expectedRevision: 1,
    confirmed: true,
  });
  const event = {
    eventId: "early",
    messageId: "early-message",
    inboxId: "inbox-test",
    threadId: "thread-1",
    from: "buyer@example.test",
    text: "early response",
    receivedAt: "2026-09-08T12:00:00Z",
  };
  expect(await t.mutation(internal.quotationMail.recordReceived, event)).toBe(
    "unmatched",
  );
  await t.mutation(internal.quotationMail.finishSend, {
    id: draft.id,
    outcome: { kind: "sent", messageId: "out", threadId: "thread-1" },
  });
  expect(await t.mutation(internal.quotationMail.recordReceived, event)).toBe(
    "duplicate",
  );
  expect((await t.query(api.quotationMail.list, { token }))[0].replies).toEqual(
    [],
  );
  expect(
    await t.mutation(internal.quotationMail.recordReceived, {
      ...event,
      eventId: "wrong-sender",
      messageId: "wrong-sender",
      from: "other@example.test",
    }),
  ).toBe("unmatched");
});

test("a shared provider thread cannot route a reply to an arbitrary request", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(draft.id, {
      state: "sent",
      receipt: { messageId: "out-1", threadId: "shared" },
    });
    const doc = (await ctx.db.get(draft.id))!;
    const { _id, _creationTime, ...fields } = doc;
    await ctx.db.insert("quotationRequests", {
      ...fields,
      ownerHash: "another-owner",
      clientId: "another-request",
      receipt: { messageId: "out-2", threadId: "shared" },
    });
  });
  expect(
    await t.mutation(internal.quotationMail.recordReceived, {
      eventId: "ambiguous",
      messageId: "ambiguous",
      inboxId: "inbox-test",
      threadId: "shared",
      from: "buyer@example.test",
      text: "private reply",
      receivedAt: "2026-09-08T12:00:00Z",
    }),
  ).toBe("unmatched");
  expect((await t.query(api.quotationMail.list, { token }))[0].replies).toEqual(
    [],
  );
});

test("acknowledges and retains a visibly truncated signed long reply", async () => {
  const t = convexTest(schema, modules);
  const secret = `whsec_${btoa("01234567890123456789012345678901")}`;
  vi.stubEnv("AGENTMAIL_WEBHOOK_SECRET", secret);
  const payload = JSON.stringify({
    event_type: "message.received",
    event_id: "evt-long",
    message: {
      message_id: "msg-long",
      inbox_id: "other",
      thread_id: "other",
      from: "sender@example.test",
      text: "x".repeat(30_000),
    },
  });
  const now = new Date();
  const response = await t.fetch("/agentmail/webhook", {
    method: "POST",
    body: payload,
    headers: {
      "svix-id": "delivery-long",
      "svix-timestamp": String(Math.floor(now.getTime() / 1000)),
      "svix-signature": new Webhook(secret).sign("delivery-long", now, payload),
    },
  });
  expect(response.status).toBe(200);
  const stored = await t.run(async (ctx) =>
    ctx.db.query("quotationUnmatchedEvents").first(),
  );
  expect(stored?.text.length).toBe(20_000);
  expect(stored?.text.startsWith("x".repeat(100))).toBe(true);
  expect(stored?.text).toContain("Reply truncated");
  expect(stored?.messageId).toBe("msg-long");
});


test("traces immutable approval, uncertain recovery and duplicate replies without resending", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const caseId = await t.run(async (ctx) => {
    const comparison = (await ctx.db.get(saved.id))!;
    return await ctx.db.insert("sourcingCases", {
      ownerHash: comparison.ownerHash, comparisonId: saved.id,
      ingredient: "Arroz", region: "Lima", objective: "Compare conditions",
      status: "idle", revision: 1, steps: 0, runs: 0, researchRunIds: [],
      summary: "", createdAt: Date.now(), updatedAt: Date.now(),
    });
  });
  const draft = await t.mutation(api.quotationMail.create, {
    token, comparisonId: saved.id, clientId: "22222222-2222-4222-8222-222222222222",
  });
  expect(draft.approvedAt).toBeNull();
  await expect(t.mutation(internal.quotationMail.reserveSend, {
    token, id: draft.id, expectedRevision: 0, confirmed: true,
  })).rejects.toThrow(/changed/);
  await t.mutation(internal.quotationMail.reserveSend, {
    token, id: draft.id, expectedRevision: 1, confirmed: true,
  });
  const uncertain = await t.mutation(internal.quotationMail.finishSend, { id: draft.id, outcome: { kind: "uncertain" } });
  expect(uncertain.approvedRevision).toBe(1);
  expect(uncertain.approvedAt).toEqual(expect.any(Number));
  await expect(t.mutation(internal.quotationMail.reserveSend, {
    token, id: draft.id, expectedRevision: uncertain.revision, confirmed: true,
  })).rejects.toThrow(/already processed/);
  await t.mutation(internal.quotationMail.recordVerifiedSentReceipt, {
    requestId: draft.id, expectedRevision: uncertain.revision, inboxId: "inbox-test",
    messageId: "trace-out", threadId: "trace-thread", operatorVerified: true,
  });
  const reply = { eventId: "trace-event", messageId: "trace-in", inboxId: "inbox-test",
    threadId: "trace-thread", from: "buyer@example.test", text: "Freight is pending.", receivedAt: "2026-09-14T12:00:00Z" };
  expect(await t.mutation(internal.quotationMail.recordReceived, reply)).toBe("matched");
  expect(await t.mutation(internal.quotationMail.recordReceived, reply)).toBe("duplicate");
  const events = await t.run(ctx => ctx.db.query("sourcingEvents").withIndex("by_caseId", q => q.eq("caseId", caseId)).take(20));
  expect(events.map(event => event.kind)).toEqual(["mail_draft", "mail_approved", "mail_uncertain", "mail_sent", "mail_reply"]);
  const recovered = (await t.query(api.quotationMail.list, { token }))[0];
  expect(recovered.text).toBe(draft.text);
  expect(recovered.recipient).toBe(draft.recipient);
  expect(recovered.approvedAt).toBe(uncertain.approvedAt);
  expect(recovered.replies).toHaveLength(1);
});


test("keeps historical plain-text requests unchanged when sending", async () => {
  enableMail();
  const t = convexTest(schema, modules);
  const saved = await comparison(t);
  const draft = await t.mutation(api.quotationMail.create, {
    token, comparisonId: saved.id, clientId: "77777777-7777-4777-8777-777777777777",
  });
  await t.run(async (ctx) => { await ctx.db.patch(draft.id, { presentationVersion: undefined }); });
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    expect(JSON.parse(init.body as string)).toEqual({ to: ["buyer@example.test"], subject: draft.subject, text: draft.text });
    return new Response(JSON.stringify({ message_id: "legacy-out", thread_id: "legacy-thread" }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);
  const sent = await t.action(api.quotationMail.send, { token, id: draft.id, expectedRevision: 1, confirmed: true });
  expect(sent.presentationVersion).toBeUndefined();
  expect(sent.state).toBe("sent");
  expect(fetch).toHaveBeenCalledTimes(1);
});

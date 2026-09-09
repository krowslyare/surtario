// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import { prepareReplyOffer } from "../src/domain/replyReview";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const values = {
  supplier: "Distribuidor de prueba",
  ingredient: "Arroz",
  specification: "Blanco extra",
  packageContent: "18",
  packageUnit: "kg",
  price: "85",
  currency: "PEN",
};
async function setup() {
  const t = convexTest(schema, modules);
  const requestId = await t.run(async (ctx) =>
    ctx.db.insert("quotationRequests", {
      ownerHash: await ownerHash(token),
      clientId: "fixture",
      recipient: null,
      inboxId: null,
      subject: "Consulta",
      text: "Solicitud original",
      state: "sent",
      revision: 3,
      idempotencyKey: "fixture",
      receipt: { messageId: "out", threadId: "thread" },
      failure: null,
      createdAt: 0,
      updatedAt: 0,
    }),
  );
  const reply = {
    requestId,
    messageId: "incoming",
    text: "Arroz blanco extra, saco 18 kg, PEN 80.00. Confirmar condiciones.",
    receivedAt: "2026-09-09T12:00:00Z",
  };
  await t.run(async (ctx) =>
    ctx.db.insert("quotationReplies", {
      ...reply,
      eventId: "event",
      threadId: "thread",
      from: "test@example.test",
    }),
  );
  const seed = prepareReplyOffer(reply, values, true);
  const args = {
    token,
    clientId: "22222222-2222-4222-8222-222222222222",
    id: null,
    expectedRevision: 0,
    request: { ...seed.request, quantity: 10 },
    offers: seed.offers.map((o) => ({
      ...o,
      minimumPackages: 1,
      freightCents: 1500,
      taxStatus: "included" as const,
      deliveryConfirmed: true,
    })),
    selectedOfferId: seed.offers[0].id,
    replyReview: {
      requestId,
      messageId: reply.messageId,
      values,
      confirmed: true as const,
    },
  };
  return { t, args, reply };
}
test("reply review saves source, manual fields and choice without altering the email", async () => {
  const { t, args, reply } = await setup();
  const saved = await t.mutation(api.comparisons.save, args);
  const source = saved.sources[args.selectedOfferId];
  expect(source.marketSource?.evidence.split("\n\nRevisión")[0]).toBe(
    reply.text,
  );
  expect(source.extraction?.proposed.price.value).toBeNull();
  expect(source.extraction?.reviewed.price).toBe("85");
  expect(saved.offers[0].priceCents).toBe(8500);
  expect(saved.selectedOfferId).toBe(args.selectedOfferId);
  expect((await t.mutation(api.comparisons.save, args)).id).toBe(saved.id);
  const updated = await t.mutation(api.comparisons.save, {
    ...args,
    id: saved.id,
    expectedRevision: 1,
    replyReview: undefined,
    offers: args.offers.map((o) => ({ ...o, priceCents: 9000 })),
  });
  expect(updated.sources[args.selectedOfferId].original.priceCents).toBe(8500);
  expect(
    (await t.query(api.quotationMail.list, { token }))[0].replies[0].text,
  ).toBe(reply.text);
  expect(
    await t.query(api.comparisons.list, { token: "b".repeat(64) }),
  ).toEqual([]);
});
test("an invalid signed reply timestamp stays pending without inventing a date", async () => {
  const { t, args, reply } = await setup();
  await t.run(async (ctx) => {
    const stored = await ctx.db
      .query("quotationReplies")
      .withIndex("by_messageId", (q) => q.eq("messageId", reply.messageId))
      .unique();
    await ctx.db.patch(stored!._id, { receivedAt: "not-a-date" });
  });
  const saved = await t.mutation(api.comparisons.save, args);
  expect(saved.sources[args.selectedOfferId].date).toBe("");
  expect(saved.sources[args.selectedOfferId].marketSource?.observedAt).toBe(
    "",
  );
});
test("foreign and unlinked replies, missing confirmation and conflicting retries are refused", async () => {
  const { t, args } = await setup();
  await expect(
    t.mutation(api.comparisons.save, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/no disponible/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      replyReview: { ...args.replyReview, messageId: "unmatched" },
    }),
  ).rejects.toThrow(/no vinculada/);
  expect(() =>
    prepareReplyOffer(
      {
        requestId: "request",
        messageId: "msg",
        text: "hello",
        receivedAt: "2026-09-09",
      },
      values,
      false,
    ),
  ).toThrow(/confirma/);
  await t.mutation(api.comparisons.save, args);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      replyReview: { ...args.replyReview, values: { ...values, price: "90" } },
    }),
  ).rejects.toThrow(/otros datos/);
});

test("append to a saved comparison preserves old sources, quantity and revision while clearing choice", async () => {
  const { t, args, reply } = await setup();
  const { riceRequest, riceOffers } = await import("../fixtures/procurement");
  const original = await t.mutation(api.comparisons.save, {
    token,
    clientId: "33333333-3333-4333-8333-333333333333",
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  const matchedValues = {
    ...values,
    ingredient: riceRequest.ingredient,
    specification: riceRequest.specification,
  };
  const incoming = prepareReplyOffer(reply, matchedValues, true);
  const append = {
    token,
    clientId: "44444444-4444-4444-8444-444444444444",
    id: original.id,
    expectedRevision: 1,
    request: original.request,
    offers: [...original.offers, ...incoming.offers],
    selectedOfferId: null,
    appendReplies: [
      {
        review: { ...args.replyReview, values: matchedValues },
        equivalent: true as const,
      },
    ],
  };
  await expect(
    t.mutation(api.comparisons.save, {
      ...append,
      selectedOfferId: riceOffers[1].id,
    }),
  ).rejects.toThrow(/Vuelve a elegir/);
  const saved = await t.mutation(api.comparisons.save, append);
  expect(saved.id).toBe(original.id);
  expect(saved.revision).toBe(2);
  expect(saved.request).toEqual(original.request);
  expect(saved.offers.slice(0, 2)).toEqual(original.offers);
  expect(saved.offers).toHaveLength(3);
  for (const [id, source] of Object.entries(original.sources))
    expect(saved.sources[id]).toEqual(source);
  expect(saved.sources[incoming.offers[0].id].replyReview?.messageId).toBe(
    reply.messageId,
  );
  expect(saved.selectedOfferId).toBeNull();
  await expect(t.mutation(api.comparisons.save, append)).rejects.toThrow(
    /otra vista/,
  );
  await expect(
    t.mutation(api.comparisons.save, { ...append, expectedRevision: 2 }),
  ).rejects.toThrow(/ya pertenece/);
  const final = await t.mutation(api.comparisons.save, {
    ...append,
    expectedRevision: 2,
    appendReplies: undefined,
  });
  expect(final.offers).toHaveLength(3);
  expect(final.sources).toEqual(saved.sources);
});

test("append rejects incompatible identity and currency, unchecked equivalence and exhausted source history", async () => {
  const { t, args, reply } = await setup();
  const { riceRequest, riceOffers } = await import("../fixtures/procurement");
  const original = await t.mutation(api.comparisons.save, {
    token,
    clientId: "33333333-3333-4333-8333-333333333333",
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  for (const changed of [
    { specification: "Otra calidad" },
    { currency: "USD" },
    { packageUnit: "L" },
  ]) {
    const v = {
      ...values,
      ingredient: riceRequest.ingredient,
      specification: riceRequest.specification,
      ...changed,
    };
    const incoming = prepareReplyOffer(reply, v, true);
    await expect(
      t.mutation(api.comparisons.save, {
        token,
        clientId: "44444444-4444-4444-8444-444444444444",
        id: original.id,
        expectedRevision: 1,
        request: riceRequest,
        offers: [...riceOffers, ...incoming.offers],
        selectedOfferId: null,
        appendReplies: [
          { review: { ...args.replyReview, values: v }, equivalent: true },
        ],
      }),
    ).rejects.toThrow(/coincidir|moneda/);
  }
  const { mergeReplyOffer } = await import("../src/domain/replyReview");
  const incoming = prepareReplyOffer(
    reply,
    {
      ...values,
      ingredient: riceRequest.ingredient,
      specification: riceRequest.specification,
    },
    true,
  );
  expect(() => mergeReplyOffer(original, incoming, false)).toThrow(/Confirma/);
  const full = {
    ...original,
    sources: {
      ...original.sources,
      retired1: original.sources[riceOffers[0].id],
      retired2: original.sources[riceOffers[1].id],
    },
  };
  expect(() => mergeReplyOffer(full, incoming, true)).toThrow(/cuatro fuentes/);
  expect((await t.query(api.comparisons.list, { token }))[0].revision).toBe(1);
});

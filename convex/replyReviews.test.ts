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

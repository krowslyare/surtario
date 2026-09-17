// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { ownerHash } from "./lib/demoSession";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const context = {
  priority: "cash" as const,
  budgetCents: null,
  dailyUsage: null,
  stockQuantity: null,
  maxCoverageDays: null,
  preferredOfferId: null,
};
async function setup() {
  const t = convexTest(schema, modules);
  const comparison = await t.mutation(api.comparisons.save, {
    token,
    clientId: "11111111-1111-4111-8111-111111111111",
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers.map((o) =>
      o.id === "rice-supplier-b" ? { ...o, freightCents: null } : o,
    ),
    selectedOfferId: "rice-supplier-a",
  });
  const request = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: comparison.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("quotationReplies", {
      requestId: request.id,
      eventId: "event-delivery",
      messageId: "reply-delivery",
      threadId: "thread",
      from: "supplier@example.test",
      text: "Delivery for this order is PEN 8.00.",
      receivedAt: "2026-09-14T12:00:00Z",
    });
    await ctx.db.insert("sourcingCases", {
      comparisonId: comparison.id,
      ownerHash: await ownerHash(token),
      ingredient: "Arroz",
      region: "Lima",
      objective: "Confirm delivery",
      status: "idle",
      revision: 1,
      steps: 0,
      researchRunIds: [],
      summary: "",
      createdAt: 1,
      updatedAt: 1,
      runs: 0,
    });
  });
  const args = {
    token,
    requestId: request.id,
    messageId: "reply-delivery",
    comparisonId: comparison.id,
    expectedRevision: 1,
    offerId: "rice-supplier-b",
    freightCents: 800,
    evidenceQuote: "Delivery for this order is PEN 8.00.",
    context,
    confirmed: true as const,
  };
  return { t, comparison, request, args };
}

test("confirms only freight atomically, preserves source and records exact before/after with idempotent retry", async () => {
  const { t, args, comparison } = await setup();
  const result = await t.mutation(api.quotationMail.confirmReplyDelivery, args);
  expect(result.alreadyApplied).toBe(false);
  expect(result.comparison.revision).toBe(2);
  expect(result.comparison.selectedOfferId).toBeNull();
  expect(result.comparison.offers[0]).toEqual(comparison.offers[0]);
  expect(result.comparison.offers[1]).toEqual({
    ...comparison.offers[1],
    freightCents: 800,
  });
  expect(result.comparison.sources[args.offerId].original).toEqual(
    comparison.sources[args.offerId].original,
  );
  // One complete offer is insufficient for a comparative recommendation.
  expect(result.confirmation.before.recommendedOfferId).toBeNull();
  expect(result.confirmation.before.action).toBe("research");
  expect(result.confirmation.after.recommendedOfferId).toBe("rice-supplier-b");
  expect(
    result.confirmation.after.alternatives.find(
      (a) => a.offerId === args.offerId,
    )?.totalCents,
  ).toBe(5800);
  const again = await t.mutation(api.quotationMail.confirmReplyDelivery, args);
  expect(again.alreadyApplied).toBe(true);
  expect(again.comparison.revision).toBe(2);
  expect(again.confirmation.id).toBe(result.confirmation.id);
  expect(
    await t.query(api.quotationMail.listDeliveryConfirmations, {
      token,
      comparisonId: comparison.id,
    }),
  ).toHaveLength(1);
  const events = await t.run((ctx) => ctx.db.query("sourcingEvents").collect());
  expect(events.filter((e) => e.kind === "delivery_confirmed")).toHaveLength(1);
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      freightCents: 900,
    }),
  ).rejects.toThrow("already confirmed with different data");
});

test("rejects foreign ownership, unrelated reply, stale revision, fabricated quote and overwriting resolved freight", async () => {
  const { t, args } = await setup();
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      token: "b".repeat(64),
    }),
  ).rejects.toThrow("unavailable");
  await expect(
    t.query(api.quotationMail.listDeliveryConfirmations, {
      token: "b".repeat(64),
      comparisonId: args.comparisonId,
    }),
  ).rejects.toThrow("unavailable");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      messageId: "wrong",
    }),
  ).rejects.toThrow("not linked");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      expectedRevision: 2,
    }),
  ).rejects.toThrow("changed in another view");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      evidenceQuote: "free delivery",
    }),
  ).rejects.toThrow("exactly");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      offerId: "rice-supplier-a",
    }),
  ).rejects.toThrow("already confirmed");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      offerId: "foreign-offer",
    }),
  ).rejects.toThrow("Choose an offer");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      freightCents: 8.5,
    }),
  ).rejects.toThrow("valid term value");
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, {
      ...args,
      context: { ...context, dailyUsage: 0 },
    }),
  ).rejects.toThrow("priorities");
  await t.run((ctx) =>
    ctx.db.patch(args.requestId, { comparisonId: undefined }),
  );
  await expect(
    t.mutation(api.quotationMail.confirmReplyDelivery, args),
  ).rejects.toThrow("not linked to this comparison");
  expect((await t.query(api.comparisons.list, { token }))[0].revision).toBe(1);
});

test("permits a study inquiry only when its study belongs to the same comparison case", async () => {
  const { t, args } = await setup();
  // Test linkage independently of catalog fixture creation.
  await t.run(async (ctx) => {
    const studyId = await ctx.db.insert("studies", {
      ownerHash: await ownerHash(token),
      clientId: "study",
      term: "Arroz",
      region: "Lima",
      results: [],
      selectedIds: [],
      prospects: [],
      revision: 1,
      updatedAt: 1,
    });
    const row = await ctx.db
      .query("sourcingCases")
      .withIndex("by_comparisonId", (q) =>
        q.eq("comparisonId", args.comparisonId),
      )
      .unique();
    await ctx.db.patch(row!._id, { studyId });
    await ctx.db.patch(args.requestId, { comparisonId: undefined, studyId });
  });
  expect(
    (await t.mutation(api.quotationMail.confirmReplyDelivery, args)).comparison
      .revision,
  ).toBe(2);
});

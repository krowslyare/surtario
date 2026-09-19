// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { riceOffers, riceRequest, usRiceOffers, usRiceRequest } from "../fixtures/procurement";
import { marketExamples } from "../fixtures/market";
import { preparePurchaseFromCatalog } from "../src/domain/market";
const modules = import.meta.glob("./**/*.ts");
const draft = {
  token: "a".repeat(64),
  clientId: "11111111-1111-4111-8111-111111111111",
  id: null,
  expectedRevision: 0,
  request: riceRequest,
  offers: riceOffers,
  selectedOfferId: "rice-supplier-b",
};
test("restores conditions, immutable evidence and a choice without writing purchases", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.comparisons.save, draft);
  expect(saved.selectedOfferId).toBe("rice-supplier-b");
  expect(saved.request.quantity).toBe(10);
  expect(saved).not.toHaveProperty("ownerHash");
  expect((await t.mutation(api.comparisons.save, draft)).id).toBe(saved.id);
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      request: { ...riceRequest, quantity: 20 },
    }),
  ).rejects.toThrow(/different data/);
  const next = await t.mutation(api.comparisons.save, {
    ...draft,
    id: saved.id,
    expectedRevision: 1,
    selectedOfferId: null,
    offers: riceOffers.map((o) => ({ ...o, freightCents: 2000 })),
  });
  expect(next.sources["rice-supplier-b"].original.freightCents).toBe(0);
  expect(next.sources["rice-supplier-b"].edited).toBe(true);
  expect(next.offers[1].freightCents).toBe(2000);
  expect(next.selectedOfferId).toBeNull();
  expect(
    (await t.query(api.comparisons.list, { token: draft.token }))[0],
  ).toEqual(next);
});
test("rejects another session and stale writes without overwriting a decision", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.comparisons.save, draft);
  expect(
    await t.query(api.comparisons.list, { token: "b".repeat(64) }),
  ).toEqual([]);
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      id: saved.id,
      expectedRevision: 1,
      token: "b".repeat(64),
    }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.comparisons.save, { ...draft, id: saved.id }),
  ).rejects.toThrow(/another view/);
  await expect(
    t.query(api.comparisons.list, { token: "invalid" }),
  ).rejects.toThrow(/session/);
  expect(
    (await t.query(api.comparisons.list, { token: draft.token }))[0].revision,
  ).toBe(1);
});
test("pending catalog can be saved, but cannot be chosen until conditions are complete", async () => {
  const t = convexTest(schema, modules);
  const seed = preparePurchaseFromCatalog(marketExamples, true);
  const pending = {
    ...draft,
    request: seed.request,
    offers: seed.offers,
    selectedOfferId: null,
  };
  const saved = await t.mutation(api.comparisons.save, pending);
  expect(saved.request.quantity).toBe(0);
  expect(saved.sources["catalog-a"].marketSource?.simulated).toBe(true);
  await expect(
    t.mutation(api.comparisons.save, {
      ...pending,
      id: saved.id,
      expectedRevision: 1,
      selectedOfferId: "catalog-a",
    }),
  ).rejects.toThrow(/Complete the quantity and conditions/);
  await expect(
    t.mutation(api.comparisons.save, { ...draft, selectedOfferId: "missing" }),
  ).rejects.toThrow(/Complete the quantity and conditions/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      offers: riceOffers.map((o) => ({ ...o, freightCents: null })),
    }),
  ).rejects.toThrow(/Complete the quantity and conditions/);
});
test("rejects arbitrary text, duplicate offers, malformed numbers and unbounded writes", async () => {
  const t = convexTest(schema, modules);
  for (const overrides of [
    { request: { ...riceRequest, ingredient: "private" } },
    { offers: [{ ...riceOffers[0], supplier: "private" }] },
    { offers: [riceOffers[0], riceOffers[0]] },
    { offers: [] },
    { offers: [{ ...riceOffers[0], priceCents: 1.5 }] },
    { offers: [{ ...riceOffers[0], packageContent: Infinity }] },
    { request: { ...riceRequest, quantity: -1 } },
    { expectedRevision: 0.5 },
  ])
    await expect(
      t.mutation(api.comparisons.save, { ...draft, ...overrides }),
    ).rejects.toThrow();
  for (let i = 0; i < 10; i++)
    await t.mutation(api.comparisons.save, {
      ...draft,
      clientId: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
    });
  await expect(t.mutation(api.comparisons.save, draft)).rejects.toThrow(
    /10 comparisons/,
  );
});

test("updates use saved identities and retain evidence when an offer is removed", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.comparisons.save, draft);
  // Emulate a snapshot from an older fixture version without changing live fixtures.
  const sources = structuredClone(saved.sources);
  sources["rice-supplier-a"].original.supplier = "Proveedor A anterior";
  sources["rice-supplier-a"].date = "2026-09-01";
  await t.run(async (ctx) => {
    await ctx.db.patch("comparisons", saved.id, { sources });
  });
  const removed = await t.mutation(api.comparisons.save, {
    ...draft,
    id: saved.id,
    expectedRevision: 1,
    offers: [riceOffers[1]],
  });
  expect(removed.sources["rice-supplier-a"].date).toBe("2026-09-01");
  const restored = await t.mutation(api.comparisons.save, {
    ...draft,
    id: saved.id,
    expectedRevision: 2,
    offers: [
      { ...riceOffers[0], supplier: "Proveedor A anterior" },
      riceOffers[1],
    ],
  });
  expect(restored.sources["rice-supplier-a"]).toEqual(
    sources["rice-supplier-a"],
  );
});

test("case linking is owned, atomic, immutable across comparisons and retry safe", async () => {
  const t = convexTest(schema, modules);
  const { ownerHash } = await import("./lib/demoSession");
  const sourcingCaseId = await t.run(async (ctx) =>
    ctx.db.insert("sourcingCases", {
      ownerHash: await ownerHash(draft.token),
      ingredient: "Arroz",
      region: "Lima",
      objective: "Explore",
      status: "idle",
      revision: 1,
      steps: 0,
      runs: 0,
      researchRunIds: [],
      summary: "",
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      token: "b".repeat(64),
      sourcingCaseId,
    }),
  ).rejects.toThrow(/case unavailable/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      sourcingCaseId,
      request: { ...draft.request, ingredient: "Oil" },
    }),
  ).rejects.toThrow(/ingredient must match/);
  const saved = await t.mutation(api.comparisons.save, {
    ...draft,
    sourcingCaseId,
  });
  expect(
    (await t.mutation(api.comparisons.save, { ...draft, sourcingCaseId })).id,
  ).toBe(saved.id);
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      sourcingCaseId,
      clientId: "22222222-2222-4222-8222-222222222222",
    }),
  ).rejects.toThrow(/already has a saved comparison/);
  expect(
    await t.query(api.comparisons.list, { token: draft.token }),
  ).toHaveLength(1);
  const events = await t.run((ctx) =>
    ctx.db
      .query("sourcingEvents")
      .withIndex("by_caseId", (q) => q.eq("caseId", sourcingCaseId))
      .take(10),
  );
  expect(events).toHaveLength(1);
  expect(events[0].kind).toBe("comparison_saved");
  const anotherCase = await t.run(async (ctx) => {
    const row = await ctx.db.get(sourcingCaseId);
    const { _id, _creationTime, comparisonId, ...fields } = row!;
    return ctx.db.insert("sourcingCases", {
      ...fields,
      objective: "Another case",
    });
  });
  await expect(
    t.mutation(api.comparisons.save, {
      ...draft,
      id: saved.id,
      expectedRevision: 1,
      sourcingCaseId: anotherCase,
    }),
  ).rejects.toThrow(/another sourcing case/);
  expect(
    (await t.query(api.comparisons.list, { token: draft.token }))[0].revision,
  ).toBe(1);
});


test("US sample saves immutable USD/lb evidence and rejects mixed or forged identities", async () => {
  const t = convexTest(schema, modules);
  const usDraft = { ...draft, request: usRiceRequest, offers: usRiceOffers, selectedOfferId: null };
  const saved = await t.mutation(api.comparisons.save, usDraft);
  const selected = await t.mutation(api.comparisons.save, {
    ...usDraft, id: saved.id, expectedRevision: saved.revision,
    selectedOfferId: "us-rice-supplier-b",
  });
  expect((await t.query(api.comparisons.list, { token: draft.token }))[0]).toEqual(selected);
  expect(selected.request.unit).toBe("lb");
  expect(selected.sources["us-rice-supplier-b"].original).toEqual(usRiceOffers[1]);
  for (const offers of [
    [usRiceOffers[0], riceOffers[1]],
    [{ ...usRiceOffers[0], id: "invented" }],
    [{ ...usRiceOffers[0], supplier: "invented" }],
  ]) {
    await expect(t.mutation(api.comparisons.save, { ...usDraft, offers })).rejects.toThrow();
  }
  await expect(t.mutation(api.comparisons.save, {
    ...usDraft, request: { ...usRiceRequest, unit: "kg" },
  })).rejects.toThrow(/identity/);
});

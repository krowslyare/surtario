// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { draftValues, extractionToPurchase } from "../src/domain/extraction";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
async function setup() {
  const t = convexTest(schema, modules);
  const id = await t.run(async (ctx) =>
    ctx.db.insert("documentRuns", {
      ownerHash: await ownerHash(token),
      clientId: "fixture",
      kind: "pdf",
      createdAt: Date.UTC(2026, 8, 8),
      status: "complete",
      error: null,
      result: {
        documentType: "quotation",
        transcript: extractionSource.text,
        offer: extractionExample,
      },
    }),
  );
  const values = {
    ...draftValues(extractionExample),
    price: "85",
    packageContent: "18",
    packageUnit: "kg",
  };
  const seed = extractionToPurchase(
    { ...extractionSource, id },
    extractionExample,
    values,
    true,
  );
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
    selectedOfferId: id as string | null,
    documentReview: { runId: id, values, confirmed: true as const },
  };
  return { t, args, id };
}
test("document correction, original, source and decision survive save, retry and updates", async () => {
  const { t, args, id } = await setup();
  const saved = await t.mutation(api.comparisons.save, args);
  expect(saved.sources[id].marketSource?.url).toBe(
    "/examples/cotizacion-demo.pdf",
  );
  expect(saved.sources[id].marketSource?.simulated).toBe(true);
  expect(
    saved.sources[id].marketSource?.evidence.split(
      "\n\nReview with manual corrections:",
    )[0],
  ).toBe(extractionSource.text);
  expect(saved.sources[id].extraction?.proposed.price.value).toBe("80.00");
  expect(saved.sources[id].extraction?.reviewed.price).toBe("85");
  expect(saved.sources[id].original.priceCents).toBe(8500);
  expect(saved.selectedOfferId).toBe(id);
  expect((await t.mutation(api.comparisons.save, args)).id).toBe(saved.id);
  expect(
    await t.query(api.comparisons.list, { token: "b".repeat(64) }),
  ).toEqual([]);
  const updated = await t.mutation(api.comparisons.save, {
    ...args,
    id: saved.id,
    documentReview: undefined,
    expectedRevision: 1,
    offers: args.offers.map((o) => ({ ...o, priceCents: 9000 })),
  });
  expect(updated.sources[id].extraction).toEqual(saved.sources[id].extraction);
  expect(updated.sources[id].original.priceCents).toBe(8500);
  expect(updated.sources[id].marketSource?.simulated).toBe(true);
  expect(updated.offers[0].priceCents).toBe(9000);
  expect(updated.sources[id].edited).toBe(true);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      id: saved.id,
      expectedRevision: 1,
    }),
  ).rejects.toThrow(/another view/);
});
test("foreign, non-quotation, incomplete and malformed document references are rejected", async () => {
  const { t, args, id } = await setup();
  await expect(
    t.mutation(api.comparisons.save, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      documentReview: {
        ...args.documentReview,
        values: { ...args.documentReview.values, price: "x".repeat(121) },
      },
    }),
  ).rejects.toThrow(/Invalid/);
  await expect(
    t.mutation(api.comparisons.save, { ...args, webReviews: [] }),
  ).rejects.toThrow(/Do not mix/);
  await t.run(async (ctx) => ctx.db.patch(id, { status: "running" }));
  await expect(t.mutation(api.comparisons.save, args)).rejects.toThrow(
    /complete quote reading/,
  );
  await t.run(async (ctx) =>
    ctx.db.patch(id, {
      status: "complete",
      result: {
        documentType: "purchase",
        transcript: extractionSource.text,
        offer: extractionExample,
      },
    }),
  );
  await expect(t.mutation(api.comparisons.save, args)).rejects.toThrow(
    /quote reading/,
  );
});
test("a retried creation cannot replace the confirmed evidence with a new correction", async () => {
  const { t, args } = await setup();
  await t.mutation(api.comparisons.save, args);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      documentReview: {
        ...args.documentReview,
        values: { ...args.documentReview.values, price: "90" },
      },
    }),
  ).rejects.toThrow(/different data/);
});

// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { draftValues, extractionToPurchase } from "../src/domain/extraction";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
async function setup(simulated = false) {
  const t = convexTest(schema, modules);
  const reserved = await t.mutation(internal.research.reserveSearch, {
    token,
    clientId: "11111111-1111-4111-8111-111111111111",
    ingredient: "Arroz",
    region: "Lima",
  });
  await t.mutation(internal.research.finishSearch, {
    id: reserved.run.id,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Fuente pública",
        description: "Prueba",
        markdown: extractionSource.text,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated,
  });
  await t.mutation(internal.research.reserveExtraction, {
    token,
    runId: reserved.run.id,
    sourceIndex: 0,
  });
  await t.mutation(internal.research.finishExtraction, {
    runId: reserved.run.id,
    sourceIndex: 0,
    offer: extractionExample,
  });
  const values = {
    ...draftValues(extractionExample),
    price: "85",
    packageUnit: "kg",
    packageContent: "18",
  };
  const ref = `${reserved.run.id}:0`;
  const seed = extractionToPurchase(
    { ...extractionSource, id: ref },
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
    offers: seed.offers.map((offer) => ({
      ...offer,
      minimumPackages: 1,
      freightCents: 1500,
      taxStatus: "included" as const,
      deliveryConfirmed: true,
    })),
    selectedOfferId: ref,
    webReviews: [
      {
        runId: reserved.run.id,
        sourceIndex: 0,
        values,
        confirmed: true as const,
      },
    ],
  };
  return { t, args, ref };
}
test("web review preserves source proposal, correction, conditions and idempotent recovery", async () => {
  const { t, args, ref } = await setup();
  const saved = await t.mutation(api.comparisons.save, args);
  expect(saved.sources[ref].marketSource?.url).toBe(
    "https://supplier.test/rice",
  );
  expect(saved.sources[ref].extraction?.proposed.price.value).toBe("80.00");
  expect(saved.sources[ref].extraction?.reviewed.price).toBe("85");
  expect(saved.sources[ref].original.priceCents).toBe(8500);
  expect(saved.selectedOfferId).toBe(ref);
  expect((await t.mutation(api.comparisons.save, args)).id).toBe(saved.id);
  const updated = await t.mutation(api.comparisons.save, {
    ...args,
    webReviews: undefined,
    id: saved.id,
    expectedRevision: 1,
    request: { ...args.request, quantity: 20 },
    selectedOfferId: null,
  });
  expect(updated.sources).toEqual(saved.sources);
  expect(updated.revision).toBe(2);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      id: saved.id,
      expectedRevision: 1,
    }),
  ).rejects.toThrow(/otra vista/);
});
test("synthetic provenance survives the saved run after rehearsal configuration is gone", async () => {
  const { t, args, ref } = await setup(true);
  const run = (await t.query(api.research.list, { token }))[0];
  expect(run.simulated).toBe(true);
  const saved = await t.mutation(api.comparisons.save, args);
  expect(saved.sources[ref].marketSource?.simulated).toBe(true);
});
test("rejects foreign sources, missing extraction, malformed corrections and duplicate source refs", async () => {
  const { t, args } = await setup();
  await expect(
    t.mutation(api.comparisons.save, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/no disponible/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      webReviews: [args.webReviews[0], args.webReviews[0]],
    }),
  ).rejects.toThrow(/dos veces/);
  for (const values of [
    { ...args.webReviews[0].values, price: "1,234.00" },
    { ...args.webReviews[0].values, supplier: "x".repeat(121) },
  ])
    await expect(
      t.mutation(api.comparisons.save, {
        ...args,
        webReviews: [{ ...args.webReviews[0], values }],
      }),
    ).rejects.toThrow();
  await t.run(async (ctx) => {
    const run = (await ctx.db.get(args.webReviews[0].runId))!;
    await ctx.db.patch(run._id, {
      sources: run.sources.map((source) => ({
        ...source,
        extraction: null,
        extractionStatus: "idle",
      })),
    });
  });
  await expect(t.mutation(api.comparisons.save, args)).rejects.toThrow(
    /no está completa/,
  );
});
test("same offer values cannot disguise changed review evidence on create retry", async () => {
  const { t, args } = await setup();
  await t.mutation(api.comparisons.save, args);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      webReviews: [
        {
          ...args.webReviews[0],
          values: { ...args.webReviews[0].values, price: "85.00" },
        },
      ],
    }),
  ).rejects.toThrow(/otros datos/);
});

test("legacy extractions cannot bypass current source quality checks", async () => {
  const { t, args } = await setup();
  for (const markdown of [
    "Ha habido un error crítico en esta web.",
    "Arbitraje de consumo y registro de proveedores.",
  ]) {
    await t.run(async (ctx) => {
      const run = (await ctx.db.get(args.webReviews[0].runId))!;
      await ctx.db.patch(run._id, {
        sources: run.sources.map((source) => ({ ...source, markdown })),
      });
    });
    await expect(t.mutation(api.comparisons.save, args)).rejects.toThrow(
      /evidencia utilizable/,
    );
  }
});

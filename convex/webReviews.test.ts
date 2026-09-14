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
  ).rejects.toThrow(/another view/);
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
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.comparisons.save, {
      ...args,
      webReviews: [args.webReviews[0], args.webReviews[0]],
    }),
  ).rejects.toThrow(/twice/);
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
    /incomplete/,
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
  ).rejects.toThrow(/different data/);
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
      /usable evidence/,
    );
  }
});

test("analyzed web evidence keeps the same source fingerprint after saving", async () => {
  const { t, args, ref } = await setup(true);
  await t.run(async ctx => {
    const run = await ctx.db.get(args.webReviews[0].runId);
    await ctx.db.patch(run!._id, {
      sources: run!.sources.map(source => ({ ...source, analysis: {
        kind: "product" as const, summary: "A synthetic rice quotation.",
        evidence: ["Saco: S/ 80.00"], warnings: ["Pack weight requires review."],
      } })),
    });
  });
  const [run] = await t.query(api.research.list, { token });
  const source = run.sources[0];
  const { reviewedWebEvidence } = await import("../src/domain/webEvidence");
  const clientSeed = extractionToPurchase({
    id: ref, title: source.title, url: source.url,
    text: reviewedWebEvidence(source),
    observedAt: source.observedAt ?? run.observedAt, simulated: run.simulated,
  }, source.extraction!, args.webReviews[0].values, true);
  clientSeed.sources[ref].webReview = args.webReviews[0];
  const saved = await t.mutation(api.comparisons.save, {
    ...args, request: { ...clientSeed.request, quantity: 40 },
    offers: clientSeed.offers, selectedOfferId: null,
  });
  expect(saved.sources[ref]).toEqual(clientSeed.sources[ref]);
  expect(saved.sources[ref].marketSource?.evidence).toContain("Proposed source analysis (requires review): A synthetic rice quotation.");
});

test("reviewed later web evidence updates the same comparison and preserves earlier sources", async () => {
  const {t,args,ref} = await setup();
  const first = await t.mutation(api.comparisons.save,args);
  const run = args.webReviews[0].runId;
  const secondRun = await t.run(async ctx => {
    const row=(await ctx.db.get(run))!;const {_id,_creationTime,...fields}=row;
    return ctx.db.insert("researchRuns",{...fields,clientId:crypto.randomUUID()});
  });
  const nextRef=`${secondRun}:0`;
  const updated=await t.mutation(api.comparisons.save,{
    token,clientId:crypto.randomUUID(),id:first.id,expectedRevision:first.revision,
    request:first.request,offers:[{...first.offers[0],id:nextRef,priceCents:9000}],selectedOfferId:null,
    appendWeb:[{review:{...args.webReviews[0],runId:secondRun,values:{...args.webReviews[0].values,price:"90"}},equivalent:true}],
  });
  expect(updated.id).toBe(first.id);expect(updated.revision).toBe(2);
  expect(updated.sources[ref]).toEqual(first.sources[ref]);expect(updated.sources[nextRef].original.priceCents).toBe(9000);
  expect(updated.offers[0].id).toBe(nextRef);
  await expect(t.mutation(api.comparisons.save,{
    token:"b".repeat(64),clientId:crypto.randomUUID(),id:first.id,expectedRevision:2,request:first.request,offers:updated.offers,selectedOfferId:null,
    appendWeb:[{review:{...args.webReviews[0],runId:secondRun},equivalent:true}],
  })).rejects.toThrow(/unavailable/);
});

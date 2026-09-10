// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { marketExamples } from "../fixtures/market";
const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(64),
  tokenB = "b".repeat(64);
const draft = {
  token: tokenA,
  clientId: "11111111-1111-4111-8111-111111111111",
  id: null,
  expectedRevision: 0,
  term: "Arroz",
  region: "Lima",
  selectedIds: ["catalog-a", "distributor-c"],
};

test("saves server snapshots, retries once, and never exposes session credentials", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  expect(saved.results).toEqual(marketExamples);
  expect(saved.selectedIds).toEqual(draft.selectedIds);
  expect(saved).not.toHaveProperty("ownerHash");
  expect(saved).not.toHaveProperty("token");
  expect((await t.mutation(api.studies.save, draft)).id).toBe(saved.id);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      selectedIds: ["catalog-b", "distributor-c"],
    }),
  ).rejects.toThrow(/otra selección/);
  expect(await t.query(api.studies.list, { token: tokenA })).toHaveLength(1);
});
test("a second capability cannot read or update another study even with its ID", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  expect(await t.query(api.studies.list, { token: tokenB })).toEqual([]);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      token: tokenB,
      id: saved.id,
      expectedRevision: 1,
    }),
  ).rejects.toThrow(/no disponible/);
  await expect(t.query(api.studies.list, { token: "invalid" })).rejects.toThrow(
    /Sesión/,
  );
  expect((await t.query(api.studies.list, { token: tokenA }))[0].revision).toBe(
    1,
  );
});
test("stale updates are rejected while source evidence remains unchanged", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  const update = {
    ...draft,
    id: saved.id,
    expectedRevision: 1,
    selectedIds: ["catalog-b"],
  };
  const updated = await t.mutation(api.studies.save, update);
  expect(updated.revision).toBe(2);
  expect(updated.results).toEqual(saved.results);
  await expect(t.mutation(api.studies.save, update)).rejects.toThrow(
    /otra vista/,
  );
  expect(
    (await t.query(api.studies.list, { token: tokenA }))[0].selectedIds,
  ).toEqual(["catalog-b"]);
});
test("anonymous persistence accepts only bounded synthetic studies", async () => {
  const t = convexTest(schema, modules);
  for (const overrides of [
    { term: "Private restaurant" },
    { region: "Cusco" },
    { selectedIds: ["forged-price"] },
    { selectedIds: [] },
    { selectedIds: Array(5).fill("catalog-a") },
    { expectedRevision: -1 },
  ]) {
    await expect(
      t.mutation(api.studies.save, { ...draft, ...overrides }),
    ).rejects.toThrow();
  }
  for (let i = 0; i < 10; i++)
    await t.mutation(api.studies.save, {
      ...draft,
      clientId: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
    });
  await expect(t.mutation(api.studies.save, draft)).rejects.toThrow(
    /10 estudios/,
  );
  expect(await t.query(api.studies.list, { token: tokenA })).toHaveLength(10);
});

async function webStudy() {
  const t = convexTest(schema, modules);
  const { extractionExample, extractionSource } = await import(
    "../fixtures/extraction"
  );
  const { draftValues } = await import("../src/domain/extraction");
  const reserved = await t.mutation(internal.research.reserveSearch, {
    token: tokenA,
    clientId: draft.clientId,
    ingredient: "Arroz",
    region: "Lima",
  });
  const runId = reserved.run.id;
  await t.mutation(internal.research.finishSearch, {
    id: runId,
    simulated: true,
    discarded: 0,
    warning: false,
    sources: [
      {
        url: "https://supplier.test/rice",
        title: "Arroz de prueba",
        description: "Prueba sintética",
        markdown: extractionSource.text,
        contentTruncated: false,
      },
    ],
  });
  await t.mutation(internal.research.reserveExtraction, {
    token: tokenA,
    runId,
    sourceIndex: 0,
  });
  await t.mutation(internal.research.finishExtraction, {
    runId,
    sourceIndex: 0,
    offer: extractionExample,
  });
  const prospect = await t.mutation(api.prospects.save, {
    token: tokenA,
    runId,
    sourceIndex: 0,
    supplier: "Candidato de prueba",
    contact: "",
    confirmed: true,
  });
  const review = {
    runId,
    sourceIndex: 0,
    confirmed: true as const,
    values: {
      ...draftValues(extractionExample),
      packageUnit: "kg",
      packageContent: "18",
      price: "85",
    },
  };
  return { t, review, prospect, ref: `${runId}:0` };
}
test("study restores reviewed web evidence, no-price candidates and examples without requiring quantity", async () => {
  const { t, review, prospect, ref } = await webStudy();
  const args = { ...draft, webReviews: [review], prospectIds: [prospect.id] };
  const saved = await t.mutation(api.studies.save, args);
  const [restored] = await t.query(api.studies.list, { token: tokenA });
  expect(restored).toEqual(saved);
  expect(restored.selectedIds).toEqual(["catalog-a", "distributor-c"]);
  const seed = restored.webSelections![0].seed;
  expect(seed.request.quantity).toBe(0);
  expect(seed.offers[0].priceCents).toBe(8500);
  expect(seed.offers[0].freightCents).toBeNull();
  expect(seed.offers[0].minimumPackages).toBeNull();
  expect(seed.sources[ref].marketSource?.simulated).toBe(true);
  expect(seed.sources[ref].extraction?.proposed.price.value).toBe("80.00");
  expect(restored.prospects![0].contact).toBeNull();
  expect(restored.prospects![0]).not.toHaveProperty("ownerHash");
  expect((await t.mutation(api.studies.save, args)).id).toBe(saved.id);
  await expect(
    t.mutation(api.studies.save, {
      ...args,
      webReviews: [{ ...review, values: { ...review.values, price: "90" } }],
    }),
  ).rejects.toThrow(/otra selección/);
});
test("web-only studies and unknown prices persist; foreign refs, duplicates and stale edits are refused", async () => {
  const { t, review, prospect } = await webStudy();
  const args = {
    ...draft,
    selectedIds: [],
    webReviews: [{ ...review, values: { ...review.values, price: "" } }],
    prospectIds: [prospect.id],
  };
  const saved = await t.mutation(api.studies.save, args);
  expect(saved.webSelections![0].seed.offers[0].priceCents).toBeNull();
  for (const overrides of [
    { token: tokenB },
    { webReviews: [review, review] },
    { prospectIds: [prospect.id, prospect.id] },
  ])
    await expect(
      t.mutation(api.studies.save, { ...args, ...overrides }),
    ).rejects.toThrow();
  await expect(
    t.mutation(api.studies.save, { ...args, token: tokenB, webReviews: [] }),
  ).rejects.toThrow(/no disponible/);
  const updated = await t.mutation(api.studies.save, {
    ...args,
    id: saved.id,
    expectedRevision: 1,
    webReviews: [],
  });
  expect(updated.webSelections).toEqual([]);
  expect(updated.prospects).toHaveLength(1);
  await expect(
    t.mutation(api.studies.save, {
      ...args,
      id: saved.id,
      expectedRevision: 1,
    }),
  ).rejects.toThrow(/otra vista/);
});

test("a study refuses unrelated research contexts even when every source is owned", async () => {
  const { t, review, prospect } = await webStudy();
  await t.run(async (ctx) => {
    await ctx.db.patch("webProspects", prospect.id, { ingredient: "Aceite" });
  });
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      webReviews: [review],
      prospectIds: [prospect.id],
    }),
  ).rejects.toThrow(/un insumo y una zona/);
  await t.run(async (ctx) => {
    await ctx.db.patch("researchRuns", review.runId, { region: "Cusco" });
  });
  await expect(
    t.mutation(api.studies.save, { ...draft, webReviews: [review] }),
  ).rejects.toThrow(/un insumo y una zona/);
  const onlyWeb = await t.mutation(api.studies.save, {
    ...draft,
    selectedIds: [],
    webReviews: [review],
  });
  expect(onlyWeb.region).toBe("Cusco");
  expect(onlyWeb.webSelections![0].region).toBe("Cusco");
});

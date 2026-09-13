// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { preparePurchaseFromCatalog } from "../src/domain/market";
import { usMarketExamples } from "../fixtures/market";
import { extractedOfferSchema } from "./lib/extraction";

const modules = import.meta.glob("./**/*.ts");
const token = "c".repeat(64);

test("the OpenAI extraction contract accepts explicit ounce evidence", () => {
  const field = { value: null, evidence: null };
  const parsed = extractedOfferSchema.parse({
    supplier: field,
    ingredient: field,
    specification: field,
    packageContent: { value: "160", evidence: "160 oz bag" },
    packageUnit: { value: "oz", evidence: "160 oz bag" },
    price: field,
    currency: field,
  });
  expect(parsed.packageUnit.value).toBe("oz");
});

test("the server calculates and persists an owned lb comparison", async () => {
  const t = convexTest(schema, modules);
  const seed = preparePurchaseFromCatalog(usMarketExamples, true);
  const request = { ...seed.request, quantity: 40 };
  const offers = seed.offers.map((item) => ({
    ...item,
    minimumPackages: 1,
    freightCents: 0,
    taxStatus: "included" as const,
    deliveryConfirmed: true,
  }));
  const calculated = await t.query(api.comparison.calculate, { request, offers });
  expect(calculated.evaluations.map((item) => item.packageCount)).toEqual([2, 1]);
  expect(calculated.evaluations.map((item) => item.totalCents)).toEqual([4000, 3500]);
  const saved = await t.mutation(api.comparisons.save, {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request,
    offers,
    selectedOfferId: "us-catalog-b",
  });
  expect(saved.request.unit).toBe("lb");
  expect(saved.offers.map((item) => item.packageUnit)).toEqual(["lb", "lb"]);
  expect(saved.sources["us-catalog-a"].marketSource?.simulated).toBe(true);
});

test("US studies persist only the matching server-owned context", async () => {
  const t = convexTest(schema, modules);
  const draft = {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    term: "Rice",
    region: "Portland, OR, US",
    selectedIds: ["us-catalog-a", "us-distributor-c"],
  };
  const saved = await t.mutation(api.studies.save, draft);
  expect(saved.results).toEqual(usMarketExamples);
  expect(saved.selectedIds).toEqual(draft.selectedIds);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      id: saved.id,
      expectedRevision: 1,
      term: "Arroz",
      region: "Lima",
      selectedIds: ["catalog-a"],
    }),
  ).rejects.toThrow(/conserva un insumo, una zona y sus fuentes/);
  expect(
    (await t.query(api.studies.list, { token }))[0],
  ).toMatchObject({
    term: "Rice",
    region: "Portland, OR, US",
    selectedIds: draft.selectedIds,
    results: usMarketExamples,
    revision: 1,
  });
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      term: "Arroz",
      region: "Lima",
      selectedIds: ["catalog-a"],
    }),
  ).rejects.toThrow(/otra selección/);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      clientId: crypto.randomUUID(),
      selectedIds: ["us-catalog-a", "catalog-a"],
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      clientId: crypto.randomUUID(),
      term: "Arroz",
      region: "Lima",
    }),
  ).rejects.toThrow();
});

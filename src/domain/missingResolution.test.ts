import { describe, expect, test } from "vitest";
import type { ProcurementRequest, SupplierOffer } from "./procurement";
import {
  compareFreightScenario,
  resolveMissingConditions,
} from "./missingResolution";

const request: ProcurementRequest = {
  ingredient: "Rice",
  specification: "Long-grain white rice",
  quantity: 40,
  unit: "lb",
};

const pending: SupplierOffer = {
  id: "pending-freight",
  supplier: "Supplier A",
  ingredient: request.ingredient,
  specification: request.specification,
  packageContent: 25,
  packageUnit: "lb",
  priceCents: 2000,
  currency: "USD",
  minimumPackages: 1,
  freightCents: null,
  taxStatus: "included",
  deliveryConfirmed: true,
};

const complete: SupplierOffer = {
  ...pending,
  id: "complete",
  supplier: "Supplier B",
  packageContent: 50,
  priceCents: 5000,
  freightCents: 0,
};

describe("resolveMissingConditions", () => {
  test("derives the inclusive freight boundary from deterministic totals", () => {
    const [resolution] = resolveMissingConditions(request, [pending, complete]);
    expect(resolution).toMatchObject({
      offerId: "pending-freight",
      benchmarkOfferIds: ["complete"],
      maxFreightCents: 1000,
      outcome: "can-match",
      evidence: {
        sourceOfferIds: ["pending-freight", "complete"],
        pendingSubtotalCents: 4000,
        benchmarkTotalCents: 5000,
        hypotheticalFreightCents: 1000,
        hypotheticalTotalCents: 5000,
      },
    });
    expect(resolution.questionDraft).toContain("USD 10.00 or less");
  });

  test("keeps all tied benchmark source IDs", () => {
    const tie = { ...complete, id: "complete-tie", supplier: "Supplier C" };
    const [resolution] = resolveMissingConditions(request, [
      pending,
      tie,
      complete,
    ]);
    expect(resolution.benchmarkOfferIds).toEqual(["complete", "complete-tie"]);
    expect(resolution.evidence.sourceOfferIds).toEqual([
      "pending-freight",
      "complete",
      "complete-tie",
    ]);
  });

  test("reports zero as a valid exact-match boundary", () => {
    const [resolution] = resolveMissingConditions(request, [
      pending,
      { ...complete, priceCents: 4000 },
    ]);
    expect(resolution.maxFreightCents).toBe(0);
    expect(resolution.outcome).toBe("can-match");
    expect(resolution.evidence.hypotheticalTotalCents).toBe(4000);
  });

  test("identifies when merchandise already costs more than the benchmark", () => {
    const expensive = { ...pending, priceCents: 3000 };
    const [resolution] = resolveMissingConditions(request, [
      expensive,
      complete,
    ]);
    expect(resolution.maxFreightCents).toBe(-1000);
    expect(resolution.outcome).toBe("already-more-expensive");
    expect(resolution.explanation).toContain("USD 10.00 above");
    expect(resolution.evidence).toMatchObject({
      hypotheticalFreightCents: 0,
      hypotheticalTotalCents: 6000,
    });
  });

  test("does not create a threshold across currency, specification, or unit", () => {
    expect(
      resolveMissingConditions(request, [
        pending,
        { ...complete, currency: "PEN" },
      ]),
    ).toEqual([]);
    expect(
      resolveMissingConditions(request, [
        { ...pending, specification: "Brown rice" },
        complete,
      ]),
    ).toEqual([]);
    expect(
      resolveMissingConditions(request, [
        { ...pending, packageUnit: "L" },
        complete,
      ]),
    ).toEqual([]);
  });

  test("requires freight to be the only pending condition and never estimates tax", () => {
    for (const incomplete of [
      { ...pending, priceCents: null },
      { ...pending, minimumPackages: null },
      { ...pending, taxStatus: "unknown" as const },
      { ...pending, taxStatus: "excluded" as const },
      { ...pending, deliveryConfirmed: false },
    ]) {
      expect(resolveMissingConditions(request, [incomplete, complete])).toEqual(
        [],
      );
    }
  });
});

test("compareFreightScenario preserves the source ID and shows before/after eligibility", () => {
  const result = compareFreightScenario(request, pending, 1000);
  expect(result.sourceOfferId).toBe("pending-freight");
  expect(result.before.totalCents).toBeNull();
  expect(result.before.eligibleForComparison).toBe(false);
  expect(result.after.totalCents).toBe(5000);
  expect(result.after.eligibleForComparison).toBe(true);
  expect(() => compareFreightScenario(request, pending, -1)).toThrow(
    /non-negative integer/,
  );
});

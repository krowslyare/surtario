import { describe, expect, test } from "vitest";
import type { ProcurementRequest, SupplierOffer } from "./procurement";
import {
  compareFreightScenario,
  previewFreightDecision,
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

const decisionContext: import("./advisor").AdvisorContext = {
  priority: "cash",
  budgetCents: null,
  dailyUsage: null,
  stockQuantity: null,
  maxCoverageDays: null,
  preferredOfferId: null,
};

test.each([
  { freight: 500, total: 4500, difference: -500, choice: "pending-freight" },
  { freight: 1000, total: 5000, difference: 0, choice: "pending-freight" },
  { freight: 1500, total: 5500, difference: 500, choice: "complete" },
])(
  "connects a confirmed freight amount of $freight cents to the decision",
  ({ freight, total, difference, choice }) => {
    const result = previewFreightDecision(
      request,
      [pending, complete],
      decisionContext,
      pending.id,
      freight,
    );
    expect(result.before).toMatchObject({
      action: "research",
      recommendedOfferId: null,
    });
    expect(result.after).toMatchObject({
      action: "buy",
      recommendedOfferId: choice,
    });
    expect(result.totalCents).toBe(total);
    expect(result.differenceCents).toBe(difference);
    expect(result.decisionChanged).toBe(true);
    expect(result.finding.questionDraft).toContain("2 packs of 25 lb Rice");
    expect(pending.freightCents).toBeNull();
  },
);

test("uses the operator priority instead of silently substituting lowest outlay", () => {
  const result = previewFreightDecision(
    request,
    [pending, complete],
    { ...decisionContext, priority: "unit_price" },
    pending.id,
    1500,
  );
  expect(result.after.recommendedOfferId).toBe("pending-freight");
  expect(result.differenceCents).toBe(500);
});

test("a confirmed answer can leave the decision blocked by the real budget", () => {
  const result = previewFreightDecision(
    request,
    [pending, complete],
    { ...decisionContext, budgetCents: 4400 },
    pending.id,
    500,
  );
  expect(result.before.action).toBe("clarify");
  expect(result.after).toMatchObject({
    action: "clarify",
    recommendedOfferId: null,
  });
  expect(result.decisionChanged).toBe(false);
});

test("rejects a stale question and unsupported freight without changing other terms", () => {
  expect(() =>
    previewFreightDecision(
      request,
      [{ ...pending, freightCents: 0 }, complete],
      decisionContext,
      pending.id,
      500,
    ),
  ).toThrow(/no longer matches/);
  expect(() =>
    previewFreightDecision(
      request,
      [pending, complete],
      decisionContext,
      pending.id,
      Number.MAX_SAFE_INTEGER,
    ),
  ).toThrow();
  const result = previewFreightDecision(
    request,
    [pending, complete],
    decisionContext,
    pending.id,
    500,
  );
  expect(result.updatedOffer).toEqual({ ...pending, freightCents: 500 });
});

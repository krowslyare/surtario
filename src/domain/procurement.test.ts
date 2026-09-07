import { describe, expect, it } from "vitest";
import { riceOffers, riceRequest } from "../../fixtures/procurement";
import {
  compareProcurement,
  evaluateOffer,
  type ProcurementRequest,
  type SupplierOffer,
} from "./procurement";

const withQuantity = (quantity: number): ProcurementRequest => ({
  ...riceRequest,
  quantity,
});
const evaluateRice = (quantity: number) =>
  riceOffers.map((offer) => evaluateOffer(withQuantity(quantity), offer));

describe("procurement comparison", () => {
  it.each([
    { quantity: 10, totals: [9_500, 5_000], packages: [1, 10], excess: [8, 0] },
    { quantity: 18, totals: [9_500, 9_000], packages: [1, 18], excess: [0, 0] },
    {
      quantity: 20,
      totals: [17_500, 10_000],
      packages: [2, 20],
      excess: [16, 0],
    },
  ])(
    "calculates the independent rice example for $quantity kg",
    ({ quantity, totals, packages, excess }) => {
      const evaluations = evaluateRice(quantity);
      expect(evaluations.map((value) => value.totalCents)).toEqual(totals);
      expect(evaluations.map((value) => value.packageCount)).toEqual(packages);
      expect(evaluations.map((value) => value.excessQuantity)).toEqual(excess);
    },
  );

  it("keeps unit-price precision and charges freight once per order", () => {
    const [supplierA] = evaluateRice(20);
    expect(supplierA.subtotalCents).toBe(16_000);
    expect(supplierA.totalCents).toBe(17_500);
    expect(supplierA.unitPriceCents).toBe(8_000 / 18);
  });

  it("handles decimal package boundaries without buying an extra package", () => {
    const offer: SupplierOffer = {
      ...riceOffers[0],
      packageContent: 0.1,
      priceCents: 10,
      freightCents: 0,
    };
    const result = evaluateOffer(withQuantity(0.3), offer);
    expect(result.packageCount).toBe(3);
    expect(result.subtotalCents).toBe(30);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid request quantity %s",
    (quantity) => {
      const comparison = compareProcurement(withQuantity(quantity), riceOffers);
      expect(comparison.requestErrors).not.toHaveLength(0);
      expect(comparison.groups).toEqual([]);
    },
  );

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid package content %s",
    (packageContent) => {
      const result = evaluateOffer(riceRequest, {
        ...riceOffers[0],
        packageContent,
      });
      expect(
        result.errors.some((entry) => entry.includes("contenido del empaque")),
      ).toBe(true);
      expect(result.eligibleForComparison).toBe(false);
    },
  );

  it("respects a minimum expressed as a whole number of packages", () => {
    const result = evaluateOffer(riceRequest, {
      ...riceOffers[0],
      minimumPackages: 3,
    });
    expect(result.packageCount).toBe(3);
    expect(result.purchasedQuantity).toBe(54);
    expect(result.excessQuantity).toBe(44);
    expect(result.totalCents).toBe(25_500);
  });

  it("rejects fractional or zero package minimums", () => {
    for (const minimumPackages of [0, 1.5]) {
      const result = evaluateOffer(riceRequest, {
        ...riceOffers[0],
        minimumPackages,
      });
      expect(
        result.errors.some((entry) => entry.includes("compra mínima")),
      ).toBe(true);
    }
  });

  it("leaves per-kg calculations pending for a box without a confirmed weight", () => {
    const result = evaluateOffer(riceRequest, {
      ...riceOffers[0],
      packageContent: null,
      packageUnit: null,
    });
    expect(result.errors).toEqual([]);
    expect(result.pending).toEqual(
      expect.arrayContaining([
        "Falta confirmar el contenido del empaque.",
        "Falta confirmar la unidad del empaque.",
      ]),
    );
    expect(result.packageCount).toBeNull();
    expect(result.unitPriceCents).toBeNull();
    expect(result.totalCents).toBeNull();
  });

  it.each(["excluded", "unknown"] as const)(
    "marks %s tax as partial without inferring tax",
    (taxStatus) => {
      const result = evaluateOffer(riceRequest, {
        ...riceOffers[0],
        taxStatus,
      });
      expect(result.subtotalCents).toBe(8_000);
      expect(result.totalCents).toBeNull();
      expect(
        result.pending.some((entry) => entry.toLowerCase().includes("tribut")),
      ).toBe(true);
    },
  );

  it("marks unknown freight as pending rather than zero", () => {
    const result = evaluateOffer(riceRequest, {
      ...riceOffers[0],
      freightCents: null,
    });
    expect(result.subtotalCents).toBe(8_000);
    expect(result.totalCents).toBeNull();
    expect(result.pending).toContain("Falta confirmar el flete por pedido.");
  });

  it("does not compare different currencies or choose from a single offer", () => {
    const usdOffer: SupplierOffer = {
      ...riceOffers[1],
      id: "rice-usd",
      currency: "USD",
    };
    const mixed = compareProcurement(riceRequest, [riceOffers[0], usdOffer]);
    expect(mixed.groups).toEqual([]);
    expect(mixed.needsAlternative).toBe(true);

    const single = compareProcurement(riceRequest, [riceOffers[0]]);
    expect(single.evaluations[0].totalCents).toBe(9_500);
    expect(single.groups).toEqual([]);
    expect(single.needsAlternative).toBe(true);
  });

  it("does not compare a different exact specification", () => {
    const different = { ...riceOffers[1], specification: "Arroz integral" };
    const result = compareProcurement(riceRequest, [riceOffers[0], different]);
    expect(result.groups).toEqual([]);
    expect(
      result.evaluations[1].comparisonExclusions.some((entry) =>
        entry.includes("especificación"),
      ),
    ).toBe(true);
  });

  it("converts grams to kilograms and rejects units from another dimension", () => {
    const grams = evaluateOffer(riceRequest, {
      ...riceOffers[1],
      packageContent: 500,
      packageUnit: "g",
    });
    expect(grams.normalizedPackageContent).toBe(0.5);
    expect(grams.packageCount).toBe(20);

    const litres = evaluateOffer(riceRequest, {
      ...riceOffers[1],
      packageUnit: "L",
    });
    expect(
      litres.comparisonExclusions.some((entry) =>
        entry.includes("unidad del empaque"),
      ),
    ).toBe(true);
    expect(litres.packageCount).toBeNull();
  });

  it("compares complete compatible totals only within their request and currency", () => {
    const result = compareProcurement(riceRequest, riceOffers);
    expect(result.groups).toEqual([
      {
        currency: "PEN",
        unit: "kg",
        offerIds: ["rice-supplier-a", "rice-supplier-b"],
        lowestTotalCents: 5_000,
        lowestTotalOfferIds: ["rice-supplier-b"],
      },
    ]);
    expect(result.needsAlternative).toBe(false);
  });
});

describe("Límites de precisión", () => {
  it("no declara comparables importes o conteos fuera del rango seguro", () => {
    for (const quantity of [1e16, Number.MAX_VALUE]) {
      const result = evaluateOffer(
        { ...riceRequest, quantity },
        { ...riceOffers[0], packageContent: 0.001 },
      );
      expect(result.eligibleForComparison).toBe(false);
      expect(result.totalCents).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
  it("una necesidad positiva diminuta requiere al menos una presentación", () => {
    const result = evaluateOffer(
      { ...riceRequest, quantity: 1e-18 },
      riceOffers[0],
    );
    expect(result.packageCount).toBe(1);
    expect(result.totalCents).toBe(9500);
  });
});

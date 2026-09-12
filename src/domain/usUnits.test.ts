import { describe, expect, test } from "vitest";
import { extractionToPurchase, type ExtractedOffer } from "./extraction";
import { evaluateOffer, type SupplierOffer } from "./procurement";

const offer = (
  packageContent: number,
  packageUnit: SupplierOffer["packageUnit"],
): SupplierOffer => ({
  id: `${packageContent}-${packageUnit}`,
  supplier: "Fictional supplier",
  ingredient: "Rice",
  specification: "Long-grain white rice",
  packageContent,
  packageUnit,
  priceCents: 2000,
  currency: "USD",
  minimumPackages: 1,
  freightCents: 0,
  taxStatus: "included",
  deliveryConfirmed: true,
});

describe("US mass units", () => {
  test("uses exact statutory pound and ounce conversions", () => {
    const pound = evaluateOffer(
      {
        ingredient: "Rice",
        specification: "Long-grain white rice",
        quantity: 1,
        unit: "kg",
      },
      offer(1, "lb"),
    );
    const ounce = evaluateOffer(
      {
        ingredient: "Rice",
        specification: "Long-grain white rice",
        quantity: 1,
        unit: "kg",
      },
      offer(1, "oz"),
    );
    expect(pound.normalizedPackageContent).toBe(0.45359237);
    expect(ounce.normalizedPackageContent).toBe(0.028349523125);
  });

  test("does not add a package at an exact lb/oz boundary", () => {
    const result = evaluateOffer(
      { ingredient: "Rice", specification: "Long-grain white rice", quantity: 10, unit: "lb" },
      offer(160, "oz"),
    );
    expect(result.normalizedPackageContent).toBe(10);
    expect(result.packageCount).toBe(1);
    expect(result.purchasedQuantity).toBe(10);
    expect(result.excessQuantity).toBe(0);
  });

  test("converts metric packages into a lb request without currency conversion", () => {
    const result = evaluateOffer(
      { ingredient: "Rice", specification: "Long-grain white rice", quantity: 10, unit: "lb" },
      offer(5, "kg"),
    );
    expect(result.normalizedPackageContent).toBeCloseTo(11.023113109243878, 12);
    expect(result.packageCount).toBe(1);
    expect(result.totalCents).toBe(2000);
    expect(result.offer.currency).toBe("USD");
  });

  test("maps a reviewed ounce package to a pound request", () => {
    const field = (value: string): ExtractedOffer["supplier"] => ({
      value,
      evidence: value,
    });
    const extracted: ExtractedOffer = {
      supplier: field("Fictional supplier"),
      ingredient: field("Rice"),
      specification: field("Long-grain white rice"),
      packageContent: field("160"),
      packageUnit: field("oz"),
      price: field("20.00"),
      currency: field("USD"),
    };
    const seed = extractionToPurchase(
      {
        title: "Synthetic quote",
        text: "Fictional supplier Rice Long-grain white rice 160 oz 20.00 USD",
        observedAt: "2026-09-12",
        simulated: true,
      },
      extracted,
      Object.fromEntries(
        Object.entries(extracted).map(([key, value]) => [key, value.value]),
      ) as Record<keyof ExtractedOffer, string>,
      true,
    );
    expect(seed.request.unit).toBe("lb");
    expect(seed.offers[0].packageUnit).toBe("oz");
  });
});

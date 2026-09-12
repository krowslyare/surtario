import { describe, expect, it } from "vitest";
import { analyzePurchase, type AdvisorContext } from "./advisor";
import type { ProcurementRequest, SupplierOffer } from "./procurement";

const request: ProcurementRequest = {
  ingredient: "Arroz",
  specification: "Grano largo",
  quantity: 10,
  unit: "kg",
};

const offers: SupplierOffer[] = [
  {
    id: "a",
    supplier: "Proveedor A",
    ingredient: "Arroz",
    specification: "Grano largo",
    packageContent: 18,
    packageUnit: "kg",
    priceCents: 8000,
    currency: "PEN",
    minimumPackages: 1,
    freightCents: 1500,
    taxStatus: "included",
    deliveryConfirmed: true,
  },
  {
    id: "b",
    supplier: "Proveedor B",
    ingredient: "Arroz",
    specification: "Grano largo",
    packageContent: 1,
    packageUnit: "kg",
    priceCents: 500,
    currency: "PEN",
    minimumPackages: 1,
    freightCents: 0,
    taxStatus: "included",
    deliveryConfirmed: true,
  },
];

const context: AdvisorContext = {
  priority: "cash",
  budgetCents: 6000,
  dailyUsage: null,
  stockQuantity: null,
  maxCoverageDays: null,
  preferredOfferId: null,
};

describe("analyzePurchase", () => {
  it("recomienda el menor desembolso sin llamar ahorro al excedente", () => {
    const result = analyzePurchase(request, offers, context);

    expect(result.action).toBe("buy");
    expect(result.recommendedOfferId).toBe("b");
    expect(result.alternatives).toEqual([
      expect.objectContaining({
        offerId: "a",
        totalCents: 9500,
        excessQuantity: 8,
        affordable: false,
        eligible: false,
      }),
      expect.objectContaining({
        offerId: "b",
        totalCents: 5000,
        excessQuantity: 0,
        affordable: true,
        eligible: true,
      }),
    ]);
    expect(result.impact).toContain("inventory");
    expect(result.impact).not.toContain("realized savings of");
    expect(result.missing).toContain("Daily usage needs confirmation.");
  });

  it("respeta presupuesto y cobertura incluso con prioridad de precio unitario", () => {
    const result = analyzePurchase(request, offers, {
      ...context,
      priority: "unit_price",
      budgetCents: 10_000,
      dailyUsage: 1,
      stockQuantity: 2,
      maxCoverageDays: 15,
    });

    expect(result.recommendedOfferId).toBe("b");
    expect(result.alternatives[0]).toEqual(
      expect.objectContaining({ coverageDays: 20, eligible: false }),
    );
    expect(result.alternatives[1]).toEqual(
      expect.objectContaining({ coverageDays: 12, eligible: true }),
    );
  });

  it("prepara una negociación factual con el proveedor preferido", () => {
    const result = analyzePurchase(request, offers, {
      ...context,
      budgetCents: 10_000,
      preferredOfferId: "a",
    });

    expect(result.action).toBe("negotiate");
    expect(result.recommendedOfferId).toBe("a");
    expect(result.negotiationDraft).toContain("S/ 50.00");
    expect(result.negotiationDraft).not.toMatch(/seman|meta|objetivo/i);
  });

  it("no ordena ofertas en monedas distintas", () => {
    const mixed = [
      { ...offers[0] },
      { ...offers[1], currency: "USD" as const },
    ];
    const result = analyzePurchase(request, mixed, {
      ...context,
      budgetCents: null,
    });

    expect(result.action).toBe("clarify");
    expect(result.recommendedOfferId).toBeNull();
    expect(result.warning).toContain("exchange rate");
  });

  it("mantiene pendientes las ofertas inciertas", () => {
    const uncertain = [
      {
        ...offers[0],
        priceCents: null,
        freightCents: null,
        taxStatus: "unknown" as const,
      },
    ];
    const result = analyzePurchase(request, uncertain, context);

    expect(result.action).toBe("clarify");
    expect(result.alternatives[0].eligible).toBe(false);
    expect(result.alternatives[0].warnings.join(" ")).toMatch(
      /price|delivery cost|tax/i,
    );
  });

  it("permite investigar con cantidad cero sin recomendar una compra", () => {
    const result = analyzePurchase(
      { ...request, quantity: 0 },
      offers,
      context,
    );

    expect(result.action).toBe("research");
    expect(result.recommendedOfferId).toBeNull();
    expect(
      result.alternatives.every((alternative) => !alternative.eligible),
    ).toBe(true);
  });

  it("rechaza contexto fuera de rango y proveedor preferido inexistente", () => {
    const result = analyzePurchase(request, offers, {
      ...context,
      budgetCents: 10.5,
      dailyUsage: Number.POSITIVE_INFINITY,
      preferredOfferId: "missing",
    });

    expect(result.action).toBe("clarify");
    expect(result.recommendedOfferId).toBeNull();
    expect(result.missing.join(" ")).toMatch(/cents|finite|preferred/i);
  });
});

it("a noncomparable first currency cannot relabel the budget for other offers", () => {
  const result = analyzePurchase(
    request,
    [
      { ...offers[0], id: "usd-incomplete", currency: "USD", priceCents: null },
      ...offers,
    ],
    {
      priority: "cash",
      budgetCents: 6000,
      dailyUsage: null,
      stockQuantity: null,
      maxCoverageDays: null,
      preferredOfferId: null,
    },
  );
  expect(result.recommendedOfferId).toBeNull();
  expect(result.alternatives.every((a) => a.affordable === null)).toBe(true);
});

import { expect, test } from "vitest";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
import { draftValues, extractionToPurchase, quickReviewIssues } from "./extraction";

test("quick review rejects invalid terms without treating them as ready", () => {
  const values = { ...draftValues(extractionExample), packageContent: "25", packageUnit: "lb", currency: "USD" };
  expect(quickReviewIssues(values)).toEqual([]);
  expect(quickReviewIssues({ ...values, packageContent: "0", price: "1,234.00", currency: "CAD", packageUnit: "bag" }))
    .toEqual(["package size", "package unit", "price", "currency"]);
  expect(quickReviewIssues({ ...values, supplier: "", price: "" })).toEqual(["supplier", "price"]);
});

test("no inventa peso, moneda ni confirmación al preparar documento ambiguo", () => {
  const values = draftValues(extractionExample);
  expect(values.packageContent).toBe("");
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, false),
  ).toThrow("Review");
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, true),
  ).toThrow("unit");
  values.packageUnit = "kg";
  values.currency = "";
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, true),
  ).toThrow("currency");
});
test("convierte corrección confirmada manteniendo fuente y condiciones pendientes", () => {
  const values = {
    ...draftValues(extractionExample),
    packageContent: "18",
    packageUnit: "kg",
  };
  const seed = extractionToPurchase(
    extractionSource,
    extractionExample,
    values,
    true,
  );
  expect(seed.request).toEqual({
    ingredient: "Arroz",
    specification: "Blanco extra",
    quantity: 0,
    unit: "kg",
  });
  expect(seed.offers[0]).toMatchObject({
    packageContent: 18,
    priceCents: 8000,
    minimumPackages: null,
    freightCents: null,
    taxStatus: "unknown",
    deliveryConfirmed: false,
  });
  expect(seed.sources["reviewed-document"].marketSource?.evidence).toContain(
    "Package size: Pending",
  );
  expect(seed.sources["reviewed-document"].marketSource?.evidence).toContain(
    "manual correction: 18",
  );
  expect(extractionExample.packageContent.value).toBeNull();
});
test("contenido y precio pueden quedar pendientes; decimales ambiguos se rechazan", () => {
  const values = {
    ...draftValues(extractionExample),
    packageUnit: "g",
    price: "",
  };
  expect(
    extractionToPurchase(extractionSource, extractionExample, values, true)
      .offers[0],
  ).toMatchObject({ packageContent: null, priceCents: null });
  expect(
    extractionToPurchase(extractionSource, extractionExample, values, true)
      .request.unit,
  ).toBe("kg");
  expect(() =>
    extractionToPurchase(
      extractionSource,
      extractionExample,
      { ...values, price: "1,234.00" },
      true,
    ),
  ).toThrow("price");
  expect(() =>
    extractionToPurchase(
      extractionSource,
      extractionExample,
      { ...values, packageContent: "-18" },
      true,
    ),
  ).toThrow("Package size");
});

test("separa propuesta estructurada y baseline confirmado sin alias mutable", () => {
  const values = {
    ...draftValues(extractionExample),
    packageUnit: "kg",
    price: "85",
  };
  const seed = extractionToPurchase(
    extractionSource,
    extractionExample,
    values,
    true,
  );
  const source = seed.sources["reviewed-document"];
  expect(source.extraction?.proposed.price.value).toBe("80.00");
  expect(source.extraction?.reviewed.price).toBe("85");
  expect(source.original.priceCents).toBe(8500);
  values.price = "90";
  expect(source.extraction?.reviewed.price).toBe("85");
});

test("fuentes web distintas conservan URL, fecha y equivalencia explícita", async () => {
  const { combineReviewedOffers } = await import("./extraction");
  const values = {
    ...draftValues(extractionExample),
    packageUnit: "kg",
    packageContent: "18",
  };
  const make = (id: string) =>
    extractionToPurchase(
      {
        ...extractionSource,
        id,
        url: `https://supplier.test/${id}`,
        observedAt: "2026-09-08T16:00:00.000Z",
        simulated: false,
      },
      extractionExample,
      values,
      true,
    );
  const a = make("web-a"),
    b = make("web-b");
  expect(() => combineReviewedOffers([a, b], false)).toThrow(/equivalent/);
  const combined = combineReviewedOffers([a, b], true);
  expect(combined.offers.map((o) => o.id)).toEqual(["web-a", "web-b"]);
  expect(combined.sources["web-a"].date).toBe("2026-09-08");
  expect(combined.sources["web-a"].marketSource?.url).toBe(
    "https://supplier.test/web-a",
  );
  expect(combined.sources["web-a"].marketSource?.simulated).toBe(false);
  expect(combined.request.quantity).toBe(0);
  const six = Array.from({ length: 6 }, (_, index) => make(`web-${index + 1}`));
  expect(combineReviewedOffers(six, true).offers).toHaveLength(6);
  expect(() =>
    combineReviewedOffers([...six, make("web-7")], true),
  ).toThrow(/one to 6/);
  expect(() => combineReviewedOffers([a, a], true)).toThrow(/twice/);
  const differentlyWorded = {
    ...b,
    request: {
      ...b.request,
      ingredient: "Arroz integral",
      specification: "Otra calidad",
    },
    offers: [{
      ...b.offers[0],
      ingredient: "Arroz integral",
      specification: "Otra calidad",
    }],
    sources: {
      ...b.sources,
      "web-b": {
        ...b.sources["web-b"],
        original: {
          ...b.sources["web-b"].original,
          ingredient: "Arroz integral",
          specification: "Otra calidad",
        },
      },
    },
  };
  const normalized = combineReviewedOffers([a, differentlyWorded], true);
  expect(normalized.offers[1].ingredient).toBe(a.request.ingredient);
  expect(normalized.offers[1].specification).toBe(a.request.specification);
  expect(normalized.sources["web-b"].original.specification).toBe("Otra calidad");
  expect(() =>
    combineReviewedOffers(
      [a, { ...b, offers: [{ ...b.offers[0], currency: "USD" }] }],
      true,
    ),
  ).toThrow(/same base unit and currency/);
});

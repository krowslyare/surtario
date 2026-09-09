import { expect, test } from "vitest";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
import { draftValues, extractionToPurchase } from "./extraction";

test("no inventa peso, moneda ni confirmación al preparar documento ambiguo", () => {
  const values = draftValues(extractionExample);
  expect(values.packageContent).toBe("");
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, false),
  ).toThrow("Revisa");
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, true),
  ).toThrow("unidad");
  values.packageUnit = "kg";
  values.currency = "";
  expect(() =>
    extractionToPurchase(extractionSource, extractionExample, values, true),
  ).toThrow("moneda");
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
    "Contenido por presentación: Pendiente",
  );
  expect(seed.sources["reviewed-document"].marketSource?.evidence).toContain(
    "corrección manual: 18",
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
  ).toThrow("precio");
  expect(() =>
    extractionToPurchase(
      extractionSource,
      extractionExample,
      { ...values, packageContent: "-18" },
      true,
    ),
  ).toThrow("contenido");
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
  expect(() => combineReviewedOffers([a, b], false)).toThrow(/equivalencia/);
  const combined = combineReviewedOffers([a, b], true);
  expect(combined.offers.map((o) => o.id)).toEqual(["web-a", "web-b"]);
  expect(combined.sources["web-a"].date).toBe("2026-09-08");
  expect(combined.sources["web-a"].marketSource?.url).toBe(
    "https://supplier.test/web-a",
  );
  expect(combined.sources["web-a"].marketSource?.simulated).toBe(false);
  expect(combined.request.quantity).toBe(0);
  expect(() => combineReviewedOffers([a, a], true)).toThrow(/dos veces/);
  expect(() =>
    combineReviewedOffers(
      [a, { ...b, request: { ...b.request, specification: "Otra calidad" } }],
      true,
    ),
  ).toThrow(/no son comparables/);
  expect(() =>
    combineReviewedOffers(
      [a, { ...b, offers: [{ ...b.offers[0], currency: "USD" }] }],
      true,
    ),
  ).toThrow(/no son comparables/);
});

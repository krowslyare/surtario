import { describe, expect, it } from "vitest";
import { marketExamples } from "../../fixtures/market";
import {
  filterMarketExamples,
  preparePurchaseFromCatalog,
  publishedUnitPrice,
  type CatalogResult,
} from "./market";

describe("Estudio autónomo y continuidad a compra", () => {
  it("explora sin cantidad ni documentos propios y conserva proveedores sin precio", () => {
    const results = filterMarketExamples(marketExamples, "arróz", "Lima");
    expect(results).toHaveLength(4);
    expect(
      results.find((item) => item.kind === "distributor"),
    ).not.toHaveProperty("priceCents");
    expect(filterMarketExamples(marketExamples, "aceite", "Lima")).toEqual([]);
    expect(filterMarketExamples(marketExamples, "arroz", "Cusco")).toEqual([]);
    expect(filterMarketExamples(marketExamples, "", "Lima")).toEqual([]);
  });
  it("muestra precio publicado por unidad sin inventar costo de pedido", () => {
    const item = marketExamples[0] as CatalogResult;
    expect(publishedUnitPrice(item)).toBeCloseTo(8000 / 18);
    expect(publishedUnitPrice({ ...item, packageContent: null })).toBeNull();
  });
  it("exige confirmar equivalencia y conserva pendientes las condiciones de catálogo", () => {
    expect(() => preparePurchaseFromCatalog(marketExamples, false)).toThrow(
      /Confirm/,
    );
    const seed = preparePurchaseFromCatalog(marketExamples, true);
    expect(seed.request.quantity).toBe(0);
    expect(seed.offers).toHaveLength(2);
    for (const offer of seed.offers) {
      expect(offer.freightCents).toBeNull();
      expect(offer.taxStatus).toBe("unknown");
      expect(offer.deliveryConfirmed).toBe(false);
      expect(offer.minimumPackages).toBeNull();
      expect(seed.sources[offer.id].label).toContain("Catalog");
      expect(seed.sources[offer.id].marketSource).toEqual(
        marketExamples.find((item) => item.id === offer.id)?.source,
      );
    }
  });
  it("un contacto o boletín no se convierte en precio de proveedor", () => {
    expect(() =>
      preparePurchaseFromCatalog(marketExamples.slice(2), true),
    ).toThrow(/Select/);
  });
  it("no homologa especificaciones o monedas distintas", () => {
    const a = marketExamples[0] as CatalogResult;
    expect(() =>
      preparePurchaseFromCatalog(
        [a, { ...a, id: "other", currency: "USD" }],
        true,
      ),
    ).toThrow(/differ/);
    expect(() =>
      preparePurchaseFromCatalog(
        [a, { ...a, id: "other", specification: "Arroz integral" }],
        true,
      ),
    ).toThrow(/differ/);
  });
});

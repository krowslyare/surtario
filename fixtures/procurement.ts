import type {
  ProcurementRequest,
  SupplierOffer,
} from "../src/domain/procurement";

export const riceRequest: ProcurementRequest = {
  ingredient: "Arroz",
  specification: "Arroz blanco, misma calidad confirmada",
  quantity: 10,
  unit: "kg",
};

export const riceOffers: SupplierOffer[] = [
  {
    id: "rice-supplier-a",
    supplier: "Proveedor A",
    ingredient: riceRequest.ingredient,
    specification: riceRequest.specification,
    packageContent: 18,
    packageUnit: "kg",
    priceCents: 8_000,
    currency: "PEN",
    minimumPackages: 1,
    freightCents: 1_500,
    taxStatus: "included",
    deliveryConfirmed: true,
  },
  {
    id: "rice-supplier-b",
    supplier: "Proveedor B",
    ingredient: riceRequest.ingredient,
    specification: riceRequest.specification,
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

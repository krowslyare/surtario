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

// Separate synthetic comparison; these are not converted Peru prices.
export const usRiceRequest: ProcurementRequest = {
  ingredient: "Rice",
  specification: "Long-grain white rice",
  quantity: 40,
  unit: "lb",
};
export const usRiceOffers: SupplierOffer[] = [
  {
    id: "us-rice-supplier-a", supplier: "Supplier A",
    ingredient: usRiceRequest.ingredient, specification: usRiceRequest.specification,
    packageContent: 25, packageUnit: "lb", priceCents: 2000, currency: "USD",
    minimumPackages: 1, freightCents: 500, taxStatus: "included", deliveryConfirmed: true,
  },
  {
    id: "us-rice-supplier-b", supplier: "Supplier B",
    ingredient: usRiceRequest.ingredient, specification: usRiceRequest.specification,
    packageContent: 50, packageUnit: "lb", priceCents: 3500, currency: "USD",
    minimumPackages: 1, freightCents: 0, taxStatus: "included", deliveryConfirmed: true,
  },
];

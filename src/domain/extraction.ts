import { parseCents, parseDecimal } from "../numbers";
import type { PurchaseSeed } from "./market";
import type { Currency, PackageUnit, SupplierOffer } from "./procurement";

export const extractionFields = [
  "supplier",
  "ingredient",
  "specification",
  "packageContent",
  "packageUnit",
  "price",
  "currency",
] as const;
const fieldLabels = {
  supplier: "Proveedor",
  ingredient: "Insumo",
  specification: "Especificación",
  packageContent: "Contenido por presentación",
  packageUnit: "Unidad",
  price: "Precio por presentación",
  currency: "Moneda",
};
export type ExtractionField = (typeof extractionFields)[number];
export type ExtractedField = { value: string | null; evidence: string | null };
export type ExtractedOffer = Record<ExtractionField, ExtractedField>;
export type ExtractionSource = {
  id?: string;
  url?: string;
  title: string;
  text: string;
  observedAt: string;
  simulated: boolean;
};
export type ReviewedValues = Record<ExtractionField, string>;
export function draftValues(offer: ExtractedOffer): ReviewedValues {
  return Object.fromEntries(
    extractionFields.map((key) => [key, offer[key].value ?? ""]),
  ) as ReviewedValues;
}
export function extractionToPurchase(
  source: ExtractionSource,
  extracted: ExtractedOffer,
  values: ReviewedValues,
  confirmed: boolean,
): PurchaseSeed {
  if (!confirmed)
    throw new Error(
      "Revisa los datos y confirma su correspondencia con el documento.",
    );
  for (const key of ["supplier", "ingredient", "specification"] as const)
    if (!values[key].trim() || values[key].trim().length > 120)
      throw new Error(
        "Completa proveedor, insumo y especificación (hasta 120 caracteres).",
      );
  if (!["PEN", "USD"].includes(values.currency))
    throw new Error("Confirma la moneda: PEN o USD.");
  if (!["kg", "g", "L", "ml", "unit"].includes(values.packageUnit))
    throw new Error("Confirma la unidad de la presentación.");
  const content = parseDecimal(values.packageContent);
  const price = parseCents(values.price);
  if (
    content !== null &&
    (!Number.isFinite(content) || content <= 0 || content > 1e6)
  )
    throw new Error(
      "El contenido debe ser positivo, sin separadores de miles y hasta 3 decimales; puedes dejarlo pendiente.",
    );
  if (price !== null && (!Number.isSafeInteger(price) || price < 0))
    throw new Error(
      "Revisa el precio: hasta 2 decimales, sin separadores de miles; puedes dejarlo pendiente.",
    );
  const offer: SupplierOffer = {
    id: source.id ?? "reviewed-document",
    supplier: values.supplier.trim(),
    ingredient: values.ingredient.trim(),
    specification: values.specification.trim(),
    packageContent: content,
    packageUnit: values.packageUnit as PackageUnit,
    priceCents: price,
    currency: values.currency as Currency,
    minimumPackages: null,
    freightCents: null,
    taxStatus: "unknown",
    deliveryConfirmed: false,
  };
  const edited = extractionFields.some(
    (key) => values[key] !== (extracted[key].value ?? ""),
  );
  const audit = extractionFields
    .map(
      (key) =>
        `${fieldLabels[key]}: ${extracted[key].value ?? "Pendiente"}; evidencia: ${extracted[key].evidence ?? "Sin evidencia"}${values[key] !== (extracted[key].value ?? "") ? `; corrección manual: ${values[key] || "Pendiente"}` : ""}`,
    )
    .join("\n");
  return {
    request: {
      ingredient: offer.ingredient,
      specification: offer.specification,
      quantity: 0,
      unit:
        offer.packageUnit === "g"
          ? "kg"
          : offer.packageUnit === "ml"
            ? "L"
            : (offer.packageUnit as "kg" | "L" | "unit"),
    },
    offers: [offer],
    sources: {
      [offer.id]: {
        label: `${source.simulated ? "Documento sintético revisado" : "Documento revisado"}: ${source.title}`,
        date: source.observedAt.slice(0, 10),
        extraction: {
          proposed: structuredClone(extracted),
          reviewed: { ...values },
        },
        original: { ...offer },
        edited: false,
        marketSource: {
          title: source.title,
          url: source.url ?? null,
          observedAt: source.observedAt,
          publishedAt: null,
          simulated: source.simulated,
          evidence: `${source.text}\n\nRevisión${edited ? " con correcciones manuales" : ""}:\n${audit}`,
        },
      },
    },
  };
}

/** Human-reviewed offers can share a comparison only after explicit equivalence review. */
export function combineReviewedOffers(
  seeds: PurchaseSeed[],
  confirmed: boolean,
): PurchaseSeed {
  if (!confirmed)
    throw new Error("Confirma la equivalencia de las ofertas revisadas.");
  if (
    !seeds.length ||
    seeds.length > 3 ||
    seeds.some((seed) => seed.offers.length !== 1)
  )
    throw new Error("Selecciona entre una y tres ofertas revisadas.");
  const first = seeds[0];
  const offers = seeds.flatMap((seed) => seed.offers);
  if (new Set(offers.map((offer) => offer.id)).size !== offers.length)
    throw new Error("Una misma fuente no puede aparecer dos veces.");
  if (
    seeds.some(
      (seed) =>
        seed.request.ingredient !== first.request.ingredient ||
        seed.request.specification !== first.request.specification ||
        seed.request.unit !== first.request.unit ||
        seed.offers[0].currency !== first.offers[0].currency,
    )
  )
    throw new Error(
      "Revisa insumo, especificación, unidad y moneda: estas ofertas no son comparables todavía.",
    );
  return {
    request: { ...first.request, quantity: 0 },
    offers: structuredClone(offers),
    sources: structuredClone(
      Object.assign({}, ...seeds.map((seed) => seed.sources)),
    ),
  };
}

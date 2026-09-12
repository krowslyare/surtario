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
  supplier: "Supplier",
  ingredient: "Ingredient",
  specification: "Specification",
  packageContent: "Package size",
  packageUnit: "Unit",
  price: "Price per package",
  currency: "Currency",
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
      "Review the data and confirm it matches the document.",
    );
  for (const key of ["supplier", "ingredient", "specification"] as const)
    if (!values[key].trim() || values[key].trim().length > 120)
      throw new Error(
        "Enter supplier, ingredient, and specification (up to 120 characters).",
      );
  if (!["PEN", "USD"].includes(values.currency))
    throw new Error("Confirm the currency: USD or PEN.");
  if (
    !["kg", "g", "lb", "oz", "L", "ml", "unit"].includes(
      values.packageUnit,
    )
  )
    throw new Error("Confirm the package unit.");
  const content = parseDecimal(values.packageContent);
  const price = parseCents(values.price);
  if (
    content !== null &&
    (!Number.isFinite(content) || content <= 0 || content > 1e6)
  )
    throw new Error(
      "Package size must be positive, with no thousands separators and up to 3 decimals; you may leave it pending.",
    );
  if (price !== null && (!Number.isSafeInteger(price) || price < 0))
    throw new Error(
      "Review the price: up to 2 decimals, no thousands separators; you may leave it pending.",
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
        `${fieldLabels[key]}: ${extracted[key].value ?? "Pending"}; evidence: ${extracted[key].evidence ?? "No evidence"}${values[key] !== (extracted[key].value ?? "") ? `; manual correction: ${values[key] || "Pending"}` : ""}`,
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
          : offer.packageUnit === "oz"
            ? "lb"
          : offer.packageUnit === "ml"
            ? "L"
            : (offer.packageUnit as "kg" | "lb" | "L" | "unit"),
    },
    offers: [offer],
    sources: {
      [offer.id]: {
        label: `${source.simulated ? "Reviewed synthetic document" : "Reviewed document"}: ${source.title}`,
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
          evidence: `${source.text}\n\nReview${edited ? " with manual corrections" : ""}:\n${audit}`,
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
    throw new Error("Confirm that the reviewed offers are equivalent.");
  if (
    !seeds.length ||
    seeds.length > 3 ||
    seeds.some((seed) => seed.offers.length !== 1)
  )
    throw new Error("Select one to three reviewed offers.");
  const first = seeds[0];
  const offers = seeds.flatMap((seed) => seed.offers);
  if (new Set(offers.map((offer) => offer.id)).size !== offers.length)
    throw new Error("The same source cannot appear twice.");
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
      "Review the ingredient, specification, unit, and currency; these offers are not comparable yet.",
    );
  return {
    request: { ...first.request, quantity: 0 },
    offers: structuredClone(offers),
    sources: structuredClone(
      Object.assign({}, ...seeds.map((seed) => seed.sources)),
    ),
  };
}

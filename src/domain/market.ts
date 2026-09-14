import type { ExtractedOffer, ReviewedValues } from "./extraction";
import type {
  BaseUnit,
  Currency,
  ProcurementRequest,
  SupplierOffer,
} from "./procurement";

export type MarketSource = {
  title: string;
  url: string | null;
  observedAt: string;
  publishedAt: string | null;
  evidence: string;
  simulated: boolean;
};
type MarketBase = {
  id: string;
  supplier: string;
  ingredient: string;
  description: string;
  region: string;
  source: MarketSource;
};
export type CatalogResult = MarketBase & {
  kind: "catalog";
  specification: string;
  packageContent: number | null;
  packageUnit: BaseUnit;
  priceCents: number;
  currency: Currency;
  minimumPackages: number | null;
};
export type DistributorResult = MarketBase & {
  kind: "distributor";
  contact: {
    channel: "email" | "phone" | "website";
    value: string;
    verified: boolean;
  } | null;
};
export type ReferenceResult = MarketBase & {
  kind: "reference";
  note: string;
};
export type MarketResult = CatalogResult | DistributorResult | ReferenceResult;
export type ComparisonSource = {
  replyReview?: {
    requestId: string;
    messageId: string;
    extractionAttempt?: number;
    values: ReviewedValues;
    confirmed: true;
  };
  documentReview?: { runId: string; values: ReviewedValues; confirmed: true };
  webReview?: {
    runId: string;
    sourceIndex: number;
    values: ReviewedValues;
    confirmed: true;
  };
  /** Optional extraction proposal, separate from the accepted comparison baseline. */
  extraction?: { proposed: ExtractedOffer; reviewed: ReviewedValues };
  marketSource?: MarketSource;
  label: string;
  date: string;
  /** Immutable values when this offer entered comparison; extraction proposals live above. */
  original: SupplierOffer;
  edited: boolean;
};
export type PurchaseSeed = {
  request: ProcurementRequest;
  offers: SupplierOffer[];
  sources: Record<string, ComparisonSource>;
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function filterMarketExamples(
  results: MarketResult[],
  term: string,
  region: string,
): MarketResult[] {
  const words = normalize(term).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return results.filter(
    (result) =>
      normalize(result.region) === normalize(region) &&
      words.every((word) =>
        normalize(
          `${result.ingredient} ${result.description} ${result.supplier}`,
        ).includes(word),
      ),
  );
}
export function publishedUnitPrice(result: CatalogResult): number | null {
  if (
    !Number.isSafeInteger(result.priceCents) ||
    result.priceCents < 0 ||
    result.packageContent === null ||
    !Number.isFinite(result.packageContent) ||
    result.packageContent <= 0
  )
    return null;
  const price = result.priceCents / result.packageContent;
  return Number.isFinite(price) ? price : null;
}
/** Catalog observations retain their provenance; they do not confirm purchasing conditions. */
export function preparePurchaseFromCatalog(
  results: MarketResult[],
  equivalentConfirmed: boolean,
): PurchaseSeed {
  const catalogs = results.filter(
    (result): result is CatalogResult => result.kind === "catalog",
  );
  if (!equivalentConfirmed)
    throw new Error("Confirm equivalence before preparing the purchase.");
  if (!catalogs.length || catalogs.length > 4)
    throw new Error("Select one to four catalog prices.");
  const first = catalogs[0];
  if (
    catalogs.some(
      (item) =>
        item.ingredient !== first.ingredient ||
        item.specification !== first.specification ||
        item.packageUnit !== first.packageUnit ||
        item.currency !== first.currency,
    )
  )
    throw new Error(
      "The specifications, units, or currencies differ. Review the options separately.",
    );
  const offers: SupplierOffer[] = catalogs.map((item) => ({
    id: item.id,
    supplier: item.supplier,
    ingredient: item.ingredient,
    specification: item.specification,
    packageContent: item.packageContent,
    packageUnit: item.packageUnit,
    priceCents: item.priceCents,
    currency: item.currency,
    minimumPackages: item.minimumPackages,
    freightCents: null,
    taxStatus: "unknown",
    deliveryConfirmed: false,
  }));
  return {
    request: {
      ingredient: first.ingredient,
      specification: first.specification,
      quantity: 0,
      unit: first.packageUnit,
    },
    offers,
    sources: Object.fromEntries(
      catalogs.map((item, i) => [
        item.id,
        {
          label: `${item.source.simulated ? "Catalog example" : "Catalog"}: ${item.source.title}`,
          date: item.source.observedAt,
          marketSource: { ...item.source },
          original: { ...offers[i] },
          edited: false,
        },
      ]),
    ),
  };
}

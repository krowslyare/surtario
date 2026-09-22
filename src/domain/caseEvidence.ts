import type { PurchaseSeed } from "./market";
import { MAX_COMPARISON_OFFERS } from "./study";

/** Human-reviewed evidence replaces only the active offer from the exact same URL.
 * Its old source remains in history; unconfirmed commercial terms stay pending. */
export function mergeCaseEvidence(
  current: PurchaseSeed & { id: string; revision: number },
  incoming: PurchaseSeed,
  equivalent: boolean,
): PurchaseSeed {
  if (!equivalent)
    throw new Error(
      "Confirm that this evidence matches the same ingredient and specification.",
    );
  if (
    current.request.ingredient !== incoming.request.ingredient ||
    current.request.specification !== incoming.request.specification ||
    current.request.unit !== incoming.request.unit ||
    incoming.offers.some((offer) =>
      current.offers.some((existing) => existing.currency !== offer.currency),
    )
  )
    throw new Error(
      "The ingredient, specification, unit and currency must match your saved comparison.",
    );
  if (incoming.offers.some((offer) => !incoming.sources[offer.id]?.webReview))
    throw new Error("Choose reviewed web evidence.");
  // A saved study may include both previously incorporated and new evidence.
  // Keep the saved version of known IDs, including reviewed commercial terms
  // and historical sources; only new IDs can update the comparison.
  const additions = incoming.offers.filter((offer) => !current.sources[offer.id]);
  if (!additions.length)
    throw new Error("This evidence is already in the saved comparison.");
  const sources = {
    ...current.sources,
    ...Object.fromEntries(additions.map((offer) => [offer.id, incoming.sources[offer.id]])),
  };
  if (Object.keys(sources).length > MAX_COMPARISON_OFFERS)
    throw new Error(
      `This comparison already contains ${MAX_COMPARISON_OFFERS} sources including history. Review the existing comparison before adding more.`,
    );
  const urls = new Set(
    additions
      .map((offer) => incoming.sources[offer.id].marketSource?.url)
      .filter(Boolean),
  );
  const retained = current.offers.filter(
    (offer) => !urls.has(current.sources[offer.id]?.marketSource?.url),
  );
  return {
    request: { ...current.request },
    offers: [...retained, ...additions],
    sources,
    resumeComparison: { id: current.id, revision: current.revision },
  };
}

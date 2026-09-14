import type { PurchaseSeed } from "./market";

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
  if (incoming.offers.some((offer) => current.sources[offer.id]))
    throw new Error("This evidence is already in the saved comparison.");
  const sources = { ...current.sources, ...incoming.sources };
  if (Object.keys(sources).length > 4)
    throw new Error(
      "This comparison already contains four sources including history. Review the existing comparison before adding more.",
    );
  const urls = new Set(
    incoming.offers
      .map((offer) => incoming.sources[offer.id].marketSource?.url)
      .filter(Boolean),
  );
  const retained = current.offers.filter(
    (offer) => !urls.has(current.sources[offer.id]?.marketSource?.url),
  );
  return {
    request: { ...current.request },
    offers: [...retained, ...incoming.offers],
    sources,
    resumeComparison: { id: current.id, revision: current.revision },
  };
}

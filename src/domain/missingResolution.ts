import { analyzePurchase, type AdvisorContext } from "./advisor";
import {
  evaluateOffer,
  type Currency,
  type OfferEvaluation,
  type ProcurementRequest,
  type SupplierOffer,
} from "./procurement";

export interface FreightBoundaryEvidence {
  sourceOfferIds: string[];
  pendingSubtotalCents: number;
  benchmarkTotalCents: number;
  /** Arithmetic boundary only. It is not a quoted or assumed freight charge. */
  hypotheticalFreightCents: number;
  hypotheticalTotalCents: number;
}

export interface FreightMissingResolution {
  kind: "freight-boundary";
  offerId: string;
  supplier: string;
  currency: Currency;
  benchmarkOfferIds: string[];
  maxFreightCents: number;
  outcome: "can-match" | "already-more-expensive";
  questionDraft: string;
  explanation: string;
  evidence: FreightBoundaryEvidence;
}

const money = (currency: Currency, cents: number) =>
  `${currency} ${(Math.abs(cents) / 100).toFixed(2)}`;

function freightIsOnlyMissingCondition(
  offer: SupplierOffer,
  evaluation: OfferEvaluation,
) {
  return (
    offer.freightCents === null &&
    offer.packageContent !== null &&
    offer.packageUnit !== null &&
    offer.priceCents !== null &&
    offer.minimumPackages !== null &&
    offer.taxStatus === "included" &&
    offer.deliveryConfirmed &&
    evaluation.errors.length === 0 &&
    evaluation.comparisonExclusions.length === 0 &&
    evaluation.pending.length === 1 &&
    evaluation.subtotalCents !== null
  );
}

/**
 * Finds a decision-changing question without treating missing freight as zero.
 * Complete offers remain the only eligible benchmarks.
 */
export function resolveMissingConditions(
  request: ProcurementRequest,
  offers: SupplierOffer[],
): FreightMissingResolution[] {
  const evaluated = offers.map((offer) => ({
    offer,
    evaluation: evaluateOffer(request, offer),
  }));
  const complete = evaluated.filter(
    ({ evaluation }) =>
      evaluation.eligibleForComparison && evaluation.totalCents !== null,
  );

  return evaluated.flatMap(({ offer, evaluation }) => {
    if (!freightIsOnlyMissingCondition(offer, evaluation)) return [];
    const sameCurrency = complete.filter(
      (candidate) => candidate.offer.currency === offer.currency,
    );
    if (!sameCurrency.length) return [];

    const benchmarkTotalCents = Math.min(
      ...sameCurrency.map(({ evaluation: item }) => item.totalCents!),
    );
    const benchmarkOfferIds = sameCurrency
      .filter(({ evaluation: item }) => item.totalCents === benchmarkTotalCents)
      .map(({ offer: item }) => item.id)
      .sort();
    const pendingSubtotalCents = evaluation.subtotalCents!;
    const maxFreightCents = benchmarkTotalCents - pendingSubtotalCents;
    const canMatch = maxFreightCents >= 0;
    const hypotheticalFreightCents = Math.max(0, maxFreightCents);
    const hypotheticalTotalCents =
      pendingSubtotalCents + hypotheticalFreightCents;

    return [
      {
        kind: "freight-boundary" as const,
        offerId: offer.id,
        supplier: offer.supplier,
        currency: offer.currency,
        benchmarkOfferIds,
        maxFreightCents,
        outcome: canMatch
          ? ("can-match" as const)
          : ("already-more-expensive" as const),
        questionDraft: canMatch
          ? `For ${evaluation.packageCount} ${evaluation.packageCount === 1 ? "pack" : "packs"} of ${offer.packageContent} ${offer.packageUnit} ${request.ingredient} (${request.specification}), can ${offer.supplier} confirm final delivery, including tax, of ${money(offer.currency, maxFreightCents)} or less?`
          : `For ${evaluation.packageCount} ${evaluation.packageCount === 1 ? "pack" : "packs"} of ${offer.packageContent} ${offer.packageUnit} ${request.ingredient} (${request.specification}), what is the final delivery cost, including tax, from ${offer.supplier}?`,
        explanation: canMatch
          ? `At or below the hypothetical ${money(offer.currency, maxFreightCents)} freight boundary, this offer's total would be no higher than the best complete alternative.`
          : `This offer's merchandise subtotal is already ${money(offer.currency, -maxFreightCents)} above the best complete alternative, before any freight is added.`,
        evidence: {
          sourceOfferIds: [offer.id, ...benchmarkOfferIds],
          pendingSubtotalCents,
          benchmarkTotalCents,
          hypotheticalFreightCents,
          hypotheticalTotalCents,
        },
      },
    ];
  });
}

/** Re-evaluates one offer with a user-supplied freight value; it writes nothing. */
export function compareFreightScenario(
  request: ProcurementRequest,
  offer: SupplierOffer,
  freightCents: number,
): { sourceOfferId: string; before: OfferEvaluation; after: OfferEvaluation } {
  if (!Number.isSafeInteger(freightCents) || freightCents < 0)
    throw new Error("Freight must be a non-negative integer number of cents.");
  return {
    sourceOfferId: offer.id,
    before: evaluateOffer(request, offer),
    after: evaluateOffer(request, { ...offer, freightCents }),
  };
}

/** Uses the same decision policy and operator context as the purchasing advisor. */
export function previewFreightDecision(
  request: ProcurementRequest,
  offers: SupplierOffer[],
  context: AdvisorContext,
  offerId: string,
  freightCents: number,
) {
  const finding = resolveMissingConditions(request, offers).find(
    (item) => item.offerId === offerId,
  );
  if (!finding)
    throw new Error(
      "This delivery question no longer matches the current comparison.",
    );
  const offer = offers.find((item) => item.id === offerId)!;
  const scenario = compareFreightScenario(request, offer, freightCents);
  if (
    !scenario.after.eligibleForComparison ||
    scenario.after.totalCents === null
  )
    throw new Error(
      "Enter a valid final delivery amount within the supported range.",
    );
  const updatedOffer = { ...offer, freightCents };
  const updatedOffers = offers.map((item) =>
    item.id === offerId ? updatedOffer : item,
  );
  const before = analyzePurchase(request, offers, context);
  const after = analyzePurchase(request, updatedOffers, context);
  return {
    finding,
    updatedOffer,
    updatedOffers,
    freightCents,
    totalCents: scenario.after.totalCents,
    differenceCents:
      scenario.after.totalCents - finding.evidence.benchmarkTotalCents,
    before,
    after,
    decisionChanged:
      before.action !== after.action ||
      before.recommendedOfferId !== after.recommendedOfferId,
  };
}

export type FreightDecisionPreview = ReturnType<typeof previewFreightDecision>;

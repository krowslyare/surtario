import { analyzePurchase, validateContext, type AdvisorContext } from "./advisor";
import { evaluateOffer, type ProcurementRequest, type SupplierOffer } from "./procurement";
import { resolveMissingConditions } from "./missingResolution";

export type DecisionActionKind = "delivery" | "minimum";
export type DecisionAction = {
  kind: DecisionActionKind;
  offerId: string;
  title: string;
  reason: string;
  question: string;
  evidenceOfferIds: string[];
  proposedMinimumPackages?: number;
};
/** Proposals use confirmed quantities and constraints; they never change an offer. */
export function decisionActions(request: ProcurementRequest, offers: SupplierOffer[], context: AdvisorContext): DecisionAction[] {
  if (validateContext(context, offers).length || new Set(offers.map(o => o.currency)).size > 1) return [];
  const before = analyzePurchase(request, offers, context);
  const boundaries = resolveMissingConditions(request, offers);
  return offers.flatMap((offer): DecisionAction[] => {
    const evaluation = evaluateOffer(request, offer);
    if (evaluation.errors.length || request.quantity <= 0) return [];
    if (offer.freightCents === null) {
      const boundary = boundaries.find(item => item.offerId === offer.id);
      return [{ kind: "delivery", offerId: offer.id, title: `Confirm delivery with ${offer.supplier}`,
        reason: boundary?.explanation ?? "The final order total cannot be confirmed without delivery cost. Other missing conditions will remain pending.",
        question: boundary?.questionDraft ?? `For ${request.quantity} ${request.unit} of ${request.ingredient} (${request.specification}), please confirm the delivery cost per order, currency and tax basis for your ${offer.packageContent ?? "unconfirmed"} ${offer.packageUnit ?? "unit"} presentation.`,
        evidenceOfferIds: boundary?.evidence.sourceOfferIds ?? [offer.id],
      }];
    }
    const alternative = before.alternatives.find(item => item.offerId === offer.id);
    const blocked = alternative?.affordable === false || (alternative?.coverageDays != null && context.maxCoverageDays !== null && alternative.coverageDays > context.maxCoverageDays);
    const needed = evaluateOffer(request, { ...offer, minimumPackages: 1 }).packageCount;
    if (!blocked || needed === null || offer.minimumPackages === null || needed >= offer.minimumPackages) return [];
    const preview = analyzePurchase(request, offers.map(item => item.id === offer.id ? { ...item, minimumPackages: needed } : item), context).alternatives.find(item => item.offerId === offer.id);
    return [{ kind: "minimum", offerId: offer.id, title: `Ask ${offer.supplier} about a lower minimum`,
      reason: `The confirmed minimum of ${offer.minimumPackages} packs exceeds your stated budget or coverage. ${needed} packs cover the requested quantity. ${preview?.eligible ? "That hypothetical minimum would make this alternative eligible under your current constraints." : "A lower minimum may reduce the excess, but other constraints would still need review."}`,
      question: `For ${request.quantity} ${request.unit} of ${request.ingredient} (${request.specification}), could you accept a minimum of ${needed} packs of your ${offer.packageContent} ${offer.packageUnit} presentation instead of ${offer.minimumPackages}? This is a proposal based on our required quantity, not an agreed term. Please confirm the minimum, and state whether your other quoted terms remain unchanged.`,
      evidenceOfferIds: [offer.id], proposedMinimumPackages: needed,
    }];
  });
}

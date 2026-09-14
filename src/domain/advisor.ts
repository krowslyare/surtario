import {
  evaluateOffer,
  type ProcurementRequest,
  type SupplierOffer,
} from "./procurement";

export interface AdvisorContext {
  priority: "cash" | "unit_price" | "balanced";
  budgetCents: number | null;
  /** Quantity consumed per day, expressed in the request unit. */
  dailyUsage: number | null;
  /** Current stock, expressed in the request unit. */
  stockQuantity: number | null;
  maxCoverageDays: number | null;
  preferredOfferId: string | null;
}

export interface AdvisorAlternative {
  offerId: string;
  supplier: string;
  totalCents: number | null;
  unitPriceCents: number | null;
  excessQuantity: number | null;
  coverageDays: number | null;
  affordable: boolean | null;
  eligible: boolean;
  warnings: string[];
}

export type AdvisorAction = "buy" | "negotiate" | "clarify" | "research";

export interface AdvisorReport {
  alternatives: AdvisorAlternative[];
  recommendedOfferId: string | null;
  action: AdvisorAction;
  recommendation: string;
  impact: string;
  warning: string;
  negotiationDraft: string | null;
  missing: string[];
}

interface Candidate {
  offer: SupplierOffer;
  alternative: AdvisorAlternative;
}

const formatMoney = (cents: number, currency: SupplierOffer["currency"]) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);

const formatQuantity = (quantity: number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(quantity);

function validateContext(
  context: AdvisorContext,
  offers: SupplierOffer[],
): string[] {
  const errors: string[] = [];
  if (
    context.budgetCents !== null &&
    (!Number.isSafeInteger(context.budgetCents) || context.budgetCents < 0)
  ) {
    errors.push(
      "The budget must be a nonnegative whole number of cents.",
    );
  }
  if (
    context.dailyUsage !== null &&
    (!Number.isFinite(context.dailyUsage) ||
      context.dailyUsage <= 0 ||
      context.dailyUsage > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "Daily usage must be a finite number greater than zero within the safe range.",
    );
  }
  if (
    context.stockQuantity !== null &&
    (!Number.isFinite(context.stockQuantity) ||
      context.stockQuantity < 0 ||
      context.stockQuantity > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "Inventory must be a finite nonnegative number within the safe range.",
    );
  }
  if (
    context.maxCoverageDays !== null &&
    (!Number.isFinite(context.maxCoverageDays) ||
      context.maxCoverageDays <= 0 ||
      context.maxCoverageDays > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "Maximum coverage must be a finite number greater than zero within the safe range.",
    );
  }
  if (
    context.preferredOfferId !== null &&
    !offers.some((offer) => offer.id === context.preferredOfferId)
  ) {
    errors.push(
      "The preferred supplier does not match an available offer.",
    );
  }
  return errors;
}

function selectCandidate(
  candidates: Candidate[],
  priority: AdvisorContext["priority"],
): Candidate {
  const byTotal = [...candidates].sort(
    (a, b) =>
      a.alternative.totalCents! - b.alternative.totalCents! ||
      a.alternative.unitPriceCents! - b.alternative.unitPriceCents! ||
      a.offer.id.localeCompare(b.offer.id),
  );
  if (priority === "cash") return byTotal[0];

  const byUnitPrice = [...candidates].sort(
    (a, b) =>
      a.alternative.unitPriceCents! - b.alternative.unitPriceCents! ||
      a.alternative.totalCents! - b.alternative.totalCents! ||
      a.offer.id.localeCompare(b.offer.id),
  );
  if (priority === "unit_price") return byUnitPrice[0];

  const totalRank = new Map(
    byTotal.map((candidate, index) => [candidate.offer.id, index]),
  );
  const unitRank = new Map(
    byUnitPrice.map((candidate, index) => [candidate.offer.id, index]),
  );
  return [...candidates].sort(
    (a, b) =>
      totalRank.get(a.offer.id)! +
        unitRank.get(a.offer.id)! -
        totalRank.get(b.offer.id)! -
        unitRank.get(b.offer.id)! ||
      a.alternative.totalCents! - b.alternative.totalCents! ||
      a.offer.id.localeCompare(b.offer.id),
  )[0];
}

export function analyzePurchase(
  request: ProcurementRequest,
  offers: SupplierOffer[],
  context: AdvisorContext,
): AdvisorReport {
  const contextErrors = validateContext(context, offers);
  const mixedCurrency = new Set(offers.map((o) => o.currency)).size > 1;
  if (mixedCurrency)
    contextErrors.push(
      "Separate offers by currency before applying a budget or recommendation; no exchange rate is inferred.",
    );
  const missing: string[] = [];
  if (context.dailyUsage === null)
    missing.push("Daily usage needs confirmation.");
  if (context.stockQuantity === null)
    missing.push("Current inventory needs confirmation.");
  if (offers.length === 0) missing.push("At least one offer is required for analysis.");

  const zeroQuantity =
    Number.isFinite(request.quantity) && request.quantity === 0;
  const evaluations = offers.map((offer) => ({
    offer,
    evaluation: evaluateOffer(request, offer),
  }));
  for (const { offer, evaluation } of evaluations) {
    for (const pending of evaluation.pending) {
      missing.push(`Offer from ${offer.supplier || offer.id}: ${pending}`);
    }
  }
  const alternatives = evaluations.map(
    ({ offer, evaluation }): AdvisorAlternative => {
      const warnings = [
        ...evaluation.errors,
        ...evaluation.pending,
        ...evaluation.comparisonExclusions,
      ];
      const coverageDays =
        contextErrors.length === 0 &&
        context.dailyUsage !== null &&
        context.stockQuantity !== null &&
        evaluation.purchasedQuantity !== null
          ? (context.stockQuantity + evaluation.purchasedQuantity) /
            context.dailyUsage
          : null;
      const affordable =
        contextErrors.length > 0 || evaluation.totalCents === null
          ? null
          : context.budgetCents === null
            ? null
            : evaluation.totalCents <= context.budgetCents;
      if (affordable === false)
        warnings.push("The cash outlay exceeds the stated budget.");
      if (
        context.maxCoverageDays !== null &&
        coverageDays !== null &&
        coverageDays > context.maxCoverageDays
      ) {
        warnings.push("The purchase exceeds the stated maximum coverage.");
      }
      const withinCoverage =
        context.maxCoverageDays === null ||
        (coverageDays !== null && coverageDays <= context.maxCoverageDays);
      return {
        offerId: offer.id,
        supplier: offer.supplier,
        totalCents: evaluation.totalCents,
        unitPriceCents: evaluation.unitPriceCents,
        excessQuantity: evaluation.excessQuantity,
        coverageDays,
        affordable,
        eligible:
          !zeroQuantity &&
          contextErrors.length === 0 &&
          evaluation.eligibleForComparison &&
          affordable !== false &&
          withinCoverage,
        warnings,
      };
    },
  );

  if (zeroQuantity) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: "research",
      recommendation:
        "Enter a purchase quantity before selecting an offer.",
      impact:
        "The offers are references; there is no calculable order yet.",
      warning:
        "A market reference does not record a purchase or confirm its terms.",
      negotiationDraft: null,
      missing: [
        ...missing,
        "Enter a quantity greater than zero to purchase.",
      ],
    };
  }

  if (contextErrors.length > 0) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: "clarify",
      recommendation:
        "Correct the decision context before comparing offers.",
      impact:
        "No recommendation was calculated with out-of-range data.",
      warning: contextErrors.join(" "),
      negotiationDraft: null,
      missing: [...missing, ...contextErrors],
    };
  }

  const comparableCandidates = alternatives.flatMap(
    (alternative, index): Candidate[] =>
      evaluations[index].evaluation.eligibleForComparison &&
      alternative.totalCents !== null &&
      alternative.unitPriceCents !== null
        ? [{ offer: offers[index], alternative }]
        : [],
  );
  const candidates = comparableCandidates.filter(
    ({ alternative }) => alternative.eligible,
  );
  if (candidates.length === 0) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: offers.length === 0 ? "research" : "clarify",
      recommendation:
        offers.length === 0
          ? "Find at least one verifiable offer for this request."
          : "Confirm pending data or adjust the constraints before selecting.",
      impact:
        "There is no eligible comparable cash outlay with the current data.",
      warning:
        "Missing price, tax, delivery, and equivalencies were not inferred.",
      negotiationDraft: null,
      missing,
    };
  }

  if (comparableCandidates.length === 1) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: "research",
      recommendation: "Find another verifiable offer before deciding.",
      impact: `The only eligible option requires ${formatMoney(candidates[0].alternative.totalCents!, candidates[0].offer.currency)} for this order.`,
      warning:
        "One offer is not enough to determine whether the terms are competitive.",
      negotiationDraft: null,
      missing: [...missing, "A second comparable offer is required."],
    };
  }

  const selected = selectCandidate(candidates, context.priority);
  const preferred =
    context.preferredOfferId === null
      ? null
      : (candidates.find(
          ({ offer }) => offer.id === context.preferredOfferId,
        ) ?? null);
  const comparator = comparableCandidates
    .filter(({ offer }) => offer.id !== selected.offer.id)
    .sort((a, b) => a.alternative.totalCents! - b.alternative.totalCents!)[0];

  if (preferred !== null && preferred.offer.id !== selected.offer.id) {
    const difference =
      preferred.alternative.totalCents! - selected.alternative.totalCents!;
    const cashImpact =
      difference >= 0
        ? `${selected.offer.supplier} requires ${formatMoney(difference, selected.offer.currency)} less cash for this order`
        : `${selected.offer.supplier} requires ${formatMoney(-difference, selected.offer.currency)} more cash for this order`;
    return {
      alternatives,
      recommendedOfferId: preferred.offer.id,
      action: "negotiate",
      recommendation: `Negotiate with ${preferred.offer.supplier} using the comparable offer from ${selected.offer.supplier}.`,
      impact: `${cashImpact} and leaves ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} in excess. Excess remains as inventory; it is not realized savings.`,
      warning:
        "Confirm that both quotes retain the same specification, tax, and delivery terms during negotiation.",
      negotiationDraft: `Hello, we have a comparable offer from ${selected.offer.supplier} for ${formatMoney(selected.alternative.totalCents!, selected.offer.currency)} for this request. Could you review your quote and confirm the final terms?`,
      missing,
    };
  }

  const cashDifference =
    comparator.alternative.totalCents! - selected.alternative.totalCents!;
  const impact =
    cashDifference >= 0
      ? `${selected.offer.supplier} requires ${formatMoney(cashDifference, selected.offer.currency)} less cash than ${comparator.offer.supplier} for this order and leaves ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} in excess. Excess remains as inventory; it is not realized savings.`
      : `${selected.offer.supplier} requires ${formatMoney(-cashDifference, selected.offer.currency)} more cash than ${comparator.offer.supplier} for this order and leaves ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} in excess. The lower unit price only helps if that inventory is used.`;
  return {
    alternatives,
    recommendedOfferId: selected.offer.id,
    action: "buy",
    recommendation: `Choose ${selected.offer.supplier} for the ${context.priority === "cash" ? "cash" : context.priority === "unit_price" ? "unit price" : "balanced"} priority.`,
    impact,
    warning:
      context.dailyUsage === null || context.stockQuantity === null
        ? "Inventory coverage remains pending; demand was not projected."
        : "The recommendation compares only this order and does not prove profit or realized savings.",
    negotiationDraft: null,
    missing,
  };
}

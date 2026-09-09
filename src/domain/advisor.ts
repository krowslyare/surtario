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
      "El presupuesto debe expresarse en céntimos enteros no negativos.",
    );
  }
  if (
    context.dailyUsage !== null &&
    (!Number.isFinite(context.dailyUsage) ||
      context.dailyUsage <= 0 ||
      context.dailyUsage > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "El consumo diario debe ser un número finito mayor que cero dentro del rango seguro.",
    );
  }
  if (
    context.stockQuantity !== null &&
    (!Number.isFinite(context.stockQuantity) ||
      context.stockQuantity < 0 ||
      context.stockQuantity > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "El stock debe ser un número finito no negativo dentro del rango seguro.",
    );
  }
  if (
    context.maxCoverageDays !== null &&
    (!Number.isFinite(context.maxCoverageDays) ||
      context.maxCoverageDays <= 0 ||
      context.maxCoverageDays > Number.MAX_SAFE_INTEGER)
  ) {
    errors.push(
      "La cobertura máxima debe ser un número finito mayor que cero dentro del rango seguro.",
    );
  }
  if (
    context.preferredOfferId !== null &&
    !offers.some((offer) => offer.id === context.preferredOfferId)
  ) {
    errors.push(
      "El proveedor preferido no corresponde a una oferta disponible.",
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
      "Separa las ofertas por moneda antes de aplicar un presupuesto o recomendación; no se infiere un tipo de cambio.",
    );
  const missing: string[] = [];
  if (context.dailyUsage === null)
    missing.push("Falta confirmar el consumo diario.");
  if (context.stockQuantity === null)
    missing.push("Falta confirmar el stock actual.");
  if (offers.length === 0) missing.push("Falta una oferta para analizar.");

  const zeroQuantity =
    Number.isFinite(request.quantity) && request.quantity === 0;
  const evaluations = offers.map((offer) => ({
    offer,
    evaluation: evaluateOffer(request, offer),
  }));
  for (const { offer, evaluation } of evaluations) {
    for (const pending of evaluation.pending) {
      missing.push(`Oferta de ${offer.supplier || offer.id}: ${pending}`);
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
        warnings.push("El desembolso supera el presupuesto indicado.");
      if (
        context.maxCoverageDays !== null &&
        coverageDays !== null &&
        coverageDays > context.maxCoverageDays
      ) {
        warnings.push("La compra supera la cobertura máxima indicada.");
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
        "Define una cantidad de compra antes de elegir una oferta.",
      impact:
        "Las ofertas sirven como referencia; todavía no hay un pedido calculable.",
      warning:
        "Una referencia de mercado no registra una compra ni confirma sus condiciones.",
      negotiationDraft: null,
      missing: [
        ...missing,
        "Falta definir una cantidad mayor que cero para comprar.",
      ],
    };
  }

  if (contextErrors.length > 0) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: "clarify",
      recommendation:
        "Corrige el contexto de decisión antes de comparar ofertas.",
      impact:
        "No se calculó una recomendación con datos fuera del rango válido.",
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
          ? "Busca al menos una oferta verificable para esta solicitud."
          : "Confirma los datos pendientes o ajusta las restricciones antes de elegir.",
      impact:
        "No hay un desembolso comparable y elegible con los datos actuales.",
      warning:
        "No se infirieron precio, tributos, entrega ni equivalencias faltantes.",
      negotiationDraft: null,
      missing,
    };
  }

  if (comparableCandidates.length === 1) {
    return {
      alternatives,
      recommendedOfferId: null,
      action: "research",
      recommendation: "Busca otra oferta verificable antes de decidir.",
      impact: `La única alternativa elegible exige ${formatMoney(candidates[0].alternative.totalCents!, candidates[0].offer.currency)} por este pedido.`,
      warning:
        "Una sola oferta no permite comprobar si las condiciones son competitivas.",
      negotiationDraft: null,
      missing: [...missing, "Falta una segunda oferta comparable."],
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
        ? `${selected.offer.supplier} exige ${formatMoney(difference, selected.offer.currency)} menos de caja en este pedido`
        : `${selected.offer.supplier} exige ${formatMoney(-difference, selected.offer.currency)} más de caja en este pedido`;
    return {
      alternatives,
      recommendedOfferId: preferred.offer.id,
      action: "negotiate",
      recommendation: `Negocia con ${preferred.offer.supplier} usando la oferta comparable de ${selected.offer.supplier}.`,
      impact: `${cashImpact} y deja ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} de excedente. El excedente permanece como stock; no es ahorro realizado.`,
      warning:
        "Confirma que ambas cotizaciones mantengan la misma especificación, tributos y entrega al negociar.",
      negotiationDraft: `Hola, tenemos una oferta comparable de ${selected.offer.supplier} por ${formatMoney(selected.alternative.totalCents!, selected.offer.currency)} para esta solicitud. ¿Podrían revisar su cotización y confirmar sus condiciones finales?`,
      missing,
    };
  }

  const cashDifference =
    comparator.alternative.totalCents! - selected.alternative.totalCents!;
  const impact =
    cashDifference >= 0
      ? `${selected.offer.supplier} exige ${formatMoney(cashDifference, selected.offer.currency)} menos de caja que ${comparator.offer.supplier} en este pedido y deja ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} de excedente. El excedente permanece como stock; no es ahorro realizado.`
      : `${selected.offer.supplier} exige ${formatMoney(-cashDifference, selected.offer.currency)} más de caja que ${comparator.offer.supplier} en este pedido y deja ${formatQuantity(selected.alternative.excessQuantity ?? 0)} ${request.unit} de excedente. El menor precio unitario solo se aprovecha si ese stock se utiliza.`;
  return {
    alternatives,
    recommendedOfferId: selected.offer.id,
    action: "buy",
    recommendation: `Elige ${selected.offer.supplier} para la prioridad ${context.priority === "cash" ? "de caja" : context.priority === "unit_price" ? "de precio unitario" : "equilibrada"}.`,
    impact,
    warning:
      context.dailyUsage === null || context.stockQuantity === null
        ? "La cobertura de inventario queda pendiente; no se proyectó demanda."
        : "La recomendación solo compara este pedido y no acredita utilidad ni ahorro realizado.",
    negotiationDraft: null,
    missing,
  };
}

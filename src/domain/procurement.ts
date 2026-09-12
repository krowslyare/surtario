export type BaseUnit = "kg" | "lb" | "L" | "unit";
export type PackageUnit = BaseUnit | "g" | "oz" | "ml";
export type Currency = "PEN" | "USD";
export type TaxStatus = "included" | "excluded" | "unknown";

export interface ProcurementRequest {
  ingredient: string;
  specification: string;
  quantity: number;
  unit: BaseUnit;
}

export interface SupplierOffer {
  id: string;
  supplier: string;
  ingredient: string;
  specification: string;
  packageContent: number | null;
  packageUnit: PackageUnit | null;
  priceCents: number | null;
  currency: Currency;
  minimumPackages: number | null;
  freightCents: number | null;
  taxStatus: TaxStatus;
  deliveryConfirmed: boolean;
}

export type ProcurementIssueCode =
  | "out-of-range"
  | "required"
  | "not-finite"
  | "not-positive"
  | "not-integer"
  | "incompatible-ingredient"
  | "incompatible-specification"
  | "incompatible-unit"
  | "delivery-unconfirmed"
  | "missing-package-content"
  | "missing-package-unit"
  | "missing-price"
  | "missing-minimum"
  | "missing-freight"
  | "tax-excluded"
  | "tax-unknown";

export interface ProcurementIssue {
  field: string;
  code: ProcurementIssueCode;
  message: string;
}

export interface OfferEvaluation {
  offerId: string;
  offer: SupplierOffer;
  errors: string[];
  pending: string[];
  comparisonExclusions: string[];
  normalizedPackageContent: number | null;
  packageCount: number | null;
  purchasedQuantity: number | null;
  excessQuantity: number | null;
  subtotalCents: number | null;
  totalCents: number | null;
  /** Merchandise price per request base unit. Kept unrounded. */
  unitPriceCents: number | null;
  eligibleForComparison: boolean;
}

export interface ComparisonGroup {
  currency: Currency;
  unit: BaseUnit;
  offerIds: string[];
  lowestTotalCents: number;
  lowestTotalOfferIds: string[];
}

export interface ProcurementComparison {
  request: ProcurementRequest;
  requestErrors: string[];
  evaluations: OfferEvaluation[];
  groups: ComparisonGroup[];
  needsAlternative: boolean;
}

const unitDefinition: Record<
  PackageUnit,
  { dimension: "mass" | "volume" | "count"; canonicalFactor: number }
> = {
  kg: { dimension: "mass", canonicalFactor: 1 },
  g: { dimension: "mass", canonicalFactor: 0.001 },
  lb: { dimension: "mass", canonicalFactor: 0.45359237 },
  oz: { dimension: "mass", canonicalFactor: 0.028349523125 },
  L: { dimension: "volume", canonicalFactor: 1 },
  ml: { dimension: "volume", canonicalFactor: 0.001 },
  unit: { dimension: "count", canonicalFactor: 1 },
};

function issue(
  field: string,
  code: ProcurementIssueCode,
  message: string,
): ProcurementIssue {
  return { field, code, message };
}

function validatePositiveFinite(
  value: number,
  field: string,
  label: string,
): ProcurementIssue[] {
  if (!Number.isFinite(value)) {
    return [
      issue(
        field,
        "not-finite",
        `Completa ${label.toLocaleLowerCase("es-PE")} con un número válido.`,
      ),
    ];
  }
  if (value <= 0) {
    return [issue(field, "not-positive", `${label} debe ser mayor que cero.`)];
  }
  return [];
}

function validateNonNegativeInteger(
  value: number,
  field: string,
  label: string,
): ProcurementIssue[] {
  if (!Number.isFinite(value)) {
    return [
      issue(
        field,
        "not-finite",
        `Completa ${label.toLocaleLowerCase("es-PE")} con un número válido.`,
      ),
    ];
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    return [
      issue(
        field,
        "not-integer",
        `${label} debe expresarse en céntimos enteros no negativos.`,
      ),
    ];
  }
  return [];
}

function validateRequest(request: ProcurementRequest): ProcurementIssue[] {
  const errors: ProcurementIssue[] = [];
  if (request.ingredient.trim() === "") {
    errors.push(
      issue("ingredient", "required", "El ingrediente es obligatorio."),
    );
  }
  if (request.specification.trim() === "") {
    errors.push(
      issue("specification", "required", "La especificación es obligatoria."),
    );
  }
  errors.push(
    ...validatePositiveFinite(
      request.quantity,
      "quantity",
      "La cantidad requerida",
    ),
  );
  return errors;
}

/** Avoids adding a package for ordinary IEEE-754 noise at an integer boundary. */
function ceilPackageRatio(quantity: number, content: number): number {
  const ratio = quantity / content;
  const nearest = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(ratio)) * 8;
  return nearest >= 1 && Math.abs(ratio - nearest) <= tolerance
    ? nearest
    : Math.ceil(ratio);
}

export function evaluateOffer(
  request: ProcurementRequest,
  offer: SupplierOffer,
): OfferEvaluation {
  const errors = validateRequest(request);
  const pending: ProcurementIssue[] = [];
  const comparisonExclusions: ProcurementIssue[] = [];

  if (offer.id.trim() === "") {
    errors.push(
      issue("offer.id", "required", "La oferta requiere un identificador."),
    );
  }
  if (offer.supplier.trim() === "") {
    errors.push(
      issue("offer.supplier", "required", "El proveedor es obligatorio."),
    );
  }
  if (offer.ingredient !== request.ingredient) {
    comparisonExclusions.push(
      issue(
        "offer.ingredient",
        "incompatible-ingredient",
        "El ingrediente no coincide exactamente con la solicitud.",
      ),
    );
  }
  if (offer.specification !== request.specification) {
    comparisonExclusions.push(
      issue(
        "offer.specification",
        "incompatible-specification",
        "La especificación no coincide exactamente con la solicitud.",
      ),
    );
  }

  let normalizedPackageContent: number | null = null;
  if (offer.packageContent === null) {
    pending.push(
      issue(
        "offer.packageContent",
        "missing-package-content",
        "Falta confirmar el contenido del empaque.",
      ),
    );
  } else {
    errors.push(
      ...validatePositiveFinite(
        offer.packageContent,
        "offer.packageContent",
        "El contenido del empaque",
      ),
    );
  }

  if (offer.packageUnit === null) {
    pending.push(
      issue(
        "offer.packageUnit",
        "missing-package-unit",
        "Falta confirmar la unidad del empaque.",
      ),
    );
  } else if (
    unitDefinition[offer.packageUnit].dimension !==
    unitDefinition[request.unit].dimension
  ) {
    comparisonExclusions.push(
      issue(
        "offer.packageUnit",
        "incompatible-unit",
        "La unidad del empaque no se puede convertir a la unidad solicitada.",
      ),
    );
  } else if (
    offer.packageContent !== null &&
    Number.isFinite(offer.packageContent) &&
    offer.packageContent > 0
  ) {
    normalizedPackageContent =
      (offer.packageContent *
        unitDefinition[offer.packageUnit].canonicalFactor) /
      unitDefinition[request.unit].canonicalFactor;
  }

  if (offer.priceCents === null) {
    pending.push(
      issue(
        "offer.priceCents",
        "missing-price",
        "Falta confirmar el precio por empaque.",
      ),
    );
  } else {
    errors.push(
      ...validateNonNegativeInteger(
        offer.priceCents,
        "offer.priceCents",
        "El precio",
      ),
    );
  }

  if (offer.minimumPackages === null) {
    pending.push(
      issue(
        "offer.minimumPackages",
        "missing-minimum",
        "Falta confirmar la compra mínima.",
      ),
    );
  } else if (!Number.isFinite(offer.minimumPackages)) {
    errors.push(
      issue(
        "offer.minimumPackages",
        "not-finite",
        "La compra mínima debe ser finita.",
      ),
    );
  } else if (
    !Number.isSafeInteger(offer.minimumPackages) ||
    offer.minimumPackages < 1
  ) {
    errors.push(
      issue(
        "offer.minimumPackages",
        "not-integer",
        "La compra mínima debe ser un número entero de empaques, como mínimo uno.",
      ),
    );
  }

  if (offer.freightCents === null) {
    pending.push(
      issue(
        "offer.freightCents",
        "missing-freight",
        "Falta confirmar el flete por pedido.",
      ),
    );
  } else {
    errors.push(
      ...validateNonNegativeInteger(
        offer.freightCents,
        "offer.freightCents",
        "El flete",
      ),
    );
  }

  if (offer.taxStatus === "excluded") {
    pending.push(
      issue(
        "offer.taxStatus",
        "tax-excluded",
        "El tributo está excluido; falta incorporarlo para obtener el total.",
      ),
    );
  } else if (offer.taxStatus === "unknown") {
    pending.push(
      issue(
        "offer.taxStatus",
        "tax-unknown",
        "Falta confirmar la condición tributaria.",
      ),
    );
  }
  if (!offer.deliveryConfirmed) {
    comparisonExclusions.push(
      issue(
        "offer.deliveryConfirmed",
        "delivery-unconfirmed",
        "La entrega requerida no está confirmada.",
      ),
    );
  }

  const requestIsValid = validateRequest(request).length === 0;
  const packageInputsValid =
    requestIsValid &&
    normalizedPackageContent !== null &&
    offer.minimumPackages !== null &&
    Number.isSafeInteger(offer.minimumPackages) &&
    offer.minimumPackages >= 1;

  let packageCount = packageInputsValid
    ? Math.max(
        ceilPackageRatio(request.quantity, normalizedPackageContent!),
        offer.minimumPackages!,
      )
    : null;
  let purchasedQuantity =
    packageCount === null ? null : packageCount * normalizedPackageContent!;
  let excessQuantity =
    purchasedQuantity === null
      ? null
      : Math.max(0, purchasedQuantity - request.quantity);
  const moneyInputsValid =
    offer.priceCents !== null &&
    Number.isSafeInteger(offer.priceCents) &&
    offer.priceCents >= 0;
  let subtotalCents =
    packageCount !== null && moneyInputsValid
      ? packageCount * offer.priceCents!
      : null;
  const freightValid =
    offer.freightCents !== null &&
    Number.isSafeInteger(offer.freightCents) &&
    offer.freightCents >= 0;
  let totalCents =
    subtotalCents !== null && freightValid && offer.taxStatus === "included"
      ? subtotalCents + offer.freightCents!
      : null;
  let unitPriceCents =
    normalizedPackageContent !== null && moneyInputsValid
      ? offer.priceCents! / normalizedPackageContent
      : null;

  const unsafeCount =
    packageCount !== null &&
    (!Number.isSafeInteger(packageCount) || packageCount < 1);
  const unsafeMoney = [subtotalCents, totalCents].some(
    (value) => value !== null && !Number.isSafeInteger(value),
  );
  const unsafeQuantity = [
    normalizedPackageContent,
    purchasedQuantity,
    excessQuantity,
    unitPriceCents,
  ].some((value) => value !== null && !Number.isFinite(value));
  if (
    unsafeCount ||
    unsafeMoney ||
    unsafeQuantity ||
    normalizedPackageContent === 0
  ) {
    errors.push(
      issue(
        "calculation",
        "out-of-range",
        "La cantidad o el importe supera el rango de cálculo seguro. Revisa los valores.",
      ),
    );
    packageCount =
      purchasedQuantity =
      excessQuantity =
      subtotalCents =
      totalCents =
      unitPriceCents =
        null;
  }

  const eligibleForComparison =
    errors.length === 0 &&
    comparisonExclusions.length === 0 &&
    totalCents !== null;

  return {
    offerId: offer.id,
    offer,
    errors: errors.map((entry) => entry.message),
    pending: pending.map((entry) => entry.message),
    comparisonExclusions: comparisonExclusions.map((entry) => entry.message),
    normalizedPackageContent,
    packageCount,
    purchasedQuantity,
    excessQuantity,
    subtotalCents,
    totalCents,
    unitPriceCents,
    eligibleForComparison,
  };
}

export function compareProcurement(
  request: ProcurementRequest,
  offers: SupplierOffer[],
): ProcurementComparison {
  const requestIssues = validateRequest(request);
  const evaluations = offers.map((offer) => evaluateOffer(request, offer));
  const currencies: Currency[] = ["PEN", "USD"];
  const groups =
    requestIssues.length === 0
      ? currencies.flatMap((currency): ComparisonGroup[] => {
          const comparable = evaluations.filter(
            (evaluation) =>
              evaluation.eligibleForComparison &&
              evaluation.offer.currency === currency,
          );
          if (comparable.length < 2) return [];
          const lowestTotalCents = Math.min(
            ...comparable.map((evaluation) => evaluation.totalCents!),
          );
          return [
            {
              currency,
              unit: request.unit,
              offerIds: comparable.map((evaluation) => evaluation.offerId),
              lowestTotalCents,
              lowestTotalOfferIds: comparable
                .filter(
                  (evaluation) => evaluation.totalCents === lowestTotalCents,
                )
                .map((evaluation) => evaluation.offerId),
            },
          ];
        })
      : [];

  return {
    request,
    requestErrors: requestIssues.map((entry) => entry.message),
    evaluations,
    groups,
    needsAlternative: groups.length === 0,
  };
}

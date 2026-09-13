import { v } from "convex/values";

export const baseUnitValidator = v.union(
  v.literal("kg"),
  v.literal("lb"),
  v.literal("L"),
  v.literal("unit"),
);

export const packageUnitValidator = v.union(
  baseUnitValidator,
  v.literal("g"),
  v.literal("oz"),
  v.literal("ml"),
);

export const currencyValidator = v.union(v.literal("PEN"), v.literal("USD"));

export const taxStatusValidator = v.union(
  v.literal("included"),
  v.literal("excluded"),
  v.literal("unknown"),
);

export const procurementRequestValidator = v.object({
  ingredient: v.string(),
  specification: v.string(),
  quantity: v.number(),
  unit: baseUnitValidator,
});

export const supplierOfferValidator = v.object({
  id: v.string(),
  supplier: v.string(),
  ingredient: v.string(),
  specification: v.string(),
  packageContent: v.union(v.number(), v.null()),
  packageUnit: v.union(packageUnitValidator, v.null()),
  priceCents: v.union(v.number(), v.null()),
  currency: currencyValidator,
  minimumPackages: v.union(v.number(), v.null()),
  freightCents: v.union(v.number(), v.null()),
  taxStatus: taxStatusValidator,
  deliveryConfirmed: v.boolean(),
});

export const offerEvaluationValidator = v.object({
  offerId: v.string(),
  offer: supplierOfferValidator,
  errors: v.array(v.string()),
  pending: v.array(v.string()),
  comparisonExclusions: v.array(v.string()),
  normalizedPackageContent: v.union(v.number(), v.null()),
  packageCount: v.union(v.number(), v.null()),
  purchasedQuantity: v.union(v.number(), v.null()),
  excessQuantity: v.union(v.number(), v.null()),
  subtotalCents: v.union(v.number(), v.null()),
  totalCents: v.union(v.number(), v.null()),
  unitPriceCents: v.union(v.number(), v.null()),
  eligibleForComparison: v.boolean(),
});

export const comparisonGroupValidator = v.object({
  currency: currencyValidator,
  unit: baseUnitValidator,
  offerIds: v.array(v.string()),
  lowestTotalCents: v.number(),
  lowestTotalOfferIds: v.array(v.string()),
});

export const procurementComparisonValidator = v.object({
  request: procurementRequestValidator,
  requestErrors: v.array(v.string()),
  evaluations: v.array(offerEvaluationValidator),
  groups: v.array(comparisonGroupValidator),
  needsAlternative: v.boolean(),
});

export const exampleValidator = v.object({
  request: procurementRequestValidator,
  offers: v.array(supplierOfferValidator),
});

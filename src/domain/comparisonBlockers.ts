import {
  evaluateOffer,
  type ProcurementRequest,
  type SupplierOffer,
} from "./procurement";

export type ComparisonBlocker = {
  kind: "invalid" | "confirmation" | "pending";
  message: string;
  supplier: string;
};
export function comparisonBlockers(comparison: {
  request: ProcurementRequest;
  offers: SupplierOffer[];
}): ComparisonBlocker[] {
  const groups: Record<ComparisonBlocker["kind"], ComparisonBlocker[]> = {
    invalid: [],
    confirmation: [],
    pending: [],
  };
  for (const offer of comparison.offers) {
    const result = evaluateOffer(comparison.request, offer);
    for (const [kind, messages] of [
      ["invalid", result.errors],
      ["confirmation", result.comparisonExclusions],
      ["pending", result.pending],
    ] as const) {
      for (const message of new Set(messages))
        groups[kind].push({ kind, message, supplier: offer.supplier });
    }
  }
  return [...groups.invalid, ...groups.confirmation, ...groups.pending];
}
export const blockerLabels = {
  invalid: "Correct input",
  confirmation: "Check compatibility or delivery",
  pending: "Confirm missing terms",
};

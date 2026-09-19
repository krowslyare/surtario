import { type ProcurementRequest, type SupplierOffer } from "./procurement";
import { comparisonBlockers } from "./comparisonBlockers";
export function casePriority(
  item: { status: string; comparisonId?: string; researchRunIds: string[] },
  comparison?: { request: ProcurementRequest; offers: SupplierOffer[] },
) {
  const blocker = comparison && comparisonBlockers(comparison)[0];
  if (blocker && blocker.kind !== "pending")
    return {
      rank: 0,
      reason: blocker.message,
      next:
        blocker.kind === "invalid"
          ? "Open the comparison and correct the input."
          : "Open the comparison and review this condition.",
    };
  if (blocker)
    return {
      rank: 0,
      reason: "Commercial terms need confirmation",
      next: "Open the comparison and prepare a question.",
    };
  if (item.status === "failed" || item.status === "canceled")
    return {
      rank: 1,
      reason: "Research needs attention",
      next: "Review the saved outcome before continuing.",
    };
  if (item.researchRunIds.length && !comparison)
    return {
      rank: 2,
      reason: "Research evidence available",
      next: "Review sources and prepare a comparison.",
    };
  if (comparison)
    return {
      rank: 3,
      reason: "Comparison available",
      next: "Review the current decision.",
    };
  if (item.status === "running")
    return {
      rank: 4,
      reason: "Research in progress",
      next: "Open the case to review incremental evidence.",
    };
  return {
    rank: 5,
    reason: "Saved question",
    next: "Continue research in this case.",
  };
}

import type { ProcurementRequest, SupplierOffer } from "./procurement";
import { comparisonBlockers } from "./comparisonBlockers";
import { workStatus } from "./workStatus";

/** Compatibility helper; priority is shared with Overview. Evidence must be explicitly unreviewed. */
export function casePriority(
  item: { status: string; comparisonId?: string; researchRunIds: string[]; pendingEvidence?: number },
  comparison?: { request: ProcurementRequest; offers: SupplierOffer[] },
) {
  const status = workStatus({ requests: [], reviewedReplyIds: [], blocker: comparison ? comparisonBlockers(comparison)[0]?.message ?? null : null,
    pendingEvidence: item.pendingEvidence ?? 0, running: item.status === "running", failed: item.status === "failed" || item.status === "canceled", hasComparison: Boolean(comparison) });
  return { rank: status.rank, reason: status.description, next: status.action };
}

import { expect, test } from "vitest";
import { casePriority } from "./casePriority";
import { usRiceOffers, usRiceRequest } from "../../fixtures/procurement";
test("worklist ranks explicit missing terms without inventing spend or urgency", () => {
  const item = { status: "complete", researchRunIds: ["run"], pendingEvidence: 1 };
  const blocked = casePriority(item, {
    request: usRiceRequest,
    offers: usRiceOffers.map((o) => ({ ...o, freightCents: null })),
  });
  expect(blocked.next).toBe("Review comparison");
  expect(blocked.rank).toBeLessThan(
    casePriority({ status: "failed", researchRunIds: [] }).rank,
  );
  expect(casePriority(item).next).toBe("Review findings");
  expect(casePriority({ status: "idle", researchRunIds: [] }).reason).toBe(
    "Your saved evidence is available whenever you need it.",
  );
});

import { comparisonBlockers } from "./comparisonBlockers";
test("delivery confirmation is a blocker even when all numeric terms are complete", () => {
  const comparison = {
    request: usRiceRequest,
    offers: [{ ...usRiceOffers[0], deliveryConfirmed: false }],
  };
  expect(comparisonBlockers(comparison)).toEqual([
    {
      kind: "confirmation",
      supplier: "Supplier A",
      message: "Required delivery is not confirmed.",
    },
  ]);
  expect(
    casePriority({ status: "complete", researchRunIds: [] }, comparison).reason,
  ).toBe("Required delivery is not confirmed.");
});
test("invalid input, incompatible specification and missing terms remain distinct", () => {
  const blockers = comparisonBlockers({
    request: { ...usRiceRequest, quantity: 0 },
    offers: [
      { ...usRiceOffers[0], specification: "Different", freightCents: null },
    ],
  });
  expect(blockers[0].kind).toBe("invalid");
  expect(
    blockers.some(
      (b) => b.kind === "confirmation" && b.message.includes("specification"),
    ),
  ).toBe(true);
  expect(blockers.some((b) => b.kind === "pending")).toBe(true);
});

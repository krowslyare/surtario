import { expect, test } from "vitest";
import { casePriority } from "./casePriority";
import { usRiceOffers, usRiceRequest } from "../../fixtures/procurement";
test("worklist ranks explicit missing terms without inventing spend or urgency", () => {
  const item = { status: "complete", researchRunIds: ["run"] };
  const blocked = casePriority(item, {
    request: usRiceRequest,
    offers: usRiceOffers.map((o) => ({ ...o, freightCents: null })),
  });
  expect(blocked.reason).toBe("Commercial terms need confirmation");
  expect(blocked.rank).toBeLessThan(
    casePriority({ status: "failed", researchRunIds: [] }).rank,
  );
  expect(casePriority(item).reason).toBe("Research evidence available");
  expect(casePriority({ status: "idle", researchRunIds: [] }).reason).toBe(
    "Saved question",
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

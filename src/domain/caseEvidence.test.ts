import { test, expect } from "vitest";
import { mergeCaseEvidence } from "./caseEvidence";
import { extractionToPurchase, draftValues } from "./extraction";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
function seed(id: string, price: string) {
  const values = {
    ...draftValues(extractionExample),
    price,
    packageContent: "18",
    packageUnit: "kg",
  };
  const s = extractionToPurchase(
    { ...extractionSource, id, url: "https://example.com/rice" },
    extractionExample,
    values,
    true,
  );
  s.sources[id].webReview = {
    runId: id,
    sourceIndex: 0,
    values,
    confirmed: true,
  };
  return s;
}
test("changed source replaces active same-URL offer while preserving quantity and historical evidence", () => {
  const first = seed("first", "80"),
    next = seed("second", "90");
  const current = {
    ...first,
    id: "comparison",
    revision: 2,
    request: { ...first.request, quantity: 20 },
  };
  const result = mergeCaseEvidence(current, next, true);
  expect(result.request.quantity).toBe(20);
  expect(result.offers.map((o) => o.id)).toEqual(["second"]);
  expect(result.sources.first).toEqual(first.sources.first);
  expect(result.resumeComparison).toEqual({ id: "comparison", revision: 2 });
  expect(result.offers[0].freightCents).toBeNull();
  expect(() => mergeCaseEvidence(current, next, false)).toThrow(/Confirm/);
  expect(() =>
    mergeCaseEvidence(
      current,
      { ...next, request: { ...next.request, ingredient: "Oil" } },
      true,
    ),
  ).toThrow(/must match/);
});

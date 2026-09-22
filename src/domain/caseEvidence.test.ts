import { test, expect } from "vitest";
import { mergeCaseEvidence } from "./caseEvidence";
import { extractionToPurchase, draftValues } from "./extraction";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
function seed(id: string, price: string, url = "https://example.com/rice") {
  const values = {
    ...draftValues(extractionExample),
    price,
    packageContent: "18",
    packageUnit: "kg",
  };
  const s = extractionToPurchase(
    { ...extractionSource, id, url },
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

test("a mixed saved-study selection adds new evidence without resetting confirmed terms", () => {
  const first = seed("first", "80");
  const next = seed("second", "90", "https://another.example/rice");
  const current = {
    ...first, id: "comparison", revision: 3,
    request: { ...first.request, quantity: 40 },
    offers: [{ ...first.offers[0], freightCents: 500, minimumPackages: 2 }],
  };
  const incoming = {
    ...next, offers: [...first.offers, ...next.offers],
    sources: { ...first.sources, ...next.sources },
  };
  const result = mergeCaseEvidence(current, incoming, true);
  expect(result.offers).toEqual([...current.offers, ...next.offers]);
  expect(result.sources.first).toBe(current.sources.first);
  expect(result.sources.second).toEqual(next.sources.second);
  expect(result.request.quantity).toBe(40);
  expect(result.resumeComparison).toEqual({ id: "comparison", revision: 3 });
  expect(next.offers[0].freightCents).toBeNull();
  expect(() => mergeCaseEvidence({ ...result, id: "comparison", revision: 4 }, incoming, true))
    .toThrow(/already in the saved comparison/);
});

test("known historical evidence cannot resurrect an old offer or overwrite its source", () => {
  const old = seed("old", "70");
  const active = seed("active", "80");
  const next = seed("new", "90", "https://another.example/rice");
  const current = { ...active, id: "comparison", revision: 3,
    sources: { ...old.sources, ...active.sources } };
  const incoming = { ...next, offers: [...old.offers, ...next.offers],
    sources: { ...old.sources, ...next.sources, active: old.sources.old } };
  const result = mergeCaseEvidence(current, incoming, true);
  expect(result.offers.map(offer => offer.id)).toEqual(["active", "new"]);
  expect(result.sources.active).toBe(active.sources.active);
  expect(result.sources.old).toBe(old.sources.old);
});

test("mixed old and refreshed same-URL evidence retains history and replaces only the active offer", () => {
  const first = seed("first", "80"), next = seed("second", "90");
  const current = { ...first, id: "comparison", revision: 2 };
  const incoming = { ...next, offers: [...first.offers, ...next.offers],
    sources: { ...first.sources, ...next.sources } };
  const result = mergeCaseEvidence(current, incoming, true);
  expect(result.offers.map(offer => offer.id)).toEqual(["second"]);
  expect(Object.keys(result.sources)).toEqual(["first", "second"]);
  expect(() => mergeCaseEvidence(current, incoming, false)).toThrow(/Confirm/);
  expect(() => mergeCaseEvidence(current, { ...incoming,
    request: { ...incoming.request, specification: "different" } }, true)).toThrow(/must match/);
});

import { expect, test } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  ComparisonDraft,
  SavedComparison,
} from "./SavedComparisons";
import {
  newestComparison,
  replyReviewsToAppend,
} from "./SavedComparisons";

test("a confirmed save prevents re-appending a reply while the query is stale", () => {
  const comparisonId = "comparison" as Id<"comparisons">;
  const requestId = "request" as Id<"quotationRequests">;
  const offer = {
    id: "reply:request:message",
    supplier: "Proveedor",
    ingredient: "Arroz",
    specification: "Extra",
    packageContent: 18,
    packageUnit: "kg" as const,
    priceCents: 8500,
    currency: "PEN" as const,
    minimumPackages: null,
    freightCents: null,
    taxStatus: "unknown" as const,
    deliveryConfirmed: false,
  };
  const review = {
    requestId,
    messageId: "message",
    values: {
      supplier: "Proveedor",
      ingredient: "Arroz",
      specification: "Extra",
      packageContent: "18",
      packageUnit: "kg",
      price: "85",
      currency: "PEN",
    },
    confirmed: true as const,
  };
  const source = {
    label: "Respuesta revisada",
    date: "2026-09-09",
    original: offer,
    edited: false,
    replyReview: review,
  };
  const request = {
    ingredient: "Arroz",
    specification: "Extra",
    quantity: 10,
    unit: "kg" as const,
  };
  const draft: ComparisonDraft = {
    clientId: "client",
    id: comparisonId,
    expectedRevision: 1,
    request,
    offers: [offer],
    sources: { [offer.id]: source },
    selectedOfferId: null,
    persistable: true,
    blockedReason: null,
  };
  const stale = {
    id: comparisonId,
    request,
    offers: [],
    sources: {},
    selectedOfferId: null,
    revision: 1,
    updatedAt: 1,
  } as SavedComparison;

  expect(replyReviewsToAppend(draft, stale)).toHaveLength(1);

  const confirmed = {
    ...stale,
    offers: [offer],
    sources: draft.sources,
    revision: 2,
    updatedAt: 2,
  } as SavedComparison;
  const secondDraft = { ...draft, expectedRevision: 2 };

  expect(newestComparison(stale, confirmed)).toBe(confirmed);
  expect(
    replyReviewsToAppend(secondDraft, newestComparison(stale, confirmed)),
  ).toEqual([]);
});

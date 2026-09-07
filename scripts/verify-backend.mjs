import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Public queries only; restrict this verification to the local development backend.
const client = new ConvexHttpClient("http://127.0.0.1:3210");
const example = await client.query(api.comparison.example, {});
for (const [quantity, totals] of [
  [10, [9500, 5000]],
  [18, [9500, 9000]],
  [20, [17500, 10000]],
]) {
  const result = await client.query(api.comparison.calculate, {
    ...example,
    request: { ...example.request, quantity },
  });
  assert.deepEqual(
    result.evaluations.map((offer) => offer.totalCents),
    totals,
  );
}
const partial = await client.query(api.comparison.calculate, {
  ...example,
  offers: example.offers.map((offer, index) =>
    index === 0 ? { ...offer, packageContent: null } : offer,
  ),
});
assert.equal(partial.evaluations[0].totalCents, null);
assert.equal(partial.needsAlternative, true);
await assert.rejects(
  client.query(api.comparison.calculate, {
    ...example,
    offers: Array(5).fill(example.offers[0]),
  }),
  /TOO_MANY_OFFERS/,
);
console.log(
  "PASS: Convex local · 10/18/20 kg, missing content, server offer limit. No data written.",
);

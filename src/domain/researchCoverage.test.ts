import { expect, it } from "vitest";
import {
  researchCoverage,
  nextGapQuery,
  type CoverageSource,
} from "./researchCoverage";
const f = (value: string | null) => ({ value });
const source = (url: string, price: string | null = "20"): CoverageSource => ({
  url,
  title: "Flour",
  markdown: "Flour",
  extractionStatus: "complete",
  analysis: {
    kind: "product",
    summary: "Review delivery.",
    warnings: ["Delivery unknown"],
  },
  extraction: {
    price: f(price),
    currency: f("USD"),
    packageContent: f("25"),
    packageUnit: f("lb"),
    specification: f("All purpose flour"),
  },
});
it("counts independent domains and canonical URLs rather than duplicate price hits", () => {
  const coverage = researchCoverage([
    {
      sources: [
        source("https://one.com/p/flour"),
        source("https://one.com/p/flour?utm_campaign=test"),
        source("https://one.com/p/flour2"),
      ],
    },
  ]);
  expect(coverage.total).toBe(2);
  expect(coverage.priceDomains).toBe(1);
  expect(coverage.reviewable).toBe(false);
});
it("accumulates late discoveries and keeps a small diverse evidence shortlist", () => {
  const runs = Array.from({ length: 6 }, (_, i) => ({
    sources: [
      source(`https://supplier${i}.com/product/flour`, i === 5 ? "12" : "20"),
    ],
  }));
  const coverage = researchCoverage(runs);
  expect(coverage.total).toBe(6);
  expect(coverage.shortlist).toHaveLength(5);
  expect(coverage.sources.at(-1)?.extraction?.price.value).toBe("12");
  expect(coverage.reviewable).toBe(true);
  expect(coverage.diminishing).toBe(false);
});
it("requires two rounds with no source or interpretation gain, not one empty search", () => {
  const first = { sources: [source("https://supplier.com/flour")] };
  expect(researchCoverage([first, { sources: [] }]).diminishing).toBe(false);
  expect(
    researchCoverage([first, { sources: [] }, { sources: [] }]).diminishing,
  ).toBe(true);
  expect(
    researchCoverage([
      {
        sources: [
          { ...first.sources[0], extractionStatus: "idle", extraction: null },
        ],
      },
      first,
    ]).gains,
  ).toEqual([1, 1]);
});
it("does not consider bare-dollar prices complete and changes exhausted queries", () => {
  const s = source("https://supplier.com/flour");
  s.extraction!.currency = f(null);
  const coverage = researchCoverage([{ sources: [s] }]);
  expect(coverage.structuredDomains).toBe(0);
  const a = nextGapQuery("Flour", coverage, [])!;
  const b = nextGapQuery("Flour", coverage, [a]);
  expect(b).not.toBe(a);
});

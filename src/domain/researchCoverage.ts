export const RESEARCH_POLICY = {
  maxRounds: 6,
  retainedRuns: 18,
  analysesPerRound: 6,
  shortlistSize: 5,
  minimumPriceDomains: 3,
} as const;
/** Evidence coverage, not a commercial score or a claim of exhaustive search. */
type Field = { value: string | null };
export type CoverageSource = {
  url: string;
  title: string;
  markdown: string | null;
  extractionStatus: string;
  analysis?: { kind: string; summary: string; warnings: string[] };
  extraction: {
    price: Field;
    currency: Field;
    packageContent: Field;
    packageUnit: Field;
    specification: Field;
  } | null;
};
export function sourceKey(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()])
    if (/^(utm_|srsltid$|gclid$|fbclid$)/i.test(key))
      parsed.searchParams.delete(key);
  return parsed.href;
}
export function researchCoverage<T extends CoverageSource>(
  runs: { sources: T[] }[],
) {
  const unique = new Map<string, T>();
  const gains: number[] = [];
  for (const run of runs) {
    let gain = 0;
    for (const source of run.sources) {
      const key = sourceKey(source.url),
        previous = unique.get(key);
      if (
        !previous ||
        (source.extractionStatus === "complete" &&
          previous.extractionStatus !== "complete")
      )
        gain++;
      // Preserve a successful interpretation when a later attempt fails.
      if (
        !previous ||
        source.extractionStatus === "complete" ||
        previous.extractionStatus !== "complete"
      )
        unique.set(key, source);
    }
    gains.push(gain);
  }
  const sources = [...unique.values()];
  const products = sources.filter((s) => s.analysis?.kind === "product");
  const priced = products.filter((s) => Number(s.extraction?.price.value) > 0);
  const complete = priced.filter(
    (s) =>
      s.extraction?.currency.value &&
      Number(s.extraction.packageContent.value) > 0 &&
      s.extraction.packageUnit.value,
  );
  const host = (s: T) => new URL(s.url).hostname.replace(/^www\./, "");
  const priceDomains = new Set(priced.map(host)).size;
  const structuredDomains = new Set(complete.map(host)).size;
  const pending = sources.filter(
    (s) => s.extractionStatus === "idle" && s.markdown,
  );
  const gaps = [
    ...(priceDomains < RESEARCH_POLICY.minimumPriceDomains
      ? ["Fewer than three independent domains with published product prices."]
      : []),
    ...(structuredDomains < RESEARCH_POLICY.minimumPriceDomains
      ? [
          "Package contents, currency or price basis are still missing on several alternatives.",
        ]
      : []),
    ...(pending.length
      ? [`${pending.length} recovered pages still need interpretation.`]
      : []),
    "Delivery to the requested area and commercial equivalence require explicit review; search location is not fulfillment evidence.",
  ];
  const priority = (s: T) =>
    (s.analysis?.kind === "product"
      ? 100
      : s.analysis?.kind === "contact"
        ? 45
        : s.analysis?.kind === "catalog"
          ? 35
          : 0) +
    (s.extraction?.price.value ? 20 : 0) +
    (s.extraction?.currency.value ? 8 : 0) +
    (s.extraction?.packageContent.value && s.extraction.packageUnit.value
      ? 8
      : 0) -
    Math.min(20, (s.analysis?.warnings.length ?? 0) * 4);
  const ranked = sources
    .filter((s) => s.analysis && s.analysis.kind !== "irrelevant")
    .sort((a, b) => priority(b) - priority(a));
  const shortlist: T[] = [];
  const hosts = new Set<string>();
  for (const s of ranked)
    if (!hosts.has(host(s))) {
      shortlist.push(s);
      hosts.add(host(s));
      if (shortlist.length === RESEARCH_POLICY.shortlistSize) break;
    }
  return {
    sources,
    shortlist,
    gaps,
    gains,
    total: sources.length,
    readable: sources.filter((s) => s.markdown).length,
    analyzed: sources.filter((s) => s.extractionStatus === "complete").length,
    priced: priced.length,
    priceDomains,
    structuredDomains,
    pending: pending.length,
    // Minimum evidence for the planner to request review, never auto-approval.
    reviewable: structuredDomains >= RESEARCH_POLICY.minimumPriceDomains,
    diminishing: gains.length >= 2 && gains.slice(-2).every((g) => g === 0),
  };
}
export function normalizeResearchQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function nextGapQuery(
  ingredient: string,
  coverage: ReturnType<typeof researchCoverage>,
  prior: string[],
) {
  const themes =
    coverage.priceDomains < RESEARCH_POLICY.minimumPriceDomains
      ? [
          "wholesale product price catalog",
          "bulk pack price buy online",
          "foodservice distributor order catalog",
          "local supplier delivery price",
          "manufacturer wholesale sales",
        ]
      : [
          "pack size minimum order delivery",
          "distributor delivery area catalog",
          "wholesale package price quote",
          "foodservice supplier specifications",
        ];
  const used = new Set(prior.map(normalizeResearchQuery));
  for (const theme of themes) {
    const query = `${ingredient} ${theme}`.slice(0, 120);
    if (!used.has(normalizeResearchQuery(query))) return query;
  }
  return null;
}

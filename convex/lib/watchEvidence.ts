import type { Doc } from "../_generated/dataModel";
import type { ExtractedOffer } from "../researchValidators";
import { extractionFields } from "../../src/domain/extraction";
import { publicSourceUrl } from "./sourceQuality";
const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
export function evidenceValues(offer: ExtractedOffer) {
  return Object.fromEntries(
    extractionFields.map((key) => {
      const field = offer[key];
      return [
        key,
        field.value === null
          ? null
          : ["price", "packageContent"].includes(key)
            ? String(Number(field.value))
            : normalize(field.value),
      ];
    }),
  );
}
export function watchSources(study: Doc<"studies">) {
  return (study.webSelections ?? []).flatMap((selection) => {
    const source = selection.seed.sources[selection.sourceId];
    const market = source?.marketSource;
    const values = source?.webReview?.values;
    const url = market?.url ? publicSourceUrl(market.url) : null;
    if (!url || !market || market.simulated || !values) return [];
    const baseline = evidenceValues(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          { value: value || null, evidence: null },
        ]),
      ) as ExtractedOffer,
    );
    return [
      {
        resultId: selection.sourceId,
        title: market.title,
        url,
        baseline: JSON.stringify(baseline),
      },
    ];
  });
}
export function compareObservation(
  baseline: string,
  previous: string,
  offer: ExtractedOffer,
  kind: string,
) {
  const current = evidenceValues(offer),
    original = JSON.parse(baseline) as Record<string, string | null>;
  if (
    kind !== "product" ||
    ["supplier", "ingredient", "specification", "currency"].some(
      (k) => !current[k] || current[k] !== original[k],
    ) ||
    ["price", "packageContent", "packageUnit"].some((k) => !current[k]) ||
    !Number.isFinite(Number(current.price)) ||
    Number(current.price) <= 0 ||
    !Number.isFinite(Number(current.packageContent)) ||
    Number(current.packageContent) <= 0
  )
    return { outcome: "unverified" as const, observation: previous };
  const observation = JSON.stringify(current);
  return {
    outcome:
      observation === previous ? ("unchanged" as const) : ("changed" as const),
    observation,
  };
}

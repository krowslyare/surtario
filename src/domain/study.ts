import type { Infer } from "convex/values";
import type { webSelectionValidator } from "../../convex/studyValidators";
import type { savedProspect } from "../../convex/prospectValidators";

export type WebSelection = Infer<typeof webSelectionValidator>;
export type StudyProspect = Infer<typeof savedProspect>;
export const MAX_STUDY_OPTIONS = 12;
export const MAX_COMPARISON_OFFERS = 6;
export function studyOptionCount(study: {
  selectedIds: string[];
  webSelections?: WebSelection[];
  prospects?: StudyProspect[];
}) {
  return (
    study.selectedIds.length +
    (study.webSelections?.length ?? 0) +
    (study.prospects?.length ?? 0)
  );
}

export function sameStudyContext(
  a: { ingredient?: string; region?: string },
  b: { ingredient?: string; region?: string },
) {
  if (!a.ingredient || !b.ingredient || !a.region || !b.region) return false;
  const normalize = (text: string) =>
    text.trim().toLocaleLowerCase("es-PE").replace(/\s+/g, " ");
  return (
    normalize(a.ingredient) === normalize(b.ingredient) &&
    normalize(a.region) === normalize(b.region)
  );
}

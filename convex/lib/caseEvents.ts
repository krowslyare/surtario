import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function appendCaseEvent(
  ctx: MutationCtx,
  input: {
    studyId?: Id<"studies">;
    prospectId?: Id<"webProspects">;
    comparisonId?: Id<"comparisons">;
    kind: string;
    summary: string;
    eventKey: string;
    sourceId?: string;
    at?: number;
  },
) {
  let row = input.studyId
    ? await ctx.db
        .query("sourcingCases")
        .withIndex("by_studyId", (q) => q.eq("studyId", input.studyId))
        .first()
    : input.comparisonId
      ? await ctx.db
          .query("sourcingCases")
          .withIndex("by_comparisonId", (q) =>
            q.eq("comparisonId", input.comparisonId),
          )
          .first()
      : null;
  if (!row && input.comparisonId)
    row = await ctx.db
      .query("sourcingCases")
      .withIndex("by_comparisonId", (q) =>
        q.eq("comparisonId", input.comparisonId),
      )
      .first();
  if (!row && input.prospectId) {
    const prospect = await ctx.db.get(input.prospectId);
    if (!prospect) return;
    const candidates = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", prospect.ownerHash))
      .take(10);
    for (const candidate of candidates) {
      const study = candidate.studyId
        ? await ctx.db.get(candidate.studyId)
        : null;
      if (
        candidate.researchRunIds.includes(prospect.runId) ||
        study?.prospects?.some((item) => item.id === prospect._id)
      ) {
        const existing = await ctx.db
          .query("sourcingEvents")
          .withIndex("by_caseId_and_eventKey", (q) =>
            q.eq("caseId", candidate._id).eq("eventKey", input.eventKey),
          )
          .unique();
        if (!existing)
          await ctx.db.insert("sourcingEvents", {
            caseId: candidate._id,
            eventKey: input.eventKey,
            kind: input.kind,
            summary: input.summary.slice(0, 1500),
            createdAt: input.at ?? Date.now(),
            ...(input.sourceId ? { sourceId: input.sourceId } : {}),
          });
      }
    }
    return;
  }
  if (!row) return;
  const existing = await ctx.db
    .query("sourcingEvents")
    .withIndex("by_caseId_and_eventKey", (q) =>
      q.eq("caseId", row._id).eq("eventKey", input.eventKey),
    )
    .unique();
  if (!existing)
    await ctx.db.insert("sourcingEvents", {
      caseId: row._id,
      eventKey: input.eventKey,
      kind: input.kind,
      summary: input.summary.slice(0, 1500),
      createdAt: input.at ?? Date.now(),
      ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    });
}

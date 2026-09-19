import { ConvexError, v, type Infer } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { savedStudyValidator } from "./studyValidators";
import { webReviewInputValidator } from "./comparisonValidators";
import { appendCaseEvent } from "./lib/caseEvents";
import { savedQuotationValidator } from "./quotationValidators";

// One transaction: preserve reviewed evidence, attach its case and prepare a
// draft. No research action, message delivery or purchase is executed here.
export const prepare = mutation({
  args: {
    token: v.string(), clientId: v.string(),
    study: v.object({
      clientId: v.string(), id: v.union(v.id("studies"), v.null()), expectedRevision: v.number(),
      term: v.string(), region: v.string(), selectedIds: v.array(v.string()),
      webReviews: v.array(webReviewInputValidator), prospectIds: v.array(v.id("webProspects")),
    }),
    target: v.union(v.object({ resultId: v.string() }), v.object({ prospectId: v.id("webProspects") })),
    intent: v.union(v.literal("inquiry"), v.literal("research")),
  },
  returns: v.object({ study: savedStudyValidator, caseId: v.id("sourcingCases"), requestId: v.union(v.id("quotationRequests"), v.null()) }),
  handler: async (ctx, args): Promise<{ study: Infer<typeof savedStudyValidator>; caseId: Id<"sourcingCases">; requestId: Id<"quotationRequests"> | null }> => {
    const study: Infer<typeof savedStudyValidator> = await ctx.runMutation(api.studies.save, { token: args.token, ...args.study });
    const resultId = "resultId" in args.target ? args.target.resultId : undefined;
    const result = study.results.find(r => r.id === resultId && study.selectedIds.includes(r.id));
    const prospectId = "prospectId" in args.target ? args.target.prospectId : undefined;
    const prospect = study.prospects?.find(p => p.id === prospectId);
    if (!prospect && result?.kind !== "distributor") throw new ConvexError("Select a reviewed distributor before continuing.");
    if (args.intent === "research" && (!prospect || prospect.simulated !== false)) throw new ConvexError("Research requires a real reviewed web source. Use the sample inquiry for fictional suppliers.");
    const supplier = prospect?.supplier ?? result!.supplier;
    const caseId: Id<"sourcingCases"> = await ctx.runMutation(api.sourcing.create, {
      token: args.token, studyId: study.id,
      objective: (args.intent === "research"
        ? `Find public product specifications, package options and published prices for ${supplier}. Keep unpublished commercial terms pending.`
        : `Confirm package prices, minimum order and delivery for ${supplier}.`).slice(0, 500),
    });
    if (args.intent === "research") return { study, caseId, requestId: null };
    const target = prospectId ? { prospectId } : { studyId: study.id, resultId: result!.id };
    const requests: Infer<typeof savedQuotationValidator>[] = await ctx.runQuery(api.quotationMail.list, { token: args.token });
    const existing = requests.find(r => prospectId ? r.prospectId === prospectId : r.studyId === study.id && r.resultId === result!.id);
    const request: Infer<typeof savedQuotationValidator> = existing ?? await ctx.runMutation(api.quotationMail.create, { token: args.token, clientId: args.clientId, ...target });
    await appendCaseEvent(ctx, { studyId: study.id, kind: "mail_draft", sourceId: request.id,
      eventKey: `mail:${request.id}:draft`, summary: "Saved inquiry linked to this work. Review its current state before sending." });
    return { study, caseId, requestId: request.id };
  },
});

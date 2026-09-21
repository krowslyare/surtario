import { ConvexError, v, type Infer } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ownerHash } from "./lib/demoSession";
import { quickSearches } from "./research";
import { watchingEnabled } from "./sourcing";
import { evidenceValues, watchSources } from "./lib/watchEvidence";
import { comparisonBlockers } from "../src/domain/comparisonBlockers";
import { replyKey } from "../src/domain/workStatus";

const mail = v.object({
  id: v.id("quotationRequests"), state: v.string(), updatedAt: v.number(),
  replies: v.array(v.object({ messageId: v.string(), receivedAt: v.string() })),
});
const work = v.object({
  id: v.string(), kind: v.union(v.literal("case"), v.literal("study"), v.literal("comparison"), v.literal("search"), v.literal("inquiry")),
  objective: v.optional(v.string()), batchId: v.optional(v.id("ingredientBatches")),
  ingredient: v.string(), region: v.string(), suppliers: v.array(v.string()), updatedAt: v.number(),
  caseId: v.optional(v.id("sourcingCases")), studyId: v.optional(v.id("studies")), comparisonId: v.optional(v.id("comparisons")),
  runIds: v.array(v.id("researchRuns")), status: v.string(), steps: v.number(),
  blocker: v.union(v.string(), v.null()), requests: v.array(mail),
  reviewedReplyIds: v.array(v.string()), reviewedSourceIds: v.array(v.string()),
  activeWatches: v.number(),
  baselineSources: v.array(v.object({ url: v.string(), baseline: v.string() })),
});
const outcome = v.object({
  id: v.id("deliveryConfirmations"), comparisonId: v.id("comparisons"), ingredient: v.string(), supplier: v.string(),
  createdAt: v.number(), revision: v.number(), stale: v.boolean(), term: v.string(),
  currency: v.union(v.string(), v.null()), value: v.union(v.number(), v.null()), beforeTotal: v.union(v.number(), v.null()), afterTotal: v.union(v.number(), v.null()),
  beforeMinimum: v.union(v.number(), v.null()), recommendationChanged: v.boolean(), affordableBefore: v.union(v.boolean(), v.null()), affordableAfter: v.union(v.boolean(), v.null()),
});
const runSummary = v.object({
  id: v.id("researchRuns"), ingredient: v.string(), region: v.string(), status: v.string(),
  createdAt: v.number(), evidenceKey: v.string(), reviewed: v.boolean(), simulated: v.boolean(),
  stage: v.string(), retained: v.number(), interpreted: v.number(),
  sources: v.array(v.object({ id: v.string(), url: v.string(), title: v.string(), supplier: v.union(v.string(), v.null()), reviewable: v.boolean(), values: v.union(v.string(), v.null()) })),
  studyId: v.optional(v.id("studies")),
});

async function evidenceKey(run: Doc<"researchRuns">) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(
    run.sources.map(source => [source.url, source.markdown, source.analysis, source.extraction, source.extractionStatus]),
  )));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}
async function summarize(run: Doc<"researchRuns">): Promise<Infer<typeof runSummary>> {
  const key = await evidenceKey(run);
  return {
    id: run._id, ingredient: run.ingredient, region: run.region, status: run.status, createdAt: run.createdAt,
    evidenceKey: key, reviewed: run.reviewedEvidenceKey === key, simulated: run.simulated ?? false,
    stage: run.progress?.stage ?? (run.status === "running" ? "searching" : run.status),
    retained: run.sources.length, interpreted: run.sources.filter(source => source.extractionStatus === "complete").length,
    sources: run.sources.map((source, index) => ({ id: `${run._id}:${index}`, url: source.url, title: source.title,
      supplier: source.extraction?.supplier.value ?? null, values: source.extraction ? JSON.stringify(evidenceValues(source.extraction)) : null, reviewable: Boolean(source.markdown) && source.analysis?.kind !== "irrelevant" })),
    ...(run.studyId ? { studyId: run.studyId } : {}),
  };
}

/** Detail subscriptions are separate: one bounded run per query, never all page bodies in one dashboard read. */
export const research = query({
  args: { token: v.string(), runId: v.id("researchRuns") }, returns: runSummary,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash) throw new ConvexError("Research unavailable.");
    return summarize(run);
  },
});

export const reviewResearch = mutation({
  args: { token: v.string(), runId: v.id("researchRuns"), evidenceKey: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash) throw new ConvexError("Research unavailable.");
    if (run.status === "running" || run.sources.some(source => source.extractionStatus === "running"))
      throw new ConvexError("Wait for the current research to finish before marking it reviewed.");
    if (await evidenceKey(run) !== args.evidenceKey) throw new ConvexError("The findings changed. Review the latest evidence first.");
    await ctx.db.patch(run._id, { reviewedEvidenceKey: args.evidenceKey });
    return null;
  },
});

export const list = query({
  args: { token: v.string() },
  returns: v.object({ items: v.array(work), quickRuns: v.array(runSummary), outcomes: v.array(outcome), limited: v.boolean() }),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    // The write paths enforce ten of each per capability. The extra row detects legacy overflow.
    const [caseRows, studyRows, comparisonRows, requestRows, quickRuns] = await Promise.all([
      ctx.db.query("sourcingCases").withIndex("by_ownerHash", q => q.eq("ownerHash", hash)).order("desc").take(11),
      ctx.db.query("studies").withIndex("by_ownerHash", q => q.eq("ownerHash", hash)).order("desc").take(11),
      ctx.db.query("comparisons").withIndex("by_ownerHash", q => q.eq("ownerHash", hash)).order("desc").take(11),
      ctx.db.query("quotationRequests").withIndex("by_ownerHash", q => q.eq("ownerHash", hash)).order("desc").take(11),
      quickSearches(ctx, hash),
    ]);
    const limited = [caseRows, studyRows, comparisonRows, requestRows].some(rows => rows.length > 10);
    const cases = caseRows.slice(0, 10), studies = studyRows.slice(0, 10), comparisons = comparisonRows.slice(0, 10), requests = requestRows.slice(0, 10);
    const confirmations = (await Promise.all(comparisons.map(comparison => ctx.db.query("deliveryConfirmations")
      .withIndex("by_comparisonId", q => q.eq("comparisonId", comparison._id)).order("desc").take(601)))).flat();
    const messages = await Promise.all(requests.map(async request => ({
      id: request._id, state: request.state, updatedAt: request.updatedAt,
      replies: (await ctx.db.query("quotationReplies").withIndex("by_requestId", q => q.eq("requestId", request._id)).take(10))
        .map(reply => ({ messageId: reply.messageId, receivedAt: reply.receivedAt })),
    })));
    const savedSources = [
      ...comparisons.flatMap(comparison => Object.values(comparison.sources)),
      ...studies.flatMap(study => (study.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources))),
    ];
    const reviewedReplyIds = [...new Set([
      ...savedSources.flatMap(source => source.replyReview ? [replyKey(source.replyReview.requestId, source.replyReview.messageId)] : []),
      ...confirmations.map(item => replyKey(item.requestId, item.messageId)),
    ])];
    const reviewedSourceIds = [...new Set([
      ...savedSources.flatMap(source => source.webReview ? [`${source.webReview.runId}:${source.webReview.sourceIndex}`] : []),
      ...studies.flatMap(study => (study.prospects ?? []).map(prospect => `${prospect.runId}:${prospect.sourceIndex}`)),
    ])];
    function sourceRuns(study?: Doc<"studies">, comparison?: Doc<"comparisons">) {
      return [...new Set([
        ...(study?.prospects ?? []).map(prospect => prospect.runId),
        ...[...Object.values(comparison?.sources ?? {}), ...(study?.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources))]
          .flatMap(source => source.webReview ? [source.webReview.runId] : []),
        ...quickRuns.filter(run => run.studyId === study?._id && study).map(run => run._id),
      ])];
    }
    const items: Infer<typeof work>[] = [];
    const assignedMail = new Set<string>();
    function add(kind: Infer<typeof work>["kind"], id: string, study?: Doc<"studies">, comparison?: Doc<"comparisons">, sourcingCase?: Doc<"sourcingCases">) {
      const related = requests.filter(request => (study && (request.studyId === study._id || study.prospects?.some(p => p.id === request.prospectId))) ||
        (comparison && (request.comparisonId === comparison._id || Object.values(comparison.sources).some(source => source.replyReview?.requestId === request._id))));
      related.forEach(request => assignedMail.add(request._id));
      const mailRows = messages.filter(message => related.some(request => request._id === message.id));
      items.push({ id, kind, ingredient: sourcingCase?.ingredient ?? study?.term ?? comparison!.request.ingredient,
        region: sourcingCase?.region ?? study?.region ?? "Saved comparison", suppliers: [...new Set([
          ...(comparison?.offers ?? []).map(offer => offer.supplier), ...(study?.results ?? []).map(result => result.supplier),
          ...(study?.prospects ?? []).map(prospect => prospect.supplier), ...(study?.webSelections ?? []).flatMap(s => s.seed.offers.map(o => o.supplier)),
        ])],
        ...(sourcingCase ? { caseId: sourcingCase._id, objective: sourcingCase.objective, ...(sourcingCase.batchId ? { batchId: sourcingCase.batchId } : {}) } : {}), ...(study ? { studyId: study._id } : {}), ...(comparison ? { comparisonId: comparison._id } : {}),
        status: sourcingCase?.status ?? "idle", steps: sourcingCase?.steps ?? 0,
        updatedAt: Math.max(sourcingCase?.updatedAt ?? 0, study?.updatedAt ?? 0, comparison?.updatedAt ?? 0, ...mailRows.flatMap(row => [row.updatedAt, ...row.replies.map(reply => Date.parse(reply.receivedAt)).filter(Number.isFinite)])),
        runIds: [...new Set([...(sourcingCase?.researchRunIds ?? []), ...sourceRuns(study, comparison)])].flatMap(id => { const valid = ctx.db.normalizeId("researchRuns", id); return valid ? [valid] : []; }),
        blocker: comparison ? comparisonBlockers(comparison)[0]?.message ?? null : null, requests: mailRows,
        reviewedReplyIds, reviewedSourceIds, activeWatches: 0, baselineSources: study ? watchSources(study).map(({url, baseline}) => ({url, baseline})) : [],
      });
    }
    for (const row of cases) {
      add("case", row._id, studies.find(study => study._id === row.studyId), comparisons.find(comparison => comparison._id === row.comparisonId), row);
      const watches = await ctx.db.query("sourceWatches").withIndex("by_caseId", q => q.eq("caseId", row._id)).take(10);
      items[items.length - 1].activeWatches = watches.filter(watch => watchingEnabled() && (watch.status === "active" || watch.status === "checking")).length;
    }
    studies.filter(study => !cases.some(row => row.studyId === study._id)).forEach(study => add("study", study._id, study));
    comparisons.filter(comparison => !cases.some(row => row.comparisonId === comparison._id)).forEach(comparison => add("comparison", comparison._id, undefined, comparison));
    const linkedRuns = new Set(items.flatMap(item => item.runIds));
    for (const run of quickRuns.filter(run => !linkedRuns.has(run._id))) items.push({
      id: run._id, kind: "search", ingredient: run.ingredient, region: run.region, suppliers: [], updatedAt: run.createdAt,
      runIds: [run._id], status: run.status, steps: 0, blocker: null, requests: [], reviewedReplyIds, reviewedSourceIds, activeWatches: 0, baselineSources: [],
    });
    for (const request of requests.filter(request => !assignedMail.has(request._id))) {
      const prospect = request.prospectId ? await ctx.db.get(request.prospectId) : null;
      // A saved prospect can point directly to a case run before it is selected in a study.
      const linked = prospect?.ownerHash === hash ? items.find(item => item.runIds.includes(prospect.runId)) : undefined;
      const message = messages.find(message => message.id === request._id)!;
      if (linked) { linked.requests.push(message); linked.updatedAt = Math.max(linked.updatedAt, request.updatedAt); continue; }
      items.push({ id: request._id, kind: "inquiry", ingredient: prospect?.ownerHash === hash ? prospect.ingredient : "Supplier inquiry",
        region: prospect?.ownerHash === hash ? prospect.region : "Saved conversation", suppliers: prospect?.ownerHash === hash ? [prospect.supplier] : [],
        updatedAt: request.updatedAt, runIds: [], status: "idle", steps: 0, blocker: null, requests: [message], reviewedReplyIds, reviewedSourceIds, activeWatches: 0, baselineSources: [] });
    }
    const outcomes = confirmations.sort((a, b) => b.createdAt - a.createdAt || a._id.localeCompare(b._id)).slice(0, 3).map(confirmation => {
      const comparison = comparisons.find(row => row._id === confirmation.comparisonId)!;
      const before = confirmation.before.alternatives.find(offer => offer.offerId === confirmation.offerId);
      const after = confirmation.after.alternatives.find(offer => offer.offerId === confirmation.offerId);
      return { id: confirmation._id, comparisonId: confirmation.comparisonId, ingredient: confirmation.ingredient ?? (comparison.revision === confirmation.comparisonRevision ? comparison.request.ingredient : "Saved comparison"),
        supplier: after?.supplier ?? before?.supplier ?? "Supplier", createdAt: confirmation.createdAt, revision: confirmation.comparisonRevision,
        stale: comparison.revision !== confirmation.comparisonRevision, term: confirmation.minimumPackages === undefined ? "Delivery confirmed" : "Minimum confirmed",
        currency: confirmation.currency ?? (comparison.revision === confirmation.comparisonRevision ? comparison.offers.find(offer => offer.id === confirmation.offerId)?.currency ?? null : null),
        value: confirmation.minimumPackages ?? confirmation.freightCents,
        beforeTotal: before?.totalCents ?? null, afterTotal: after?.totalCents ?? null, beforeMinimum: confirmation.previousMinimumPackages ?? null,
        recommendationChanged: confirmation.before.recommendedOfferId !== confirmation.after.recommendedOfferId || confirmation.before.action !== confirmation.after.action,
        affordableBefore: before?.affordable ?? null, affordableAfter: after?.affordable ?? null };
    });
    return { items, quickRuns: await Promise.all(quickRuns.map(summarize)), outcomes, limited };
  },
});

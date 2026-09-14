import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  env,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  start as startWorkflow,
  cancel as cancelWorkflow,
  type WorkflowId,
} from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import {
  caseView,
  eventView,
  watchView,
  candidate,
} from "./sourcingValidators";
import { savedResearchValidator } from "./researchValidators";
import { publicRun } from "./research";
import { providerRehearsalEnabled } from "./lib/providerTransport";
import { watchSources } from "./lib/watchEvidence";
import { createWatch, stopSourceWatch } from "./sourcingWatch";
export const MAX_STEPS = 3;
export function sourcingEnabled() {
  return (
    env.SOURCING_ENABLED === "true" &&
    env.LIVE_RESEARCH_ENABLED === "true" &&
    !!env.FIRECRAWL_API_KEY?.trim() &&
    !!env.OPENAI_API_KEY?.trim() &&
    !!env.OPENAI_EXTRACTION_MODEL?.trim()
  );
}
export function watchingEnabled() {
  return sourcingEnabled() && env.SOURCE_WATCH_ENABLED === "true";
}
export function view(row: Doc<"sourcingCases">) {
  const {
    _id,
    _creationTime,
    ownerHash: _owner,
    workflowId: _workflow,
    runs: _runs,
    ...rest
  } = row;
  return { id: _id, ...rest };
}
export async function owned(
  ctx: QueryCtx | MutationCtx,
  token: string,
  id: Id<"sourcingCases">,
) {
  const hash = await ownerHash(token);
  const row = await ctx.db.get(id);
  if (!row || row.ownerHash !== hash)
    throw new ConvexError("This sourcing case is unavailable.");
  return row;
}
export async function event(
  ctx: MutationCtx,
  caseId: Id<"sourcingCases">,
  key: string,
  kind: string,
  summary: string,
) {
  const exists = await ctx.db
    .query("sourcingEvents")
    .withIndex("by_caseId_and_eventKey", (q) =>
      q.eq("caseId", caseId).eq("eventKey", key),
    )
    .unique();
  if (!exists)
    await ctx.db.insert("sourcingEvents", {
      caseId,
      eventKey: key,
      kind,
      summary: summary.slice(0, 1500),
      createdAt: Date.now(),
    });
}
export const status = query({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    watchEnabled: v.boolean(),
    maxSteps: v.number(),
    watchIntervalHours: v.number(),
    watchDurationDays: v.number(),
  }),
  handler: async () => ({
    enabled: sourcingEnabled(),
    watchEnabled: watchingEnabled(),
    maxSteps: MAX_STEPS,
    watchIntervalHours: 24,
    watchDurationDays: 7,
  }),
});
export const list = query({
  args: { token: v.string() },
  returns: v.array(caseView),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    return (
      await ctx.db
        .query("sourcingCases")
        .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
        .order("desc")
        .take(10)
    ).map(view);
  },
});
export const get = query({
  args: { token: v.string(), caseId: v.id("sourcingCases") },
  returns: v.object({
    case: caseView,
    events: v.array(eventView),
    watches: v.array(watchView),
    watchableSources: v.array(
      v.object({ resultId: v.string(), title: v.string(), url: v.string() }),
    ),
  }),
  handler: async (ctx, args) => {
    const row = await owned(ctx, args.token, args.caseId);
    const events = await ctx.db
      .query("sourcingEvents")
      .withIndex("by_caseId", (q) => q.eq("caseId", row._id))
      .order("desc")
      .take(100);
    const watches = await ctx.db
      .query("sourceWatches")
      .withIndex("by_caseId", (q) => q.eq("caseId", row._id))
      .take(10);
    const study = row.studyId ? await ctx.db.get(row.studyId) : null;
    return {
      case: view(row),
      events: events.map(({ _id, _creationTime, ...rest }) => ({
        id: _id,
        ...rest,
      })),
      watches: watches.map(({ _id, _creationTime, ...rest }) => ({
        id: _id,
        ...rest,
      })),
      watchableSources: study
        ? watchSources(study).map(({ resultId, title, url }) => ({
            resultId,
            title,
            url,
          }))
        : [],
    };
  },
});
export const research = query({
  args: { token: v.string(), caseId: v.id("sourcingCases") },
  returns: v.array(savedResearchValidator),
  handler: async (ctx, args) => {
    const row = await owned(ctx, args.token, args.caseId);
    const runs = await Promise.all(
      row.researchRunIds.map((id) => ctx.db.get(id)),
    );
    return runs
      .filter(
        (r): r is Doc<"researchRuns"> => !!r && r.ownerHash === row.ownerHash,
      )
      .map(publicRun);
  },
});
export const create = mutation({
  args: {
    token: v.string(),
    studyId: v.optional(v.id("studies")),
    ingredient: v.optional(v.string()),
    region: v.optional(v.string()),
    objective: v.string(),
  },
  returns: v.id("sourcingCases"),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const study = args.studyId ? await ctx.db.get(args.studyId) : null;
    if (args.studyId && (!study || study.ownerHash !== hash))
      throw new ConvexError("Study unavailable.");
    if (study) {
      const existing = await ctx.db
        .query("sourcingCases")
        .withIndex("by_studyId", (q) => q.eq("studyId", study._id))
        .unique();
      if (existing) return existing._id;
    }
    const ingredient = (study?.term ?? args.ingredient ?? "").trim(),
      region = (study?.region ?? args.region ?? "").trim(),
      objective = args.objective.trim();
    if (
      !ingredient ||
      ingredient.length > 120 ||
      !region ||
      region.length > 80 ||
      !objective ||
      objective.length > 500
    )
      throw new ConvexError(
        "Enter an ingredient, location and objective within their limits.",
      );
    const own = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    const duplicate = own.find(
      (item) =>
        item.ingredient === ingredient &&
        item.region === region &&
        item.objective === objective &&
        item.studyId === study?._id,
    );
    if (duplicate) return duplicate._id;
    if (own.length >= 10)
      throw new ConvexError(
        "This demo supports ten sourcing cases per session.",
      );
    const total = await ctx.db
      .query("sourcingCases")
      .withIndex("by_creation_time")
      .take(500);
    if (total.length >= 500)
      throw new ConvexError("Demo case capacity reached.");
    const now = Date.now();
    const id = await ctx.db.insert("sourcingCases", {
      ownerHash: hash,
      ...(study ? { studyId: study._id } : {}),
      ingredient,
      region,
      objective,
      status: "idle",
      revision: 1,
      steps: 0,
      runs: 0,
      researchRunIds: [],
      summary: "Ready to investigate. No email is sent by research.",
      createdAt: now,
      updatedAt: now,
    });
    await event(
      ctx,
      id,
      "created",
      "created",
      "Sourcing case created. " + objective,
    );
    return id;
  },
});
export const attachStudy = mutation({
  args: {
    token: v.string(),
    caseId: v.id("sourcingCases"),
    studyId: v.id("studies"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await owned(ctx, args.token, args.caseId);
    const study = await ctx.db.get(args.studyId);
    if (
      !study ||
      study.ownerHash !== row.ownerHash ||
      study.term.toLowerCase() !== row.ingredient.toLowerCase() ||
      study.region.toLowerCase() !== row.region.toLowerCase()
    )
      throw new ConvexError(
        "Choose a study with the same ingredient and location.",
      );
    const existing = await ctx.db
      .query("sourcingCases")
      .withIndex("by_studyId", (q) => q.eq("studyId", study._id))
      .unique();
    if (existing && existing._id !== row._id)
      throw new ConvexError("This study already belongs to a case.");
    if (row.studyId && row.studyId !== study._id)
      throw new ConvexError("This case already has a study.");
    await ctx.db.patch(row._id, { studyId: study._id, updatedAt: Date.now() });
    await event(
      ctx,
      row._id,
      `study:${study._id}`,
      "study_attached",
      "Reviewed market study linked to this case.",
    );
    return null;
  },
});
export const start = mutation({
  args: { token: v.string(), caseId: v.id("sourcingCases") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await owned(ctx, args.token, args.caseId);
    if (row.status === "running") return null;
    if (!sourcingEnabled())
      throw new ConvexError("Case research is not enabled by the server.");
    if (row.runs >= 3)
      throw new ConvexError(
        "This demo case has reached its three research runs.",
      );
    const revision = row.revision + 1;
    await ctx.db.patch(row._id, {
      status: "running",
      revision,
      steps: 0,
      runs: row.runs + 1,
      summary: "Planning evidence-based research.",
      updatedAt: Date.now(),
    });
    await event(
      ctx,
      row._id,
      `start:${revision}`,
      "started",
      "Research started: at most three steps, with no automatic retries or emails.",
    );
    const workflowId = await startWorkflow(
      ctx,
      internal.sourcingWorkflow.run,
      { caseId: row._id, revision },
      {
        startAsync: true,
        onComplete: internal.sourcingWorkflow.completed,
        context: { caseId: row._id, revision },
      },
    );
    await ctx.db.patch(row._id, { workflowId });
    return null;
  },
});
export const cancel = mutation({
  args: { token: v.string(), caseId: v.id("sourcingCases") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await owned(ctx, args.token, args.caseId);
    if (row.status !== "running") return null;
    await ctx.db.patch(row._id, {
      status: "canceled",
      revision: row.revision + 1,
      summary: "Research canceled. Any late result will not update this case.",
      updatedAt: Date.now(),
    });
    if (row.workflowId)
      await cancelWorkflow(
        ctx,
        components.workflow,
        row.workflowId as WorkflowId,
      );
    await event(
      ctx,
      row._id,
      `cancel:${row.revision}`,
      "canceled",
      "Research canceled; already issued provider calls may still incur cost.",
    );
    return null;
  },
});
export const snapshot = internalQuery({
  args: { caseId: v.id("sourcingCases"), revision: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      case: caseView,
      history: v.array(eventView),
      runs: v.array(savedResearchValidator),
      context: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.caseId);
    if (!row || row.revision !== args.revision || row.status !== "running")
      return null;
    const history = await ctx.db
      .query("sourcingEvents")
      .withIndex("by_caseId", (q) => q.eq("caseId", row._id))
      .order("desc")
      .take(40);
    const runs = await Promise.all(
      row.researchRunIds.map((id) => ctx.db.get(id)),
    );
    const study = row.studyId ? await ctx.db.get(row.studyId) : null;
    const comparison = row.comparisonId
      ? await ctx.db.get(row.comparisonId)
      : null;
    const latestAdvice = comparison
      ? (
          await ctx.db
            .query("advisorRuns")
            .withIndex("by_comparisonId", (q) =>
              q.eq("comparisonId", comparison._id),
            )
            .order("desc")
            .take(1)
        )[0]
      : null;
    const context = JSON.stringify({
      selectedSources: study
        ? [
            ...study.results.filter((r) => study.selectedIds.includes(r.id)),
            ...(study.webSelections ?? []).map((s) => ({
              source: s.seed.sources[s.sourceId],
              offer: s.seed.offers[0],
            })),
            ...(study.prospects ?? []),
          ]
        : [],
      purchase: comparison
        ? {
            request: comparison.request,
            offers: comparison.offers,
            revision: comparison.revision,
          }
        : null,
      decision:
        latestAdvice?.comparisonRevision === comparison?.revision
          ? latestAdvice?.report
          : null,
    }).slice(0, 18000);
    return {
      case: view(row),
      context,
      history: history.map(({ _id, _creationTime, ...rest }) => ({
        id: _id,
        ...rest,
      })),
      runs: runs.filter((r): r is Doc<"researchRuns"> => !!r).map(publicRun),
    };
  },
});
export const recordStep = internalMutation({
  args: {
    caseId: v.id("sourcingCases"),
    revision: v.number(),
    step: v.number(),
    reason: v.string(),
    query: v.string(),
    sources: v.array(candidate),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.caseId);
    if (
      !row ||
      row.revision !== args.revision ||
      row.status !== "running" ||
      args.step !== row.steps ||
      args.step >= MAX_STEPS
    )
      return false;
    if (args.sources.length > 3)
      throw new ConvexError("Source limit exceeded.");
    const now = Date.now();
    const runId = await ctx.db.insert("researchRuns", {
      ownerHash: row.ownerHash,
      clientId: `case:${row._id}:${args.revision}:${args.step}`,
      simulated: providerRehearsalEnabled(),
      ingredient: row.ingredient,
      region: row.region,
      observedAt: new Date(now).toISOString().slice(0, 10),
      createdAt: now,
      status: "complete",
      error: null,
      sources: args.sources,
      discarded: 0,
      warning: false,
    });
    await ctx.db.patch(row._id, {
      steps: row.steps + 1,
      researchRunIds: [...row.researchRunIds, runId].slice(-9),
      summary: args.reason.slice(0, 1500),
      updatedAt: now,
    });
    await ctx.db.insert("sourcingEvents", {
      caseId: row._id,
      eventKey: `step:${args.revision}:${args.step}`,
      kind: "research",
      query: args.query,
      summary:
        `${args.reason} (${args.sources.length} source(s); query: ${args.query})`.slice(
          0,
          1500,
        ),
      researchRunId: runId,
      createdAt: now,
    });
    return true;
  },
});
export const finish = internalMutation({
  args: {
    caseId: v.id("sourcingCases"),
    revision: v.number(),
    summary: v.string(),
    failed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.caseId);
    if (!row || row.revision !== args.revision || row.status !== "running")
      return null;
    await ctx.db.patch(row._id, {
      status: args.failed ? "failed" : "complete",
      summary: args.summary.slice(0, 1500),
      updatedAt: Date.now(),
    });
    await event(
      ctx,
      row._id,
      `finish:${args.revision}`,
      args.failed ? "failed" : "completed",
      args.summary,
    );
    return null;
  },
});

export const watch = mutation({
  args: {
    token: v.string(),
    caseId: v.id("sourcingCases"),
    resultId: v.string(),
  },
  returns: v.id("sourceWatches"),
  handler: createWatch,
});
export const stopWatch = mutation({
  args: { token: v.string(), watchId: v.id("sourceWatches") },
  returns: v.null(),
  handler: stopSourceWatch,
});

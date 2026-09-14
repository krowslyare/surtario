import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
  env,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { owned, event, watchingEnabled } from "./sourcing";
import { watchSources, compareObservation } from "./lib/watchEvidence";
import { readProductPage } from "./lib/firecrawl";
import {
  providerFetch,
  providerRehearsalEnabled,
} from "./lib/providerTransport";
import { analyzeWebSourceWithAgent } from "./lib/agentExtraction";
import { candidate } from "./sourcingValidators";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
const DAY = 86400000;
export async function createWatch(
  ctx: MutationCtx,
  args: { token: string; caseId: Id<"sourcingCases">; resultId: string },
) {
  const row = await owned(ctx, args.token, args.caseId);
  if (!watchingEnabled())
    throw new ConvexError("Source watching is not enabled by the server.");
  const study = row.studyId ? await ctx.db.get(row.studyId) : null;
  const source = study
    ? watchSources(study).find((s) => s.resultId === args.resultId)
    : null;
  if (!source)
    throw new ConvexError(
      "Select a reviewed real product source from this study.",
    );
  const existing = await ctx.db
    .query("sourceWatches")
    .withIndex("by_caseId_and_resultId", (q) =>
      q.eq("caseId", row._id).eq("resultId", args.resultId),
    )
    .unique();
  if (existing) return existing._id;
  const watches = await ctx.db
    .query("sourceWatches")
    .withIndex("by_caseId", (q) => q.eq("caseId", row._id))
    .take(3);
  if (watches.length >= 3)
    throw new ConvexError(
      "This demo supports three selected sources per case.",
    );
  const now = Date.now();
  const id = await ctx.db.insert("sourceWatches", {
    caseId: row._id,
    ...source,
    status: "active",
    nextCheckAt: now + DAY,
    expiresAt: now + 7 * DAY,
    checks: 0,
    revision: 1,
    lastOutcome: "pending",
    lastObservation: source.baseline,
    createdAt: now,
    updatedAt: now,
  });
  await event(
    ctx,
    row._id,
    `watch:${id}`,
    "watch_started",
    "Watching selected source every 24 hours for seven days. Changes remain proposals for review.",
  );
  return id;
}
export async function stopSourceWatch(
  ctx: MutationCtx,
  args: { token: string; watchId: Id<"sourceWatches"> },
) {
  const watch = await ctx.db.get(args.watchId);
  if (!watch) throw new ConvexError("Watch unavailable.");
  await owned(ctx, args.token, watch.caseId);
  if (watch.status === "stopped" || watch.status === "expired") return null;
  await ctx.db.patch(watch._id, {
    status: "stopped",
    revision: watch.revision + 1,
    updatedAt: Date.now(),
  });
  await event(
    ctx,
    watch.caseId,
    `stop-watch:${watch._id}`,
    "watch_stopped",
    "Source watch stopped. Late observations will not update the case.",
  );
  return null;
}
export const due = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const late = await ctx.db
      .query("sourceWatches")
      .withIndex("by_status_and_nextCheckAt", (q) =>
        q.eq("status", "checking").lte("nextCheckAt", now),
      )
      .take(20);
    for (const watch of late) {
      await ctx.db.patch(watch._id, {
        status:
          watch.checks >= 7 || now >= watch.expiresAt ? "expired" : "active",
        lastOutcome: "unverified",
        nextCheckAt: now + DAY,
        revision: watch.revision + 1,
        updatedAt: now,
      });
      await event(
        ctx,
        watch.caseId,
        `watch-timeout:${watch._id}:${watch.revision}`,
        "watch_unverified",
        "The source check did not finish. No commercial change was inferred.",
      );
    }
    const due = await ctx.db
      .query("sourceWatches")
      .withIndex("by_status_and_nextCheckAt", (q) =>
        q.eq("status", "active").lte("nextCheckAt", now),
      )
      .take(20);
    for (const watch of due) {
      if (watch.checks >= 7 || now > watch.expiresAt || !watchingEnabled()) {
        await ctx.db.patch(watch._id, { status: "expired", updatedAt: now });
        await event(
          ctx,
          watch.caseId,
          `watch-expired:${watch._id}`,
          "watch_expired",
          "Source watch ended or was disabled by the server.",
        );
        continue;
      }
      const row = await ctx.db.get(watch.caseId);
      if (!row) continue;
      const revision = watch.revision + 1;
      await ctx.db.patch(watch._id, {
        status: "checking",
        checks: watch.checks + 1,
        revision,
        nextCheckAt: now + 10 * 60 * 1000,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.sourcingWatch.check, {
        watchId: watch._id,
        revision,
        ingredient: row.ingredient,
        region: row.region,
        url: watch.url,
      });
    }
    return null;
  },
});
export const current = internalQuery({
  args: { watchId: v.id("sourceWatches"), revision: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.watchId);
    return !!row && row.status === "checking" && row.revision === args.revision;
  },
});
export const check = internalAction({
  args: {
    watchId: v.id("sourceWatches"),
    revision: v.number(),
    ingredient: v.string(),
    region: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      !(await ctx.runQuery(internal.sourcingWatch.current, {
        watchId: args.watchId,
        revision: args.revision,
      }))
    )
      return null;
    try {
      if (!watchingEnabled()) throw new Error("Disabled");
      const source = await readProductPage(
        args.url,
        env.FIRECRAWL_API_KEY,
        providerFetch,
        args.region,
      );
      if (
        !(await ctx.runQuery(internal.sourcingWatch.current, {
          watchId: args.watchId,
          revision: args.revision,
        }))
      )
        return null;
      if (!source.markdown) throw new Error("No readable evidence");
      const parsed = await analyzeWebSourceWithAgent(
        ctx,
        { ...source, markdown: source.markdown!, ingredient: args.ingredient },
        env.OPENAI_API_KEY!,
        env.OPENAI_EXTRACTION_MODEL!,
      );
      await ctx.runMutation(internal.sourcingWatch.finish, {
        watchId: args.watchId,
        revision: args.revision,
        source: {
          ...source,
          analysis: parsed.analysis,
          extraction: parsed.offer,
          extractionStatus: "complete",
          extractionError: null,
          extractionAttempts: 1,
        },
      });
    } catch {
      await ctx.runMutation(internal.sourcingWatch.finish, {
        watchId: args.watchId,
        revision: args.revision,
        source: null,
      });
    }
    return null;
  },
});
export const finish = internalMutation({
  args: {
    watchId: v.id("sourceWatches"),
    revision: v.number(),
    source: v.union(candidate, v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const watch = await ctx.db.get(args.watchId);
    if (
      !watch ||
      watch.revision !== args.revision ||
      watch.status !== "checking"
    )
      return null;
    const row = await ctx.db.get(watch.caseId);
    if (!row) return null;
    const now = Date.now();
    const result = args.source?.extraction
      ? compareObservation(
          watch.baseline,
          watch.lastObservation,
          args.source.extraction,
          args.source.analysis?.kind ?? "uncertain",
        )
      : { outcome: "unverified" as const, observation: watch.lastObservation };
    const isExpired = watch.checks >= 7 || now >= watch.expiresAt;
    await ctx.db.patch(watch._id, {
      status: isExpired ? "expired" : "active",
      lastOutcome: result.outcome,
      lastObservation: result.observation,
      nextCheckAt: now + DAY,
      updatedAt: now,
    });
    let researchRunId: Id<"researchRuns"> | undefined;
    if (result.outcome === "changed" && args.source) {
      researchRunId = await ctx.db.insert("researchRuns", {
        ownerHash: row.ownerHash,
        clientId: `watch:${watch._id}:${args.revision}`,
        simulated: providerRehearsalEnabled(),
        ingredient: row.ingredient,
        region: row.region,
        observedAt: new Date(now).toISOString().slice(0, 10),
        createdAt: now,
        status: "complete",
        error: null,
        sources: [args.source],
        discarded: 0,
        warning: false,
      });
      await ctx.db.patch(row._id, {
        researchRunIds: [...row.researchRunIds, researchRunId].slice(-9),
        updatedAt: now,
      });
    }
    await ctx.db.insert("sourcingEvents", {
      caseId: row._id,
      eventKey: `observation:${watch._id}:${args.revision}`,
      kind: `watch_${result.outcome}`,
      summary:
        result.outcome === "changed"
          ? "The selected source has changed package or price terms. Review the new evidence before updating your comparison."
          : result.outcome === "unchanged"
            ? "The selected source has no new verified package or price changes."
            : "The source could not be verified as the same product with complete terms. No commercial change was inferred.",
      createdAt: now,
      url: watch.url,
      ...(researchRunId ? { researchRunId } : {}),
      ...(result.outcome === "changed" && args.source?.extraction
        ? { proposal: args.source.extraction }
        : {}),
    });
    return null;
  },
});

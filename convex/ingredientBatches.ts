import { ConvexError, v } from "convex/values";
import { start } from "@convex-dev/workflow";
import { mutation, query, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import { ingredientListSourceKind } from "./ingredientListValidators";
import { batchFields, listRow } from "./ingredientResearchValidators";
import { caseView } from "./sourcingValidators";
import { sourcingEnabled, view, event } from "./sourcing";
const identity = { batchId: v.id("ingredientBatches"), generation: v.number() };
async function launch(
  ctx: MutationCtx,
  batchId: Id<"ingredientBatches">,
  generation: number,
) {
  await ctx.db.patch(batchId, {
    active: true,
    generation,
    updatedAt: Date.now(),
  });
  await start(
    ctx,
    internal.ingredientBatchWorkflow.run,
    { batchId, generation },
    {
      startAsync: true,
      onComplete: internal.ingredientBatchWorkflow.completed,
      context: { batchId, generation },
    },
  );
}
async function sessionBatches(ctx: MutationCtx, hash: string) {
  return ctx.db
    .query("ingredientBatches")
    .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
    .take(10);
}
export const list = query({
  args: { token: v.string() },
  returns: v.object({
    enabled: v.boolean(),
    remaining: v.number(),
    busy: v.boolean(),
    batches: v.array(
      v.object({
        id: v.id("ingredientBatches"),
        ...batchFields,
        cases: v.array(
          v.object({
            ...caseView.fields,
            sources: v.number(),
            interpreted: v.number(),
            attempts: v.number(),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const cases = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    const batches = await ctx.db
      .query("ingredientBatches")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(10);
    return {
      enabled: sourcingEnabled(),
      remaining: Math.max(0, 10 - cases.length),
      busy:
        batches.some((b) => b.active) ||
        cases.some((c) => c.status === "running"),
      batches: await Promise.all(
        batches.map(
          async ({ _id, _creationTime, ownerHash: _owner, ...batch }) => ({
            id: _id,
            ...batch,
            cases: cases
              .filter((c) => c.batchId === _id)
              .map((c) => ({
                ...view(c),
                sources: c.sourceProgress?.length ?? 0,
                interpreted:
                  c.sourceProgress?.filter((s) => s.interpreted).length ?? 0,
                attempts: c.runs,
              })),
          }),
        ),
      ),
    };
  },
});
export const create = mutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    title: v.string(),
    region: v.string(),
    sourceKind: ingredientListSourceKind,
    rows: v.array(listRow),
  },
  returns: v.id("ingredientBatches"),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!/^[a-f0-9-]{36}$/.test(args.clientId))
      throw new ConvexError("Invalid request.");
    const prior = await ctx.db
      .query("ingredientBatches")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (prior) {
      if (
        prior.title !== args.title.trim() ||
        prior.sourceKind !== args.sourceKind ||
        prior.region !== args.region.trim() ||
        JSON.stringify(
          prior.rows.map(({ caseId: _id, state: _state, ...r }) => r),
        ) !== JSON.stringify(args.rows)
      )
        throw new ConvexError(
          "This request already started a different selection. Open its saved progress.",
        );
      return prior._id;
    }
    if (!sourcingEnabled())
      throw new ConvexError("Supplier research is not enabled.");
    const region = args.region.trim(),
      title = args.title.trim();
    if (
      !region ||
      region.length > 80 ||
      !title ||
      title.length > 120 ||
      args.sourceKind.length > 80
    )
      throw new ConvexError(
        "Enter a list name and delivery area within their limits.",
      );
    if (
      !args.rows.length ||
      args.rows.length > 10 ||
      new Set(args.rows.map((r) => r.id)).size !== args.rows.length ||
      args.rows.some(
        (r) =>
          !r.id ||
          r.id.length > 80 ||
          !r.ingredient.trim() ||
          r.ingredient.length > 120 ||
          r.original.length > 2000 ||
          r.reference.length > 200 ||
          (r.documentHash !== undefined &&
            !/^[a-f0-9]{64}$/.test(r.documentHash)) ||
          r.needsReview,
      )
    )
      throw new ConvexError(
        "Select up to 10 ingredients and review every selected row first.",
      );
    const cases = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    const batches = await sessionBatches(ctx, hash);
    if (
      batches.some((b) => b.active) ||
      cases.some((c) => c.status === "running")
    )
      throw new ConvexError(
        "Let your current research finish, or stop it, before starting another list.",
      );
    if (cases.length + args.rows.length > 10)
      throw new ConvexError(
        `This session has room for ${10 - cases.length} more ingredients. Reduce the selection before starting.`,
      );
    const total = await ctx.db
      .query("sourcingCases")
      .withIndex("by_creation_time")
      .take(500);
    if (total.length + args.rows.length > 500)
      throw new ConvexError(
        "Demo research capacity reached. Nothing was started.",
      );
    const now = Date.now();
    const id = await ctx.db.insert("ingredientBatches", {
      ownerHash: hash,
      clientId: args.clientId,
      title,
      region,
      sourceKind: args.sourceKind,
      rows: [],
      active: true,
      generation: 1,
      createdAt: now,
      updatedAt: now,
    });
    const rows: Doc<"ingredientBatches">["rows"] = [];
    for (const row of args.rows) {
      const caseId = await ctx.db.insert("sourcingCases", {
        ownerHash: hash,
        batchId: id,
        ingredient: row.ingredient.trim(),
        region,
        objective:
          "Find suppliers and verifiable product details for this ingredient.",
        status: "idle",
        phase: "Queued",
        revision: 1,
        steps: 0,
        runs: 0,
        researchRunIds: [],
        summary: "Queued. Research starts when a place becomes available.",
        createdAt: now,
        updatedAt: now,
      });
      rows.push({ ...row, caseId, state: "queued" });
    }
    await ctx.db.patch(id, { rows });
    await launch(ctx, id, 1);
    return id;
  },
});
export const claim = internalMutation({
  args: identity,
  returns: v.union(
    v.null(),
    v.object({ caseId: v.id("sourcingCases"), revision: v.number() }),
  ),
  handler: async (ctx, input) => {
    const b = await ctx.db.get(input.batchId);
    if (
      !b ||
      !b.active ||
      b.generation !== input.generation ||
      b.rows.filter((r) => r.state === "running").length >= 2
    )
      return null;
    const row = b.rows.find((r) => r.state === "queued");
    if (!row) return null;
    const c = await ctx.db.get(row.caseId);
    if (!c || c.ownerHash !== b.ownerHash || c.runs >= 3)
      throw new Error("Invalid queued ingredient");
    const revision = c.revision + 1;
    await ctx.db.patch(c._id, {
      status: "running",
      phase: "Planning",
      revision,
      runs: c.runs + 1,
      steps: 0,
      stopReason: undefined,
      workflowId: undefined,
      summary: "Planning supplier research.",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(b._id, {
      rows: b.rows.map((r) =>
        r.caseId === c._id ? { ...r, state: "running" as const } : r,
      ),
      updatedAt: Date.now(),
    });
    await event(
      ctx,
      c._id,
      `start:${revision}`,
      "started",
      "Research started from a reviewed ingredient list. No emails are sent.",
    );
    return { caseId: c._id, revision };
  },
});
export const settle = internalMutation({
  args: { ...identity, caseId: v.id("sourcingCases") },
  returns: v.null(),
  handler: async (ctx, input) => {
    const b = await ctx.db.get(input.batchId);
    if (!b || b.generation !== input.generation) return null;
    await ctx.db.patch(b._id, {
      rows: b.rows.map((r) =>
        r.caseId === input.caseId ? { ...r, state: "settled" as const } : r,
      ),
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const finishCoordinator = internalMutation({
  args: { ...identity, failed: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, input) => {
    const b = await ctx.db.get(input.batchId);
    if (!b || b.generation !== input.generation) return null;
    if (input.failed) {
      for (const row of b.rows.filter((r) => r.state !== "settled")) {
        const c = await ctx.db.get(row.caseId);
        if (c)
          await ctx.db.patch(c._id, {
            status: "failed",
            revision: c.revision + 1,
            summary:
              "The list coordinator stopped. Saved findings are preserved; retry this ingredient.",
            updatedAt: Date.now(),
          });
      }
      await ctx.db.patch(b._id, {
        active: false,
        rows: b.rows.map((r) => ({ ...r, state: "settled" as const })),
        updatedAt: Date.now(),
      });
    } else if (b.rows.some((r) => r.state === "queued"))
      await launch(ctx, b._id, b.generation + 1);
    else await ctx.db.patch(b._id, { active: false, updatedAt: Date.now() });
    return null;
  },
});
export const cancelQueued = mutation({
  args: {
    token: v.string(),
    batchId: v.id("ingredientBatches"),
    caseId: v.id("sourcingCases"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const b = await ctx.db.get(args.batchId),
      hash = await ownerHash(args.token);
    if (!b || b.ownerHash !== hash) throw new ConvexError("List unavailable.");
    const row = b.rows.find((r) => r.caseId === args.caseId);
    if (!row || row.state === "settled") return null;
    if (row.state === "running")
      throw new ConvexError(
        "This ingredient just started. Use Stop to end its research.",
      );
    await ctx.db.patch(row.caseId, {
      status: "canceled",
      summary: "Canceled before research started.",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(b._id, {
      rows: b.rows.map((r) =>
        r.caseId === row.caseId ? { ...r, state: "settled" as const } : r,
      ),
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const retry = mutation({
  args: {
    token: v.string(),
    batchId: v.id("ingredientBatches"),
    caseId: v.id("sourcingCases"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token),
      b = await ctx.db.get(args.batchId),
      c = await ctx.db.get(args.caseId);
    if (
      !b ||
      b.ownerHash !== hash ||
      !c ||
      c.ownerHash !== hash ||
      c.batchId !== b._id
    )
      throw new ConvexError("Ingredient unavailable.");
    const row = b.rows.find((r) => r.caseId === c._id);
    if (!row || row.state !== "settled" || c.runs !== args.attempt) return null;
    if (c.status !== "failed" && c.status !== "canceled")
      throw new ConvexError(
        "Only stopped or failed ingredients can be retried here.",
      );
    if (c.runs >= 3)
      throw new ConvexError(
        "This ingredient has used its three research attempts.",
      );
    if (!sourcingEnabled())
      throw new ConvexError("Supplier research is not enabled.");
    const others = await sessionBatches(ctx, hash);
    const cases = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    if (
      others.some((x) => x._id !== b._id && x.active) ||
      cases.some((x) => x.batchId !== b._id && x.status === "running")
    )
      throw new ConvexError(
        "Let the current research finish before retrying this list.",
      );
    await ctx.db.patch(c._id, {
      status: "idle",
      phase: "Queued",
      summary: "Queued for another attempt; earlier findings are preserved.",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(b._id, {
      rows: b.rows.map((r) =>
        r.caseId === c._id ? { ...r, state: "queued" as const } : r,
      ),
      updatedAt: Date.now(),
    });
    if (!b.active) await launch(ctx, b._id, b.generation + 1);
    return null;
  },
});

// An explicit Continue from the individual workspace uses the same queue.
export const continueResearch = internalMutation({
  args: { caseId: v.id("sourcingCases"), expectedRevision: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.caseId);
    if (!c?.batchId || c.revision !== args.expectedRevision) return null;
    const b = await ctx.db.get(c.batchId);
    if (!b || b.ownerHash !== c.ownerHash)
      throw new ConvexError("List unavailable.");
    const row = b.rows.find((r) => r.caseId === c._id);
    if (!row || row.state !== "settled") return null;
    if (!sourcingEnabled())
      throw new ConvexError("Supplier research is not enabled.");
    if (c.runs >= 3)
      throw new ConvexError(
        "This ingredient has used its three research attempts.",
      );
    const batches = await sessionBatches(ctx, c.ownerHash);
    const cases = await ctx.db
      .query("sourcingCases")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", c.ownerHash))
      .take(10);
    if (
      batches.some((x) => x._id !== b._id && x.active) ||
      cases.some((x) => x.batchId !== b._id && x.status === "running")
    )
      throw new ConvexError(
        "Let your current research finish before continuing this list.",
      );
    await ctx.db.patch(c._id, {
      status: "idle",
      phase: "Queued",
      summary: "Queued to continue with saved evidence.",
      updatedAt: Date.now(),
    });
    await ctx.db.patch(b._id, {
      rows: b.rows.map((r) =>
        r.caseId === c._id ? { ...r, state: "queued" as const } : r,
      ),
      updatedAt: Date.now(),
    });
    if (!b.active) await launch(ctx, b._id, b.generation + 1);
    return null;
  },
});

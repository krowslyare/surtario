import { ConvexError, v } from "convex/values";
import {
  action,
  env,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { ownerHash } from "./lib/demoSession";
import {
  advisorContext,
  advisorNarrative,
  savedAdvisorRun,
} from "./advisorValidators";
import { analyzePurchase } from "../src/domain/advisor";
import { explainPurchase, validateNarrative } from "./lib/advisorAgent";
const enabled = () =>
  env.ADVISOR_ENABLED === "true" &&
  !!env.OPENAI_API_KEY?.trim() &&
  !!env.OPENAI_ADVISOR_MODEL?.trim();
const view = ({
  _id,
  _creationTime: _created,
  ownerHash: _owner,
  clientId: _client,
  ...rest
}: Doc<"advisorRuns">) => ({ id: _id, ...rest });
export const status = query({
  args: {},
  returns: v.boolean(),
  handler: async () => enabled(),
});
export const list = query({
  args: { token: v.string(), comparisonId: v.id("comparisons") },
  returns: v.array(savedAdvisorRun),
  handler: async (ctx, args) => {
    const owner = await ownerHash(args.token);
    const comparison = await ctx.db.get(args.comparisonId);
    if (!comparison || comparison.ownerHash !== owner)
      throw new ConvexError("Comparación no disponible.");
    return (
      await ctx.db
        .query("advisorRuns")
        .withIndex("by_comparisonId", (q) =>
          q.eq("comparisonId", args.comparisonId),
        )
        .order("desc")
        .take(10)
    ).map(view);
  },
});
export const prepare = mutation({
  args: {
    token: v.string(),
    comparisonId: v.id("comparisons"),
    expectedRevision: v.number(),
    clientId: v.string(),
    context: advisorContext,
  },
  returns: savedAdvisorRun,
  handler: async (ctx, args) => {
    const owner = await ownerHash(args.token);
    if (!/^[a-f\d-]{36}$/i.test(args.clientId))
      throw new ConvexError("Solicitud no válida.");
    const comparison = await ctx.db.get(args.comparisonId);
    if (!comparison || comparison.ownerHash !== owner)
      throw new ConvexError("Comparación no disponible.");
    const existing = await ctx.db
      .query("advisorRuns")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", owner).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.comparisonId !== args.comparisonId ||
        existing.comparisonRevision !== args.expectedRevision ||
        JSON.stringify(existing.context) !== JSON.stringify(args.context)
      )
        throw new ConvexError("Esta solicitud ya corresponde a otro análisis.");
      return view(existing);
    }
    if (comparison.revision !== args.expectedRevision)
      throw new ConvexError(
        "La comparación cambió. Recupera la versión guardada antes de analizar.",
      );
    const c = args.context;
    if (
      [c.budgetCents, c.dailyUsage, c.stockQuantity, c.maxCoverageDays].some(
        (x) =>
          x !== null && (!Number.isFinite(x) || x < 0 || x > 1_000_000_000),
      ) ||
      (c.budgetCents !== null && !Number.isSafeInteger(c.budgetCents)) ||
      c.dailyUsage === 0 ||
      c.maxCoverageDays === 0 ||
      (c.preferredOfferId !== null &&
        !comparison.offers.some((o) => o.id === c.preferredOfferId))
    )
      throw new ConvexError(
        "Revisa el contexto: importes y cantidades válidos, consumo y cobertura mayores a cero.",
      );
    if (
      (
        await ctx.db
          .query("advisorRuns")
          .withIndex("by_ownerHash_and_clientId", (q) =>
            q.eq("ownerHash", owner),
          )
          .take(20)
      ).length >= 20
    )
      throw new ConvexError("Hasta 20 análisis por sesión.");
    if (
      (
        await ctx.db
          .query("advisorRuns")
          .withIndex("by_creation_time")
          .take(200)
      ).length >= 200
    )
      throw new ConvexError("Se alcanzó la capacidad de análisis de la demo.");
    const {
      _id: _id,
      _creationTime: _time,
      ownerHash: _hash,
      clientId: _client,
      ...snapshot
    } = comparison;
    const id = await ctx.db.insert("advisorRuns", {
      ownerHash: owner,
      clientId: args.clientId,
      comparisonId: comparison._id,
      comparisonRevision: comparison.revision,
      context: c,
      snapshot,
      report: analyzePurchase(comparison.request, comparison.offers, c),
      status: "calculated",
      narrative: null,
      error: null,
      createdAt: Date.now(),
      toolCalls: [],
    });
    return view((await ctx.db.get(id))!);
  },
});
export const reserve = internalMutation({
  args: { token: v.string(), id: v.id("advisorRuns") },
  returns: v.object({ fresh: v.boolean(), run: savedAdvisorRun }),
  handler: async (ctx, args) => {
    const owner = await ownerHash(args.token),
      run = await ctx.db.get(args.id);
    if (!run || run.ownerHash !== owner)
      throw new ConvexError("Análisis no disponible.");
    if (run.status !== "calculated") return { fresh: false, run: view(run) };
    if (!enabled())
      throw new ConvexError(
        "El asesor de IA aún no está habilitado. Puedes usar el escenario calculado.",
      );
    const comparison = await ctx.db.get(run.comparisonId);
    if (!comparison || comparison.revision !== run.comparisonRevision)
      throw new ConvexError(
        "El análisis está desactualizado. Prepara uno nuevo.",
      );
    await ctx.db.patch(run._id, { status: "running" });
    return { fresh: true, run: view({ ...run, status: "running" }) };
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("advisorRuns"),
    narrative: v.union(advisorNarrative, v.null()),
    toolCalls: v.array(v.string()),
  },
  returns: savedAdvisorRun,
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.id);
    if (!run) throw new Error("Missing advisor run");
    if (run.status !== "running") return view(run);
    if (args.narrative)
      validateNarrative(
        args.narrative,
        Object.fromEntries(
          run.snapshot.offers.map((o) => [o.id, run.snapshot.sources[o.id]]),
        ),
      );
    const allowed = ["evaluateScenarios", "readEvidence"];
    if (
      args.toolCalls.length > 6 ||
      args.toolCalls.some((x) => !allowed.includes(x))
    )
      throw new Error("Invalid advisor tool trace");
    await ctx.db.patch(run._id, {
      status: args.narrative ? "complete" : "failed",
      narrative: args.narrative,
      toolCalls: args.toolCalls,
      error: args.narrative
        ? null
        : "No se confirmó el análisis de IA. El cálculo se conserva; no se reintenta automáticamente.",
    });
    return view((await ctx.db.get(run._id))!);
  },
});
export const explain = action({
  args: { token: v.string(), id: v.id("advisorRuns") },
  returns: savedAdvisorRun,
  handler: async (ctx, args): Promise<typeof savedAdvisorRun.type> => {
    const reserved = await ctx.runMutation(internal.advisor.reserve, args);
    if (!reserved.fresh) return reserved.run;
    let output: Awaited<ReturnType<typeof explainPurchase>> | null = null;
    try {
      output = await explainPurchase(
        ctx,
        reserved.run,
        env.OPENAI_API_KEY!,
        env.OPENAI_ADVISOR_MODEL!,
      );
    } catch {
      /* Preserve deterministic result; sanitize model/provider failures. */
    }
    return await ctx.runMutation(internal.advisor.finish, {
      id: args.id,
      narrative: output?.narrative ?? null,
      toolCalls: output?.toolCalls ?? [],
    });
  },
});

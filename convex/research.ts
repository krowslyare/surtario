import { ConvexError, v } from "convex/values";
import { action, env, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { ownerHash } from "./lib/demoSession";
import { discoverSources, type DiscoveryResult } from "./lib/firecrawl";
import { extractOfferWithAgent } from "./lib/agentExtraction";
import { providerRehearsalEnabled } from "./lib/providerTransport";
import {
  extractedOfferValidator,
  savedResearchValidator,
  type ExtractedOffer,
  type SavedResearch,
} from "./researchValidators";

const MAX_PER_SESSION = 10;
const MAX_GLOBAL = 500;
const COOLDOWN_MS = 30_000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_ERROR =
  "No se pudo completar la búsqueda. No se reintenta automáticamente; usa una solicitud nueva cuando quieras intentarlo otra vez.";
const EXTRACTION_ERROR =
  "No se obtuvo una extracción verificable. Revisa la fuente y vuelve a intentarlo manualmente.";

function enabled(value: string | undefined) {
  return value === "true";
}

function cleanInput(ingredient: string, region: string) {
  const cleanIngredient = ingredient.trim();
  const cleanRegion = region.trim();
  if (!cleanIngredient || cleanIngredient.length > 120)
    throw new ConvexError("Indica un insumo de hasta 120 caracteres.");
  if (!cleanRegion || cleanRegion.length > 80)
    throw new ConvexError("Indica una zona de hasta 80 caracteres.");
  return { ingredient: cleanIngredient, region: cleanRegion };
}

function publicRun(run: Doc<"researchRuns">): SavedResearch {
  return {
    id: run._id,
    simulated: run.simulated ?? false,
    ingredient: run.ingredient,
    region: run.region,
    observedAt: run.observedAt,
    status: run.status,
    error: run.error,
    sources: run.sources.map(
      ({ extractionAttempts: _attempts, ...source }) => source,
    ),
    discarded: run.discarded,
    warning: run.warning,
  };
}

export const status = query({
  args: {},
  returns: v.object({
    searchEnabled: v.boolean(),
    extractionEnabled: v.boolean(),
  }),
  handler: async () => ({
    searchEnabled:
      enabled(env.LIVE_RESEARCH_ENABLED) && !!env.FIRECRAWL_API_KEY?.trim(),
    extractionEnabled:
      enabled(env.LIVE_RESEARCH_ENABLED) &&
      !!env.OPENAI_API_KEY?.trim() &&
      !!env.OPENAI_EXTRACTION_MODEL?.trim(),
  }),
});

export const list = query({
  args: { token: v.string() },
  returns: v.array(savedResearchValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const runs = await ctx.db
      .query("researchRuns")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    return runs.map(publicRun);
  },
});

const reserveResult = v.union(
  v.object({ kind: v.literal("existing"), run: savedResearchValidator }),
  v.object({ kind: v.literal("reserved"), run: savedResearchValidator }),
);

export const reserveSearch = internalMutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    ingredient: v.string(),
    region: v.string(),
  },
  returns: reserveResult,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!UUID.test(args.clientId))
      throw new ConvexError("Solicitud no válida.");
    const input = cleanInput(args.ingredient, args.region);
    const existing = await ctx.db
      .query("researchRuns")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.ingredient !== input.ingredient ||
        existing.region !== input.region
      )
        throw new ConvexError("La solicitud ya existe con otros datos.");
      return { kind: "existing" as const, run: publicRun(existing) };
    }
    const own = await ctx.db
      .query("researchRuns")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError("Esta sesión admite hasta 10 búsquedas reales.");
    if (own[0] && Date.now() - own[0].createdAt < COOLDOWN_MS)
      throw new ConvexError(
        "Espera 30 segundos antes de iniciar otra búsqueda.",
      );
    const all = await ctx.db
      .query("researchRuns")
      .withIndex("by_creation_time")
      .take(MAX_GLOBAL);
    if (all.length >= MAX_GLOBAL)
      throw new ConvexError(
        "Se alcanzó la capacidad total de búsquedas de la demo.",
      );
    const now = Date.now();
    const id = await ctx.db.insert("researchRuns", {
      ownerHash: hash,
      clientId: args.clientId,
      ...input,
      observedAt: new Date(now).toISOString(),
      createdAt: now,
      status: "running",
      error: null,
      sources: [],
      discarded: 0,
      warning: false,
    });
    return {
      kind: "reserved" as const,
      run: publicRun((await ctx.db.get(id))!),
    };
  },
});

export const finishSearch = internalMutation({
  args: {
    id: v.id("researchRuns"),
    sources: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        description: v.string(),
        markdown: v.union(v.string(), v.null()),
        contentTruncated: v.boolean(),
      }),
    ),
    discarded: v.number(),
    warning: v.boolean(),
    simulated: v.boolean(),
  },
  returns: savedResearchValidator,
  handler: async (ctx, args) => {
    if (
      args.sources.length > 3 ||
      args.sources.some(
        (source) =>
          source.url.length > 2000 ||
          source.title.length > 300 ||
          source.description.length > 2000 ||
          (source.markdown?.length ?? 0) > 20000,
      )
    )
      throw new Error("Discovery exceeds source limits.");
    const run = await ctx.db.get(args.id);
    if (!run) throw new Error("Missing reserved research run.");
    if (run.status === "running")
      await ctx.db.patch(run._id, {
        status: "complete",
        sources: args.sources.map((source) => ({
          ...source,
          extraction: null,
          extractionStatus: "idle" as const,
          extractionError: null,
          extractionAttempts: 0,
        })),
        discarded: args.discarded,
        warning: args.warning,
        simulated: args.simulated,
      });
    return publicRun((await ctx.db.get(run._id))!);
  },
});

export const failSearch = internalMutation({
  args: { id: v.id("researchRuns") },
  returns: savedResearchValidator,
  handler: async (ctx, { id }) => {
    const run = await ctx.db.get(id);
    if (!run) throw new Error("Missing reserved research run.");
    if (run.status === "running")
      await ctx.db.patch(id, { status: "failed", error: SEARCH_ERROR });
    return publicRun((await ctx.db.get(id))!);
  },
});

export const search = action({
  args: {
    token: v.string(),
    clientId: v.string(),
    ingredient: v.string(),
    region: v.string(),
  },
  returns: savedResearchValidator,
  handler: async (ctx, args): Promise<SavedResearch> => {
    cleanInput(args.ingredient, args.region);
    if (!enabled(env.LIVE_RESEARCH_ENABLED) || !env.FIRECRAWL_API_KEY?.trim())
      throw new ConvexError("La búsqueda real no está habilitada.");
    const reservation: { kind: "existing" | "reserved"; run: SavedResearch } =
      await ctx.runMutation(internal.research.reserveSearch, args);
    if (reservation.kind === "existing") return reservation.run;
    try {
      const result: DiscoveryResult = await discoverSources(
        {
          ingredient: reservation.run.ingredient,
          region: reservation.run.region,
        },
        env.FIRECRAWL_API_KEY,
      );
      return await ctx.runMutation(internal.research.finishSearch, {
        id: reservation.run.id,
        ...result,
        simulated: providerRehearsalEnabled(),
      });
    } catch {
      return await ctx.runMutation(internal.research.failSearch, {
        id: reservation.run.id,
      });
    }
  },
});

const extractionReservation = v.union(
  v.object({ kind: v.literal("complete"), offer: extractedOfferValidator }),
  v.object({ kind: v.literal("running") }),
  v.object({ kind: v.literal("reserved"), markdown: v.string() }),
);

export const reserveExtraction = internalMutation({
  args: {
    token: v.string(),
    runId: v.id("researchRuns"),
    sourceIndex: v.number(),
  },
  returns: extractionReservation,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!Number.isSafeInteger(args.sourceIndex) || args.sourceIndex < 0)
      throw new ConvexError("Fuente no válida.");
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash)
      throw new ConvexError("Búsqueda no disponible en esta sesión.");
    if (run.status !== "complete")
      throw new ConvexError("La búsqueda todavía no está completa.");
    const source = run.sources[args.sourceIndex];
    if (!source) throw new ConvexError("Fuente no válida.");
    if (!source.markdown)
      throw new ConvexError("Esta fuente no contiene texto para extraer.");
    if (source.extractionStatus === "complete" && source.extraction)
      return { kind: "complete" as const, offer: source.extraction };
    if (source.extractionStatus === "running")
      return { kind: "running" as const };
    if (source.extractionAttempts >= 2)
      throw new ConvexError("Esta fuente alcanzó el máximo de dos intentos.");
    const sources = [...run.sources];
    sources[args.sourceIndex] = {
      ...source,
      extractionStatus: "running",
      extractionError: null,
      extractionAttempts: source.extractionAttempts + 1,
    };
    await ctx.db.patch(run._id, { sources });
    return { kind: "reserved" as const, markdown: source.markdown };
  },
});

export const finishExtraction = internalMutation({
  args: {
    runId: v.id("researchRuns"),
    sourceIndex: v.number(),
    offer: extractedOfferValidator,
  },
  returns: extractedOfferValidator,
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const source = run?.sources[args.sourceIndex];
    if (!run || !source || source.extractionStatus !== "running")
      throw new Error("Missing reserved source.");
    const sources = [...run.sources];
    sources[args.sourceIndex] = {
      ...source,
      extraction: args.offer,
      extractionStatus: "complete",
      extractionError: null,
    };
    await ctx.db.patch(run._id, { sources });
    return args.offer;
  },
});

export const failExtraction = internalMutation({
  args: { runId: v.id("researchRuns"), sourceIndex: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const source = run?.sources[args.sourceIndex];
    if (run && source && source.extractionStatus === "running") {
      const sources = [...run.sources];
      sources[args.sourceIndex] = {
        ...source,
        extractionStatus: "failed",
        extractionError: EXTRACTION_ERROR,
      };
      await ctx.db.patch(run._id, { sources });
    }
    return null;
  },
});

export const extract = action({
  args: {
    token: v.string(),
    runId: v.id("researchRuns"),
    sourceIndex: v.number(),
  },
  returns: extractedOfferValidator,
  handler: async (ctx, args): Promise<ExtractedOffer> => {
    if (
      !enabled(env.LIVE_RESEARCH_ENABLED) ||
      !env.OPENAI_API_KEY?.trim() ||
      !env.OPENAI_EXTRACTION_MODEL?.trim()
    )
      throw new ConvexError("La extracción real no está habilitada.");
    const reservation:
      | { kind: "complete"; offer: ExtractedOffer }
      | { kind: "running" }
      | { kind: "reserved"; markdown: string } = await ctx.runMutation(
      internal.research.reserveExtraction,
      args,
    );
    if (reservation.kind === "complete") return reservation.offer;
    if (reservation.kind === "running")
      throw new ConvexError("La extracción de esta fuente ya está en curso.");
    let offer: ExtractedOffer;
    try {
      offer = await extractOfferWithAgent(
        ctx,
        reservation.markdown,
        env.OPENAI_API_KEY,
        env.OPENAI_EXTRACTION_MODEL,
      );
    } catch {
      await ctx.runMutation(internal.research.failExtraction, {
        runId: args.runId,
        sourceIndex: args.sourceIndex,
      });
      throw new ConvexError(EXTRACTION_ERROR);
    }
    // An uncertain commit must not permit another paid model call.
    try {
      return await ctx.runMutation(internal.research.finishExtraction, {
        runId: args.runId,
        sourceIndex: args.sourceIndex,
        offer,
      });
    } catch {
      throw new ConvexError(
        "La extracción respondió, pero no se confirmó su guardado. No repitas la llamada; requiere revisión del operador.",
      );
    }
  },
});

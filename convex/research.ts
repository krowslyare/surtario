import { ConvexError, v } from "convex/values";
import { action, env, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { ownerHash } from "./lib/demoSession";
import {
  discoverSources,
  readProductPage,
  type DiscoveryResult,
} from "./lib/firecrawl";
import { analyzeWebSourceWithAgent } from "./lib/agentExtraction";
import { inspectSource } from "./lib/sourceQuality";
import type { WebAnalysis } from "./lib/webAnalysis";
import { providerRehearsalEnabled } from "./lib/providerTransport";
import {
  extractedOfferValidator,
  savedResearchValidator,
  sourceAnalysisValidator,
  type ExtractedOffer,
  type SavedResearch,
} from "./researchValidators";

const MAX_PER_SESSION = 10;
const MAX_GLOBAL = 500;
const COOLDOWN_MS = 30_000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEARCH_ERROR =
  "The search could not be completed. It will not retry automatically; use a new request when you want to try again.";
const EXTRACTION_ERROR =
  "No verifiable extraction was produced. Review the source and try again manually.";

function enabled(value: string | undefined) {
  return value === "true";
}

function cleanInput(ingredient: string, region: string) {
  const cleanIngredient = ingredient.trim();
  const cleanRegion = region.trim();
  if (!cleanIngredient || cleanIngredient.length > 120)
    throw new ConvexError("Enter an ingredient of up to 120 characters.");
  if (!cleanRegion || cleanRegion.length > 80)
    throw new ConvexError("Enter an area of up to 80 characters.");
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
      ({ extractionAttempts: _attempts, ...source }) => ({
        ...source,
        inspection: inspectSource(source, run.ingredient),
      }),
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
      throw new ConvexError("Invalid request.");
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
        throw new ConvexError("This request already exists with different data.");
      return { kind: "existing" as const, run: publicRun(existing) };
    }
    const own = await ctx.db
      .query("researchRuns")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError("This session supports up to 10 live searches.");
    if (own[0] && Date.now() - own[0].createdAt < COOLDOWN_MS)
      throw new ConvexError(
        "Wait 30 seconds before starting another search.",
      );
    const all = await ctx.db
      .query("researchRuns")
      .withIndex("by_creation_time")
      .take(MAX_GLOBAL);
    if (all.length >= MAX_GLOBAL)
      throw new ConvexError(
        "The demo search capacity has been reached.",
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
      throw new ConvexError("Live search is not enabled.");
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
  v.object({
    kind: v.literal("reserved"),
    markdown: v.string(),
    ingredient: v.string(),
    title: v.string(),
    url: v.string(),
    contentTruncated: v.boolean(),
  }),
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
      throw new ConvexError("Invalid source.");
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash)
      throw new ConvexError("Search unavailable in this session.");
    if (run.status !== "complete")
      throw new ConvexError("The search is not complete yet.");
    const source = run.sources[args.sourceIndex];
    if (!source) throw new ConvexError("Invalid source.");
    if (!source.markdown)
      throw new ConvexError("This source has no text to extract.");
    if (source.readStatus && source.readStatus !== "complete")
      throw new ConvexError("This product-page read is not complete.");
    const inspection = inspectSource(source, run.ingredient);
    if (inspection.state !== "readable")
      throw new ConvexError(inspection.reason!);
    if (source.extractionStatus === "complete" && source.extraction)
      return { kind: "complete" as const, offer: source.extraction };
    if (source.extractionStatus === "running")
      return { kind: "running" as const };
    if (source.extractionAttempts >= 2)
      throw new ConvexError("This source has reached the two-attempt limit.");
    const sources = [...run.sources];
    sources[args.sourceIndex] = {
      ...source,
      extractionStatus: "running",
      extractionError: null,
      extractionAttempts: source.extractionAttempts + 1,
    };
    await ctx.db.patch(run._id, { sources });
    return {
      kind: "reserved" as const,
      markdown: source.markdown,
      ingredient: run.ingredient,
      title: source.title,
      url: source.url,
      contentTruncated: source.contentTruncated,
    };
  },
});

export const finishExtraction = internalMutation({
  args: {
    runId: v.id("researchRuns"),
    sourceIndex: v.number(),
    offer: extractedOfferValidator,
    analysis: v.optional(sourceAnalysisValidator),
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
      ...(args.analysis ? { analysis: args.analysis } : {}),
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
      throw new ConvexError("Live extraction is not enabled.");
    const reservation:
      | { kind: "complete"; offer: ExtractedOffer }
      | { kind: "running" }
      | {
          kind: "reserved";
          markdown: string;
          ingredient: string;
          title: string;
          url: string;
          contentTruncated: boolean;
        } = await ctx.runMutation(internal.research.reserveExtraction, args);
    if (reservation.kind === "complete") return reservation.offer;
    if (reservation.kind === "running")
      throw new ConvexError("Extraction for this source is already running.");
    let result: WebAnalysis;
    try {
      result = await analyzeWebSourceWithAgent(
        ctx,
        {
          markdown: reservation.markdown,
          ingredient: reservation.ingredient,
          title: reservation.title,
          url: reservation.url,
          contentTruncated: reservation.contentTruncated,
        },
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
        offer: result.offer,
        analysis: result.analysis,
      });
    } catch {
      throw new ConvexError(
        "Extraction returned, but saving could not be confirmed. Do not repeat the call; operator review is required.",
      );
    }
  },
});

const readArgs = {
  token: v.string(),
  runId: v.id("researchRuns"),
  sourceIndex: v.number(),
  url: v.string(),
};
export const reserveProductRead = internalMutation({
  args: { ...readArgs, simulated: v.boolean() },
  returns: v.object({
    kind: v.union(v.literal("reserved"), v.literal("existing")),
    run: savedResearchValidator,
    childIndex: v.number(),
  }),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash)
      throw new ConvexError("Search unavailable in this session.");
    if (run.status !== "complete")
      throw new ConvexError("The search is not complete yet.");
    if ((run.simulated ?? false) !== args.simulated)
      throw new ConvexError(
        "This search belongs to another supplier mode. Start a new search.",
      );
    if (!Number.isSafeInteger(args.sourceIndex) || args.sourceIndex < 0)
      throw new ConvexError("Invalid source.");
    const parent = run.sources[args.sourceIndex];
    if (!parent || parent.parentSourceIndex !== undefined)
      throw new ConvexError(
        "Select an original source; chained links are not followed.",
      );
    const choice = inspectSource(parent, run.ingredient).links.find(
      (link) => link.url === args.url,
    );
    if (!choice)
      throw new ConvexError("Select a product link from this source.");
    const existing = run.sources.findIndex(
      (source) => source.parentSourceIndex === args.sourceIndex,
    );
    if (existing >= 0) {
      if (run.sources[existing].url !== choice.url)
        throw new ConvexError("This source already has a selected product page.");
      return {
        kind: "existing" as const,
        run: publicRun(run),
        childIndex: existing,
      };
    }
    if (run.sources.length >= 6)
      throw new ConvexError("This search has reached the product-page limit.");
    const sources = [
      ...run.sources,
      {
        url: choice.url,
        title: choice.label,
        description: "",
        markdown: null,
        contentTruncated: false,
        extraction: null,
        extractionStatus: "idle" as const,
        extractionError: null,
        extractionAttempts: 0,
        parentSourceIndex: args.sourceIndex,
        observedAt: new Date().toISOString(),
        readStatus: "running" as const,
        readError: null,
      },
    ];
    await ctx.db.patch(run._id, { sources });
    return {
      kind: "reserved" as const,
      run: publicRun((await ctx.db.get(run._id))!),
      childIndex: sources.length - 1,
    };
  },
});

export const finishProductRead = internalMutation({
  args: {
    runId: v.id("researchRuns"),
    childIndex: v.number(),
    page: v.union(
      v.object({
        url: v.string(),
        title: v.string(),
        description: v.string(),
        markdown: v.union(v.string(), v.null()),
        contentTruncated: v.boolean(),
      }),
      v.null(),
    ),
  },
  returns: savedResearchValidator,
  handler: async (ctx, { runId, childIndex, page }) => {
    const run = await ctx.db.get(runId);
    const source = run?.sources[childIndex];
    if (!run || !source || source.parentSourceIndex === undefined)
      throw new Error("Missing reserved product read.");
    if (source.readStatus !== "running") return publicRun(run);
    if (
      page &&
      (page.url !== source.url ||
        page.title.length > 300 ||
        page.description.length > 2000 ||
        (page.markdown?.length ?? 0) > 20000)
    )
      throw new Error("Product read exceeds limits.");
    const sources = [...run.sources];
    sources[childIndex] = {
      ...source,
      ...(page ?? {}),
      observedAt: new Date().toISOString(),
      readStatus: page ? "complete" : "failed",
      readError: page
        ? null
        : "The product page could not be read. The call may have consumed credits and will not retry automatically.",
    };
    await ctx.db.patch(runId, { sources });
    return publicRun((await ctx.db.get(runId))!);
  },
});

export const readProduct = action({
  args: readArgs,
  returns: savedResearchValidator,
  handler: async (ctx, args): Promise<SavedResearch> => {
    if (!enabled(env.LIVE_RESEARCH_ENABLED) || !env.FIRECRAWL_API_KEY?.trim())
      throw new ConvexError("Web reading is not enabled.");
    const reservation: {
      kind: "reserved" | "existing";
      run: SavedResearch;
      childIndex: number;
    } = await ctx.runMutation(internal.research.reserveProductRead, {
      ...args,
      simulated: providerRehearsalEnabled(),
    });
    if (reservation.kind === "existing") return reservation.run;
    let page;
    try {
      page = await readProductPage(
        reservation.run.sources[reservation.childIndex].url,
        env.FIRECRAWL_API_KEY,
        undefined,
        reservation.run.region,
      );
    } catch {
      return await ctx.runMutation(internal.research.finishProductRead, {
        runId: args.runId,
        childIndex: reservation.childIndex,
        page: null,
      });
    }
    // A failed commit leaves the reservation running; it never authorizes another paid call.
    return await ctx.runMutation(internal.research.finishProductRead, {
      runId: args.runId,
      childIndex: reservation.childIndex,
      page,
    });
  },
});

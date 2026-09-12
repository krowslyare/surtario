import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { savedStudyValidator } from "./studyValidators";
import { webReviewInputValidator } from "./comparisonValidators";
import { extractionFields } from "../src/domain/extraction";
import { sameStudyContext, type WebSelection } from "../src/domain/study";
import { reconstructWebReview } from "./lib/webReviews";
import {
  findMarketExampleContext,
  findMarketExampleContextByIds,
  marketExamples,
} from "../fixtures/market";
import type { Doc } from "./_generated/dataModel";

function reviewedSelectionKey(items: WebSelection[]) {
  return JSON.stringify(
    items
      .map(({ sourceId, seed }) => [
        sourceId,
        ...extractionFields.map(
          (field) => seed.sources[sourceId].webReview?.values[field],
        ),
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}
const MAX_PER_SESSION = 10;
const MAX_DEMO_STUDIES = 500;

import { ownerHash } from "./lib/demoSession";
function publicStudy(study: Doc<"studies">) {
  const {
    _id,
    term,
    region,
    results,
    selectedIds,
    webSelections,
    prospects,
    revision,
    updatedAt,
  } = study;
  return {
    id: _id,
    term,
    region,
    results,
    selectedIds,
    webSelections,
    prospects,
    revision,
    updatedAt,
  };
}
export const list = query({
  args: { token: v.string() },
  returns: v.array(savedStudyValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const studies = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    return studies.map(publicStudy).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
export const save = mutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    id: v.union(v.id("studies"), v.null()),
    expectedRevision: v.number(),
    term: v.string(),
    region: v.string(),
    selectedIds: v.array(v.string()),
    webReviews: v.optional(v.array(webReviewInputValidator)),
    prospectIds: v.optional(v.array(v.id("webProspects"))),
  },
  returns: savedStudyValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!/^[a-f0-9-]{36}$/.test(args.clientId))
      throw new ConvexError("Invalid request.");
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision < 0
    )
      throw new ConvexError("Invalid review.");
    const reviews = args.webReviews ?? [];
    const prospectIds = args.prospectIds ?? [];
    if (
      reviews.length > 3 ||
      prospectIds.length > 3 ||
      new Set(reviews.map((r) => `${r.runId}:${r.sourceIndex}`)).size !==
        reviews.length ||
      new Set(prospectIds).size !== prospectIds.length
    )
      throw new ConvexError(
        "Select up to three web offers and three distinct distributors.",
      );
    const webSelections = [];
    for (const review of reviews) {
      const seed = await reconstructWebReview(ctx, hash, review);
      const run = (await ctx.db.get("researchRuns", review.runId))!;
      webSelections.push({
        ingredient: run.ingredient,
        region: run.region,
        sourceId: `${review.runId}:${review.sourceIndex}`,
        seed,
      });
    }
    const prospects = [];
    for (const id of prospectIds) {
      const item = await ctx.db.get("webProspects", id);
      if (!item || item.ownerHash !== hash)
        throw new ConvexError("Distributor unavailable in this session.");
      const { _id, _creationTime: _time, ownerHash: _owner, ...content } = item;
      const origin = await ctx.db.get("researchRuns", content.runId);
      prospects.push({
        id: _id,
        ...content,
        simulated: content.simulated ?? origin?.simulated ?? false,
      });
    }
    // Persist only server-owned evidence; never accept an arbitrary source snapshot.
    const contextId = reviews[0]?.runId ?? prospects[0]?.runId;
    const context = contextId
      ? await ctx.db.get("researchRuns", contextId)
      : null;
    const term = context?.ingredient ?? args.term.trim();
    const region = context?.region ?? args.region;
    const selectedIds = [...new Set(args.selectedIds)];
    const selectedExampleContext = findMarketExampleContextByIds(selectedIds);
    const requestedExampleContext = findMarketExampleContext(term, region);
    if (!context && !requestedExampleContext)
      throw new ConvexError(
        "Por ahora solo se guardan estudios del ejemplo o fuentes web revisadas.",
      );
    if (
      args.selectedIds.length > 4 ||
      (!selectedIds.length && !webSelections.length && !prospects.length) ||
      (selectedIds.length > 0 &&
        (!selectedExampleContext ||
          (!context && selectedExampleContext !== requestedExampleContext)))
    )
      throw new ConvexError(
        "Select one to four example options, one web offer, or one reviewed distributor.",
      );
    if (
      context &&
      (webSelections.some((item) => !sameStudyContext(context, item)) ||
        prospects.some((item) => !sameStudyContext(context, item)) ||
        (selectedIds.length > 0 &&
          (!selectedExampleContext ||
            !sameStudyContext(context, selectedExampleContext))))
    )
      throw new ConvexError(
        "This study covers one ingredient and one area. Save the selection and start another study to change the research.",
      );
    if (args.id) {
      const study = await ctx.db.get("studies", args.id);
      if (!study || study.ownerHash !== hash)
        throw new ConvexError("Study unavailable in this session.");
      if (study.revision !== args.expectedRevision)
        throw new ConvexError(
          "The study changed in another view. Open it from Saved before updating.",
        );
      const savedExampleContext = findMarketExampleContext(
        study.term,
        study.region,
      );
      const sameSavedContext = savedExampleContext
        ? requestedExampleContext === savedExampleContext
        : term === study.term && region === study.region;
      if (
        !sameSavedContext ||
        (selectedExampleContext &&
          !selectedExampleContext.results.every((result) =>
            study.results.some((saved) => saved.id === result.id),
          ))
      )
        throw new ConvexError(
          "Este estudio conserva un insumo, una zona y sus fuentes. Inicia otro estudio para cambiar de mercado.",
        );
      // Preserve the original source snapshot when updating selection.
      await ctx.db.patch("studies", study._id, {
        term,
        region,
        selectedIds,
        webSelections,
        prospects,
        revision: study.revision + 1,
        updatedAt: Date.now(),
      });
      return publicStudy((await ctx.db.get("studies", study._id))!);
    }
    if (args.expectedRevision !== 0)
      throw new ConvexError("Invalid review.");
    const existing = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.term !== term ||
        existing.region !== region ||
        reviewedSelectionKey(existing.webSelections ?? []) !==
          reviewedSelectionKey(webSelections) ||
        JSON.stringify(
          (existing.prospects ?? []).map((item) => item.id).sort(),
        ) !== JSON.stringify([...prospectIds].sort()) ||
        existing.selectedIds.length !== selectedIds.length ||
        selectedIds.some((id) => !existing.selectedIds.includes(id))
      ) {
        throw new ConvexError(
          "The previous request was saved with another selection. Open the study from Saved before updating.",
        );
      }
      return publicStudy(existing);
    }
    const own = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError("This session supports up to 10 studies.");
    const all = await ctx.db
      .query("studies")
      .withIndex("by_creation_time")
      .take(MAX_DEMO_STUDIES);
    if (all.length >= MAX_DEMO_STUDIES)
      throw new ConvexError("The local demo capacity has been reached.");
    const id = await ctx.db.insert("studies", {
      ownerHash: hash,
      clientId: args.clientId,
      term,
      region,
      results: requestedExampleContext?.results ?? marketExamples,
      selectedIds,
      webSelections,
      prospects,
      revision: 1,
      updatedAt: Date.now(),
    });
    return publicStudy((await ctx.db.get("studies", id))!);
  },
});

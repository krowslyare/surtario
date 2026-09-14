import {
  emptyReplyProposal,
  mergeReplyOffer,
  prepareReplyOffer,
} from "../src/domain/replyReview";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  savedComparisonValidator,
  webReviewInputValidator,
  documentReviewInputValidator,
  replyReviewInputValidator,
} from "./comparisonValidators";
import {
  procurementRequestValidator,
  supplierOfferValidator,
} from "./validators";
import { ownerHash } from "./lib/demoSession";
import { reconstructWebReview, type WebReview } from "./lib/webReviews";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import {
  findMarketExampleContextByIds,
  marketExamples,
} from "../fixtures/market";
import {
  preparePurchaseFromCatalog,
  type PurchaseSeed,
} from "../src/domain/market";
import {
  combineReviewedOffers,
  extractionFields,
  extractionToPurchase,
  type ReviewedValues,
} from "../src/domain/extraction";
import {
  evaluateOffer,
  type SupplierOffer,
  type ProcurementRequest,
} from "../src/domain/procurement";

function sameFields<T extends object>(a: T, b: T) {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, i) => sameValue(value, b[i]))
    );
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  return (
    Object.keys(left).length === Object.keys(right).length &&
    Object.keys(left).every(
      (key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]),
    )
  );
}

async function reconstructWebReviews(
  ctx: MutationCtx,
  owner: string,
  reviews: WebReview[],
): Promise<PurchaseSeed> {
  if (!reviews.length || reviews.length > 3)
    throw new ConvexError("Select between one and three reviewed web sources.");
  if (
    new Set(reviews.map((review) => `${review.runId}:${review.sourceIndex}`))
      .size !== reviews.length
  )
    throw new ConvexError("The same source cannot appear twice.");
  const seeds = [];
  for (const review of reviews)
    seeds.push(await reconstructWebReview(ctx, owner, review));
  try {
    return combineReviewedOffers(seeds, true);
  } catch (error) {
    throw new ConvexError(
      error instanceof Error ? error.message : "Invalid web review.",
    );
  }
}

async function reconstructDocumentReview(
  ctx: MutationCtx,
  owner: string,
  review: {
    runId: Doc<"documentRuns">["_id"];
    values: ReviewedValues;
    confirmed: true;
  },
): Promise<PurchaseSeed> {
  if (extractionFields.some((key) => review.values[key].length > 120))
    throw new ConvexError("Invalid document review.");
  const run = await ctx.db.get("documentRuns", review.runId);
  if (!run || run.ownerHash !== owner)
    throw new ConvexError("Document unavailable in this session.");
  if (
    run.status !== "complete" ||
    !run.result ||
    run.result.documentType !== "quotation"
  )
    throw new ConvexError("A complete quote reading is required.");
  try {
    const seed = extractionToPurchase(
      {
        id: run._id,
        title: `Automatic transcript · synthetic quote · ${run.kind}`,
        text: run.result.transcript,
        observedAt: new Date(run.createdAt).toISOString().slice(0, 10),
        simulated: true,
        url: `/examples/cotizacion-demo.${run.kind === "pdf" ? "pdf" : "png"}`,
      },
      run.result.offer,
      review.values,
      review.confirmed,
    );
    seed.sources[run._id].documentReview = { ...review };
    return seed;
  } catch (error) {
    throw new ConvexError(
      error instanceof Error ? error.message : "Invalid document review.",
    );
  }
}

async function reconstructReply(
  ctx: MutationCtx,
  owner: string,
  review: {
    requestId: Doc<"quotationRequests">["_id"];
    messageId: string;
    extractionAttempt?: number;
    values: ReviewedValues;
    confirmed: true;
  },
): Promise<PurchaseSeed> {
  if (
    !review.messageId ||
    review.messageId.length > 500 ||
    (review.extractionAttempt !== undefined &&
      (!Number.isSafeInteger(review.extractionAttempt) ||
        review.extractionAttempt < 1 ||
        review.extractionAttempt > 2)) ||
    extractionFields.some((key) => review.values[key].length > 120)
  )
    throw new ConvexError("Invalid reply review.");
  const request = await ctx.db.get(review.requestId);
  if (!request || request.ownerHash !== owner)
    throw new ConvexError("Request unavailable in this session.");
  const reply = await ctx.db
    .query("quotationReplies")
    .withIndex("by_messageId", (q) => q.eq("messageId", review.messageId))
    .unique();
  if (!reply || reply.requestId !== request._id)
    throw new ConvexError("Reply not linked to this request.");
  let proposal: typeof emptyReplyProposal | undefined;
  if (review.extractionAttempt !== undefined) {
    if (
      reply.extractionStatus !== "complete" ||
      !reply.extraction ||
      reply.extractionAttempt !== review.extractionAttempt
    )
      throw new ConvexError(
        "The AI proposal changed or is incomplete. Open the reply again before confirming.",
      );
    proposal = reply.extraction;
  }
  try {
    return prepareReplyOffer(
      {
        requestId: request._id,
        messageId: reply.messageId,
        text: reply.text,
        receivedAt: reply.receivedAt,
        simulated: request.simulated ?? false,
      },
      review.values,
      review.confirmed,
      proposal,
      review.extractionAttempt,
    );
  } catch (error) {
    throw new ConvexError(
      error instanceof Error
        ? error.message
        : "Invalid reply review.",
    );
  }
}

function publicComparison(doc: Doc<"comparisons">) {
  const {
    _id: id,
    request,
    offers,
    sources,
    selectedOfferId,
    revision,
    updatedAt,
  } = doc;
  return { id, request, offers, sources, selectedOfferId, revision, updatedAt };
}
// Demo accepts fixture identities or confirmed reviews of owned public web sources.
// Source text never comes from the caller; snapshots survive later fixture changes.
function validateScenario(
  request: ProcurementRequest,
  offers: SupplierOffer[],
  previous?: Doc<"comparisons"> | null,
  createdBaseline?: PurchaseSeed,
) {
  if (
    !offers.length ||
    offers.length > 4 ||
    new Set(offers.map((o) => o.id)).size !== offers.length
  )
    throw new ConvexError(
      "Select between one and four distinct sample offers.",
    );
  const exampleContext = findMarketExampleContextByIds(
    offers.map((offer) => offer.id),
  );
  const catalog = exampleContext
    ? preparePurchaseFromCatalog(exampleContext.results, true)
    : preparePurchaseFromCatalog(marketExamples, true);
  const rice: PurchaseSeed = {
    request: riceRequest,
    offers: riceOffers,
    sources: Object.fromEntries(
      riceOffers.map((o) => [
        o.id,
        {
          label: "Sample quote",
          date: "2026-09-07",
          original: { ...o },
          edited: false,
        },
      ]),
    ),
  };
  const baseline: PurchaseSeed = previous
    ? {
        request: previous.request,
        offers: Object.values(previous.sources).map(
          (source) => source.original,
        ),
        sources: previous.sources,
      }
    : createdBaseline
      ? createdBaseline
      : offers.every((o) => riceOffers.some((b) => b.id === o.id))
        ? rice
        : catalog;
  if (
    request.ingredient !== baseline.request.ingredient ||
    request.specification !== baseline.request.specification ||
    request.unit !== baseline.request.unit
  )
    throw new ConvexError(
      "The comparison identity must match the sample or confirmed review.",
    );
  if (
    !Number.isFinite(request.quantity) ||
    request.quantity < 0 ||
    request.quantity > 1_000_000
  )
    throw new ConvexError("Quantity is outside the supported range.");
  for (const offer of offers) {
    const original = baseline.offers.find((o) => o.id === offer.id);
    if (
      !original ||
      ["supplier", "ingredient", "specification"].some(
        (key) =>
          offer[key as keyof SupplierOffer] !==
          original[key as keyof SupplierOffer],
      )
    )
      throw new ConvexError(
        "The offer must match its sample or confirmed review; private entries remain in this tab.",
      );
    for (const key of [
      "priceCents",
      "freightCents",
      "minimumPackages",
      "packageContent",
    ] as const) {
      const value = offer[key];
      if (
        value !== null &&
        (!Number.isFinite(value) ||
          value < 0 ||
          value > 100_000_000 ||
          (key !== "packageContent" && !Number.isSafeInteger(value)) ||
          ((key === "minimumPackages" || key === "packageContent") &&
            value === 0))
      )
        throw new ConvexError("Conditions are outside the supported range.");
    }
  }
  return Object.fromEntries(
    offers.map((offer) => [
      offer.id,
      {
        ...baseline.sources[offer.id],
        edited: !sameFields(offer, baseline.sources[offer.id].original),
      },
    ]),
  );
}
export const list = query({
  args: { token: v.string() },
  returns: v.array(savedComparisonValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const docs = await ctx.db
      .query("comparisons")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    return docs.map(publicComparison).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
export const save = mutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    id: v.union(v.id("comparisons"), v.null()),
    expectedRevision: v.number(),
    request: procurementRequestValidator,
    offers: v.array(supplierOfferValidator),
    selectedOfferId: v.union(v.string(), v.null()),
    webReviews: v.optional(v.array(webReviewInputValidator)),
    documentReview: v.optional(documentReviewInputValidator),
    replyReview: v.optional(replyReviewInputValidator),
    appendReplies: v.optional(
      v.array(
        v.object({
          review: replyReviewInputValidator,
          equivalent: v.literal(true),
        }),
      ),
    ),
  },
  returns: savedComparisonValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        args.clientId,
      ) ||
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision < 0
    )
      throw new ConvexError("Invalid request.");
    const previous = args.id ? await ctx.db.get("comparisons", args.id) : null;
    if (args.id && (!previous || previous.ownerHash !== hash))
      throw new ConvexError("Comparison unavailable in this session.");
    if (previous && previous.revision !== args.expectedRevision)
      throw new ConvexError(
        "The comparison changed in another view. Open it from Saved comparisons before updating.",
      );
    if (
      [args.documentReview, args.webReviews, args.replyReview].filter(Boolean)
        .length > 1
    )
      throw new ConvexError(
        "Do not mix web, document, and reply references in this request.",
      );
    const createdBaseline =
      !previous && args.webReviews
        ? await reconstructWebReviews(ctx, hash, args.webReviews)
        : !previous && args.documentReview
          ? await reconstructDocumentReview(ctx, hash, args.documentReview)
          : !previous && args.replyReview
            ? await reconstructReply(ctx, hash, args.replyReview)
            : undefined;
    let validatedPrevious = previous;
    if (args.appendReplies !== undefined) {
      if (
        !previous ||
        args.webReviews ||
        args.documentReview ||
        args.replyReview ||
        args.appendReplies.length < 1 ||
        args.appendReplies.length > 3
      )
        throw new ConvexError(
          "Add replies only to a saved comparison.",
        );
      let baseline: PurchaseSeed = {
        request: previous.request,
        offers: previous.offers,
        sources: previous.sources,
      };
      for (const addition of args.appendReplies) {
        const incoming = await reconstructReply(ctx, hash, addition.review);
        try {
          baseline = mergeReplyOffer(baseline, incoming, addition.equivalent);
        } catch (error) {
          throw new ConvexError(
            error instanceof Error ? error.message : "Invalid equivalence.",
          );
        }
        if (!args.offers.some((offer) => offer.id === incoming.offers[0].id))
          throw new ConvexError(
            "The added offer must be in the comparison.",
          );
      }
      if (args.selectedOfferId !== null)
        throw new ConvexError(
          "Select an offer again after saving the new offers.",
        );
      validatedPrevious = { ...previous, sources: baseline.sources };
    }
    const sources = validateScenario(
      args.request,
      args.offers,
      validatedPrevious,
      createdBaseline,
    );
    if (args.selectedOfferId !== null) {
      const chosen = args.offers.find((o) => o.id === args.selectedOfferId);
      if (!chosen || !evaluateOffer(args.request, chosen).eligibleForComparison)
        throw new ConvexError(
          "Complete the quantity and conditions before selecting this offer.",
        );
    }
    const content = {
      request: args.request,
      offers: args.offers,
      selectedOfferId: args.selectedOfferId,
    };
    if (previous && args.id) {
      // Removed offers retain their bounded source history for later restoration.
      const preservedSources = { ...previous.sources, ...sources };
      await ctx.db.patch("comparisons", args.id, {
        ...content,
        sources: preservedSources,
        revision: previous.revision + 1,
        updatedAt: Date.now(),
      });
      return publicComparison((await ctx.db.get("comparisons", args.id))!);
    }
    if (args.expectedRevision !== 0)
      throw new ConvexError("Invalid review.");
    const existing = await ctx.db
      .query("comparisons")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        !sameFields(content.request, existing.request) ||
        content.selectedOfferId !== existing.selectedOfferId ||
        content.offers.length !== existing.offers.length ||
        content.offers.some(
          (offer, index) => !sameFields(offer, existing.offers[index]),
        ) ||
        ((args.webReviews !== undefined ||
          args.documentReview !== undefined ||
          args.replyReview !== undefined) &&
          !sameValue(sources, existing.sources))
      )
        throw new ConvexError(
          "This request was already saved with different data. Open the saved comparison before updating.",
        );
      return publicComparison(existing);
    }
    const own = await ctx.db
      .query("comparisons")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    if (own.length >= 10)
      throw new ConvexError("This session supports up to 10 comparisons.");
    const global = await ctx.db
      .query("comparisons")
      .withIndex("by_creation_time")
      .take(500);
    if (global.length >= 500)
      throw new ConvexError("The demo capacity has been reached.");
    const id = await ctx.db.insert("comparisons", {
      ...content,
      sources,
      ownerHash: hash,
      clientId: args.clientId,
      revision: 1,
      updatedAt: Date.now(),
    });
    return publicComparison((await ctx.db.get("comparisons", id))!);
  },
});

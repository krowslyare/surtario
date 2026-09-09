import { prepareReplyOffer } from "../src/domain/replyReview";
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
import { riceOffers, riceRequest } from "../fixtures/procurement";
import { marketExamples } from "../fixtures/market";
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

type WebReview = {
  runId: Doc<"researchRuns">["_id"];
  sourceIndex: number;
  values: ReviewedValues;
  confirmed: true;
};

async function reconstructWebReviews(
  ctx: MutationCtx,
  owner: string,
  reviews: WebReview[],
): Promise<PurchaseSeed> {
  if (!reviews.length || reviews.length > 3)
    throw new ConvexError("Selecciona entre una y tres fuentes web revisadas.");
  const refs = new Set<string>();
  const seeds: PurchaseSeed[] = [];
  for (const review of reviews) {
    if (
      !Number.isSafeInteger(review.sourceIndex) ||
      review.sourceIndex < 0 ||
      extractionFields.some((key) => review.values[key].length > 120)
    )
      throw new ConvexError("Revisión web no válida.");
    const ref = `${review.runId}:${review.sourceIndex}`;
    if (refs.has(ref))
      throw new ConvexError("Una misma fuente no puede aparecer dos veces.");
    refs.add(ref);
    const run = await ctx.db.get("researchRuns", review.runId);
    if (!run || run.ownerHash !== owner)
      throw new ConvexError("Búsqueda no disponible en esta sesión.");
    if (run.status !== "complete")
      throw new ConvexError("La búsqueda todavía no está completa.");
    const source = run.sources[review.sourceIndex];
    if (!source) throw new ConvexError("Fuente no válida.");
    if (
      source.extractionStatus !== "complete" ||
      !source.extraction ||
      !source.markdown
    )
      throw new ConvexError("La extracción de esta fuente no está completa.");
    try {
      const seed = extractionToPurchase(
        {
          id: ref,
          url: source.url,
          title: source.title,
          text: source.markdown,
          observedAt: run.observedAt,
          simulated: false,
        },
        source.extraction,
        review.values,
        review.confirmed,
      );
      seed.sources[ref].webReview = { ...review };
      seeds.push(seed);
    } catch (error) {
      throw new ConvexError(
        error instanceof Error ? error.message : "Revisión web no válida.",
      );
    }
  }
  try {
    return combineReviewedOffers(seeds, true);
  } catch (error) {
    throw new ConvexError(
      error instanceof Error ? error.message : "Revisión web no válida.",
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
    throw new ConvexError("Revisión documental no válida.");
  const run = await ctx.db.get("documentRuns", review.runId);
  if (!run || run.ownerHash !== owner)
    throw new ConvexError("Documento no disponible en esta sesión.");
  if (
    run.status !== "complete" ||
    !run.result ||
    run.result.documentType !== "quotation"
  )
    throw new ConvexError("Se necesita una lectura completa de cotización.");
  try {
    const seed = extractionToPurchase(
      {
        id: run._id,
        title: `Transcripción automática · cotización sintética · ${run.kind}`,
        text: run.result.transcript,
        observedAt: new Date(run.createdAt).toISOString().slice(0, 10),
        simulated: false,
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
      error instanceof Error ? error.message : "Revisión documental no válida.",
    );
  }
}

async function reconstructReply(
  ctx: MutationCtx,
  owner: string,
  review: {
    requestId: Doc<"quotationRequests">["_id"];
    messageId: string;
    values: ReviewedValues;
    confirmed: true;
  },
): Promise<PurchaseSeed> {
  if (
    !review.messageId ||
    review.messageId.length > 500 ||
    extractionFields.some((key) => review.values[key].length > 120)
  )
    throw new ConvexError("Revisión de respuesta no válida.");
  const request = await ctx.db.get(review.requestId);
  if (!request || request.ownerHash !== owner)
    throw new ConvexError("Solicitud no disponible en esta sesión.");
  const reply = await ctx.db
    .query("quotationReplies")
    .withIndex("by_messageId", (q) => q.eq("messageId", review.messageId))
    .unique();
  if (!reply || reply.requestId !== request._id)
    throw new ConvexError("Respuesta no vinculada a esta solicitud.");
  try {
    return prepareReplyOffer(
      {
        requestId: request._id,
        messageId: reply.messageId,
        text: reply.text,
        receivedAt: reply.receivedAt,
      },
      review.values,
      review.confirmed,
    );
  } catch (error) {
    throw new ConvexError(
      error instanceof Error
        ? error.message
        : "Revisión de respuesta no válida.",
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
      "Selecciona entre una y cuatro ofertas de ejemplo distintas.",
    );
  const catalog = preparePurchaseFromCatalog(marketExamples, true);
  const rice: PurchaseSeed = {
    request: riceRequest,
    offers: riceOffers,
    sources: Object.fromEntries(
      riceOffers.map((o) => [
        o.id,
        {
          label: "Cotización de ejemplo",
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
      "La identidad de la comparación debe coincidir con el ejemplo o la revisión confirmada.",
    );
  if (
    !Number.isFinite(request.quantity) ||
    request.quantity < 0 ||
    request.quantity > 1_000_000
  )
    throw new ConvexError("Cantidad fuera del rango de la demo.");
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
        "La oferta debe coincidir con su ejemplo o revisión confirmada; las entradas privadas siguen en esta pestaña.",
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
        throw new ConvexError("Condiciones fuera del rango de la demo.");
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
      throw new ConvexError("Solicitud no válida.");
    const previous = args.id ? await ctx.db.get("comparisons", args.id) : null;
    if (args.id && (!previous || previous.ownerHash !== hash))
      throw new ConvexError("Comparación no disponible en esta sesión.");
    if (previous && previous.revision !== args.expectedRevision)
      throw new ConvexError(
        "La comparación cambió en otra vista. Ábrela desde Comparaciones guardadas antes de actualizar.",
      );
    if (
      [args.documentReview, args.webReviews, args.replyReview].filter(Boolean)
        .length > 1
    )
      throw new ConvexError(
        "No mezcles referencias web, documentales y de respuesta en esta solicitud.",
      );
    const createdBaseline =
      !previous && args.webReviews
        ? await reconstructWebReviews(ctx, hash, args.webReviews)
        : !previous && args.documentReview
          ? await reconstructDocumentReview(ctx, hash, args.documentReview)
          : !previous && args.replyReview
            ? await reconstructReply(ctx, hash, args.replyReview)
            : undefined;
    const sources = validateScenario(
      args.request,
      args.offers,
      previous,
      createdBaseline,
    );
    if (args.selectedOfferId !== null) {
      const chosen = args.offers.find((o) => o.id === args.selectedOfferId);
      if (!chosen || !evaluateOffer(args.request, chosen).eligibleForComparison)
        throw new ConvexError(
          "Completa cantidad y condiciones antes de elegir esta oferta.",
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
      throw new ConvexError("Revisión no válida.");
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
          "La solicitud ya se guardó con otros datos. Abre la comparación guardada antes de actualizar.",
        );
      return publicComparison(existing);
    }
    const own = await ctx.db
      .query("comparisons")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(10);
    if (own.length >= 10)
      throw new ConvexError("Esta sesión admite hasta 10 comparaciones.");
    const global = await ctx.db
      .query("comparisons")
      .withIndex("by_creation_time")
      .take(500);
    if (global.length >= 500)
      throw new ConvexError("Se alcanzó la capacidad de la demo.");
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

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { savedComparisonValidator } from "./comparisonValidators";
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
  evaluateOffer,
  type SupplierOffer,
  type ProcurementRequest,
} from "../src/domain/procurement";

function sameFields<T extends object>(a: T, b: T) {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
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
// Anonymous demo accepts fixture identities and bounded scenario conditions only.
// Source text never comes from the caller; snapshots survive later fixture changes.
function validateScenario(
  request: ProcurementRequest,
  offers: SupplierOffer[],
  previous?: Doc<"comparisons"> | null,
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
    : offers.every((o) => riceOffers.some((b) => b.id === o.id))
      ? rice
      : catalog;
  if (
    request.ingredient !== baseline.request.ingredient ||
    request.specification !== baseline.request.specification ||
    request.unit !== baseline.request.unit
  )
    throw new ConvexError(
      "Solo se guardan comparaciones de los ejemplos de arroz, sin textos privados.",
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
        "Solo se guardan ofertas de los ejemplos; las entradas privadas siguen en esta pestaña.",
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
    const sources = validateScenario(args.request, args.offers, previous);
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
        )
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

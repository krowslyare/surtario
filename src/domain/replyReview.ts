import {
  extractionFields,
  extractionToPurchase,
  type ExtractedOffer,
  type ReviewedValues,
} from "./extraction";
export const emptyReplyProposal = Object.fromEntries(
  extractionFields.map((key) => [key, { value: null, evidence: null }]),
) as ExtractedOffer;

function normalizedObservedAt(receivedAt: string) {
  const received = new Date(receivedAt);
  if (Number.isFinite(received.getTime())) return received.toISOString();
  return "";
}

export function prepareReplyOffer(
  reply: {
    requestId: string;
    messageId: string;
    text: string;
    receivedAt: string;
    simulated?: boolean;
  },
  values: ReviewedValues,
  confirmed: boolean,
) {
  const id = `reply:${reply.requestId}:${reply.messageId}`;
  const seed = extractionToPurchase(
    {
      id,
      title: "Respuesta de cotización · revisión manual",
      text: reply.text,
      observedAt: normalizedObservedAt(reply.receivedAt),
      simulated: reply.simulated ?? false,
    },
    emptyReplyProposal,
    values,
    confirmed,
  );
  seed.sources[id].replyReview = {
    requestId: reply.requestId,
    messageId: reply.messageId,
    values: { ...values },
    confirmed: true,
  };
  return seed;
}

/** Exact identity and explicit human equivalence; never infer substitutions. */
export function mergeReplyOffer(
  current: import("./market").PurchaseSeed,
  incoming: import("./market").PurchaseSeed,
  equivalent: boolean,
) {
  if (!equivalent)
    throw new Error(
      "Confirma que la oferta corresponde al mismo insumo y especificación.",
    );
  if (
    incoming.offers.length !== 1 ||
    !incoming.sources[incoming.offers[0].id]?.replyReview
  )
    throw new Error("Selecciona una oferta revisada de respuesta.");
  if (
    current.request.ingredient !== incoming.request.ingredient ||
    current.request.specification !== incoming.request.specification ||
    current.request.unit !== incoming.request.unit
  )
    throw new Error(
      "Insumo, especificación y unidad base deben coincidir con la comparación.",
    );
  const offer = incoming.offers[0];
  if (current.offers.some((item) => item.currency !== offer.currency))
    throw new Error(
      "Confirma la misma moneda para comparar; no se convierten monedas automáticamente.",
    );
  if (current.sources[offer.id])
    throw new Error("Esta respuesta ya pertenece a la comparación.");
  if (current.offers.length >= 4 || Object.keys(current.sources).length >= 4)
    throw new Error(
      "La comparación admite hasta cuatro fuentes, incluidas las retiradas.",
    );
  return {
    request: { ...current.request },
    offers: [...current.offers, offer],
    sources: { ...current.sources, ...incoming.sources },
  };
}

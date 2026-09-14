import {
  extractionFields,
  extractionToPurchase,
  type ExtractedOffer,
  type ReviewedValues,
} from "./extraction";
export const emptyReplyProposal = Object.fromEntries(
  extractionFields.map((key) => [key, { value: null, evidence: null }]),
) as ExtractedOffer;

export type ReplyExtractionSnapshot = {
  extraction: ExtractedOffer | null;
  extractionStatus: "idle" | "running" | "complete" | "failed";
  extractionError: string | null;
  extractionAttempts: number;
  extractionAttempt: number | null;
};

const extractionStatusOrder: Record<
  ReplyExtractionSnapshot["extractionStatus"],
  number
> = { idle: 0, running: 1, failed: 2, complete: 3 };

export function reconcileReplyExtraction(
  current: ReplyExtractionSnapshot,
  incoming: ReplyExtractionSnapshot,
  editGeneration: number,
  values: ReviewedValues,
) {
  const newer =
    incoming.extractionAttempts > current.extractionAttempts ||
    (incoming.extractionAttempts === current.extractionAttempts &&
      extractionStatusOrder[incoming.extractionStatus] >
        extractionStatusOrder[current.extractionStatus]);
  if (!newer) return { kind: "ignore" as const };
  if (
    incoming.extractionStatus !== "complete" ||
    !incoming.extraction ||
    incoming.extractionAttempt === null
  )
    return { kind: "status" as const, snapshot: incoming };
  return {
    kind: canAutoApplyReplySuggestion(0, editGeneration, values)
      ? ("apply" as const)
      : ("pending" as const),
    snapshot: incoming,
    suggestion: {
      proposal: incoming.extraction,
      attempt: incoming.extractionAttempt,
    },
  };
}

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
  proposal: ExtractedOffer = emptyReplyProposal,
  extractionAttempt?: number,
) {
  const id = `reply:${reply.requestId}:${reply.messageId}`;
  if (
    extractionAttempt !== undefined &&
    (!Number.isSafeInteger(extractionAttempt) ||
      extractionAttempt < 1 ||
      extractionAttempt > 2)
  )
    throw new Error("The AI proposal is invalid.");
  const assisted = extractionAttempt !== undefined;
  const reviewedProposal = assisted ? proposal : emptyReplyProposal;
  const seed = extractionToPurchase(
    {
      id,
      title: `Quote reply · ${assisted ? "AI-assisted" : "manual"} review`,
      text: reply.text,
      observedAt: normalizedObservedAt(reply.receivedAt),
      simulated: reply.simulated ?? false,
    },
    reviewedProposal,
    values,
    confirmed,
  );
  seed.sources[id].replyReview = {
    requestId: reply.requestId,
    messageId: reply.messageId,
    ...(assisted ? { extractionAttempt } : {}),
    values: { ...values },
    confirmed: true,
  };
  return seed;
}

export function canAutoApplyReplySuggestion(
  startedEditGeneration: number,
  currentEditGeneration: number,
  values: ReviewedValues,
) {
  return (
    startedEditGeneration === currentEditGeneration &&
    extractionFields.every((key) => values[key] === "")
  );
}

/** Exact identity and explicit human equivalence; never infer substitutions. */
export function mergeReplyOffer(
  current: import("./market").PurchaseSeed,
  incoming: import("./market").PurchaseSeed,
  equivalent: boolean,
) {
  if (!equivalent)
    throw new Error(
      "Confirm that the offer matches the same ingredient and specification.",
    );
  if (
    incoming.offers.length !== 1 ||
    !incoming.sources[incoming.offers[0].id]?.replyReview
  )
    throw new Error("Select a reviewed reply offer.");
  if (
    current.request.ingredient !== incoming.request.ingredient ||
    current.request.specification !== incoming.request.specification ||
    current.request.unit !== incoming.request.unit
  )
    throw new Error(
      "Ingredient, specification, and base unit must match the comparison.",
    );
  const offer = incoming.offers[0];
  if (current.offers.some((item) => item.currency !== offer.currency))
    throw new Error(
      "Confirm the same currency before comparing; currencies are not converted automatically.",
    );
  if (current.sources[offer.id])
    throw new Error("This reply is already part of the comparison.");
  if (current.offers.length >= 4 || Object.keys(current.sources).length >= 4)
    throw new Error(
      "The comparison supports up to four sources, including removed sources.",
    );
  return {
    request: { ...current.request },
    offers: [...current.offers, offer],
    sources: { ...current.sources, ...incoming.sources },
  };
}

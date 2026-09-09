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
      simulated: false,
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

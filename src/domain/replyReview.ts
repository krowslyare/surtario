import {
  extractionFields,
  extractionToPurchase,
  type ExtractedOffer,
  type ReviewedValues,
} from "./extraction";
export const emptyReplyProposal = Object.fromEntries(
  extractionFields.map((key) => [key, { value: null, evidence: null }]),
) as ExtractedOffer;
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
      observedAt: reply.receivedAt,
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

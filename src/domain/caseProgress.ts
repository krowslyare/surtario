import { mailAttention } from "./workStatus";
/** Presentation derived from persisted facts. Research completion is not purchase readiness. */
export type CaseProgressInput = {
  status: string;
  liveEnabled: boolean;
  hasComparison: boolean;
  hasEvidence: boolean;
  blocker?: string | null;
  watches: { status: string; lastOutcome: string }[];
  requests: { id: string; state: string; replies: { messageId: string }[] }[];
  reviewedReplyIds: string[];
};
export function caseProgress(input: CaseProgressInput) {
  const mail = mailAttention(input.requests, input.reviewedReplyIds);
  if (mail) return { ...mail, target: "mail" as const };
  if (input.blocker) return {
    title: "Comparison needs confirmation", description: input.blocker,
    action: "Review comparison", target: "comparison" as const,
  };
  if (input.hasEvidence)
    return {
      title: "Research findings to review",
      description:
        "Check the sources and extracted data. Only confirmed, equivalent offers belong in your comparison.",
      action: "Review findings",
      target: "evidence",
    } as const;
  if (input.status === "running")
    return {
      title: "Research is in progress",
      description:
        "The agent is looking for evidence and deciding what to read next. You can leave this page and return to the saved case.",
      action: null,
      target: "wait",
    } as const;
  const sending = input.requests.find((request) => request.state === "sending");
  if (sending)
    return {
      title: "Sending your approved message",
      description:
        "The send result will appear here. Do not start another send while this one is unresolved.",
      action: "View message",
      target: "mail",
      requestId: sending.id,
    } as const;
  const waiting = input.requests.find(
    (request) => request.state === "sent" && request.replies.length === 0,
  );
  if (waiting)
    return {
      title: "Waiting for the supplier",
      description:
        "Your message was sent. A reply may take hours or days; you can close this page and return later. The case will keep its history.",
      action: "View sent message",
      target: "mail",
      requestId: waiting.id,
    } as const;
  if (
    input.watches.some(
      (watch) =>
        watch.lastOutcome === "unverified" &&
        ["active", "checking"].includes(watch.status),
    )
  )
    return {
      title: "A source could not be verified",
      description:
        "No price change was inferred. Check the latest observation; your confirmed comparison is preserved.",
      action: "Check source observation",
      target: "watch",
    } as const;
  if (input.hasComparison)
    return {
      title: "Continue your comparison",
      description:
        "Review quantities and unresolved commercial terms, then refresh the decision. Saving a comparison does not place an order.",
      action: "Open case comparison",
      target: "comparison",
    } as const;
  if (input.status === "failed" || input.status === "canceled")
    return {
      title:
        input.status === "failed"
          ? "Research needs attention"
          : "Research was stopped",
      description:
        "Earlier findings are preserved. Review the recorded outcome before choosing whether to investigate again.",
      action: "Review case history",
      target: "history",
    } as const;
  if (!input.liveEnabled)
    return {
      title: "Your question is saved",
      description:
        "Assisted research is unavailable in this environment. You can still return to the case and link a saved study.",
      action: null,
      target: "wait",
    } as const;
  return {
    title:
      input.status === "complete"
        ? "Research finished"
        : "Ready to investigate",
    description:
      input.status === "complete"
        ? "No new reviewable evidence is available. You can refine your research or return to the saved history."
        : "Investigate this ingredient and location. The agent will preserve its sources and stop within the research limit.",
    action: "Investigate this question",
    target: "research",
  } as const;
}

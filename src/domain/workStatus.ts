/** One ordering policy for the workspace, conversations and case next steps. */
export type WorkMail = {
  id: string;
  state: string;
  updatedAt?: number;
  replies: { messageId: string; receivedAt?: string }[];
};
export const replyKey = (requestId: string, messageId: string) => `reply:${requestId}:${messageId}`;
export function pendingReplies(request: WorkMail, reviewed: readonly string[]) {
  return request.replies.filter(reply => !reviewed.includes(replyKey(request.id, reply.messageId)));
}
export function mailAttention(requests: WorkMail[], reviewed: readonly string[]) {
  const ordered = [...requests].sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0) || a.id.localeCompare(b.id));
  const uncertain = ordered.find(request => request.state === "uncertain" || request.state === "failed");
  if (uncertain) return {
    rank: 0, requestId: uncertain.id, title: "Check the message outcome", action: "Check message outcome",
    description: "Sending was not confirmed. Review the recorded outcome before taking another action; an uncertain send must not be repeated automatically.",
  };
  const reply = ordered.find(request => pendingReplies(request, reviewed).length);
  if (reply) return {
    rank: 1, requestId: reply.id, title: "A supplier replied", action: "Review supplier reply",
    description: "Review the reply and confirm its terms before updating your comparison.",
  };
  const draft = ordered.find(request => request.state === "draft");
  if (draft) return {
    rank: 2, requestId: draft.id, title: "Your message needs review", action: "Review saved message",
    description: "Check the recipient and saved message. Nothing is sent until you approve that version.",
  };
  return null;
}

export function workStatus(input: {
  requests: WorkMail[]; reviewedReplyIds: string[]; blocker: string | null;
  pendingEvidence: number; running: boolean; failed: boolean; hasComparison: boolean;
}) {
  const mail = mailAttention(input.requests, input.reviewedReplyIds);
  const waiting = input.requests.some(request => request.state === "sent" && request.replies.length === 0);
  const base = { waiting, researching: input.running };
  if (mail) return { ...base, ...mail, attention: true, target: "mail" as const };
  if (input.blocker) return { ...base, rank: 3, attention: true, target: "comparison" as const,
    title: "Comparison needs confirmation", description: input.blocker, action: "Review comparison" };
  if (input.pendingEvidence) return { ...base, rank: 4, attention: true, target: "evidence" as const,
    title: "Research findings to review", description: `${input.pendingEvidence} source${input.pendingEvidence === 1 ? " is" : "s are"} ready to review. Confirm the evidence before changing your study.`, action: "Review findings" };
  if (input.failed) return { ...base, rank: 5, attention: true, target: "research" as const,
    title: "Research interrupted", description: "Earlier findings are available. Review the outcome before trying again.", action: "Review research" };
  if (input.running) return { ...base, rank: 6, attention: false, target: "research" as const,
    title: "Research in progress", description: "New evidence appears here as research progresses.", action: "View progress" };
  const sending = input.requests.find(request => request.state === "sending");
  const sent = input.requests.find(request => request.state === "sent" && request.replies.length === 0);
  if (sending || sent) return { ...base, rank: 7, attention: false, target: "mail" as const, requestId: (sending ?? sent)!.id,
    title: sending ? "Sending your approved message" : "Waiting for supplier", description: sending ? "The send result is still pending." : "Your inquiry was sent. The reply will appear here.", action: "Open conversation" };
  return { ...base, rank: 8, attention: false, target: "work" as const,
    title: input.hasComparison ? "Comparison available" : "Ready to continue", description: "Your saved evidence is available whenever you need it.", action: input.hasComparison ? "Open comparison" : "Open saved work" };
}

/** An omitted extraction field is unresolved evidence, not a changed supplier term. */
export function hasObservedChanges(baseline: string, observation: string) {
  const saved = JSON.parse(baseline) as Record<string, string | null>;
  const current = JSON.parse(observation) as Record<string, string | null>;
  return Object.entries(current).some(([field, value]) => value !== null && value !== saved[field]);
}

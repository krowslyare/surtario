import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { readWorkspaceCheckpoint, writeWorkspaceCheckpoint } from "../workspaceCheckpoint";
import { useConvexConnectionState, useQueries, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, ChevronRight, Inbox, Mail } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { SavedQuotation } from "../../convex/quotationValidators";
import type { PurchaseSeed } from "../domain/market";
import { mergeReplyOffer } from "../domain/replyReview";
import { useDemoSession } from "./useDemoSession";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Dialog } from "./Dialog";
import QuotationMail from "./QuotationMail";
import type { SavedComparison } from "./SavedComparisons";
import "../styles/messages.css";

function useMailbox(token: string | null) {
  const args = token ? { token } : "skip";
  const requests = useQuery(api.quotationMail.list, args);
  const studies = useQuery(api.studies.list, args);
  const comparisons = useQuery(api.comparisons.list, args);
  const cases = useQuery(api.sourcing.list, args);
  const prospects = useQuery(api.prospects.list, args);
  const queries = useMemo(() => Object.fromEntries((token ? comparisons ?? [] : []).map(item => [
    item.id,
    { query: api.quotationMail.listDeliveryConfirmations, args: { token: token!, comparisonId: item.id } },
  ])), [token, comparisons]);
  const confirmations = useQueries(queries);
  const confirmationResults = Object.values(confirmations) as (FunctionReturnType<typeof api.quotationMail.listDeliveryConfirmations> | Error | undefined)[];
  const failed = confirmationResults.find(item => item instanceof Error);
  if (failed instanceof Error) throw failed;
  if (!requests || !studies || !comparisons || !cases || !prospects || confirmationResults.some(item => item === undefined)) return undefined;
  const reviewed = new Set([
    ...comparisons.flatMap(item => Object.values(item.sources ?? {})),
    ...studies.flatMap(item => (item.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources))),
  ].flatMap(source => source.replyReview ? [`${source.replyReview.requestId}:${source.replyReview.messageId}`] : []));
  for (const result of confirmationResults) {
    if (result && !(result instanceof Error)) for (const item of result) reviewed.add(`${item.requestId}:${item.messageId}`);
  }
  return requests.map(request => {
    const prospect = prospects.find(item => item.id === request.prospectId);
    const study = studies.find(item => item.id === request.studyId || (request.prospectId && item.prospects?.some(p => p.id === request.prospectId)));
    const linkedCase = cases.find(item => (request.comparisonId && item.comparisonId === request.comparisonId) || (study && item.studyId === study.id));
    const comparison = comparisons.find(item => item.id === (request.comparisonId ?? linkedCase?.comparisonId))
      ?? comparisons.find(item => Object.values(item.sources ?? {}).some(source => source.replyReview?.requestId === request.id));
    const result = study?.results.find(item => item.id === request.resultId);
    const targetOffer = comparison?.offers.find(item => item.id === request.decisionAction?.offerId);
    const supplier = prospect?.supplier ?? result?.supplier ?? targetOffer?.supplier
      ?? (request.comparisonId ? comparison?.offers.map(item => item.supplier).join(" / ") : undefined)
      ?? "Supplier inquiry";
    const ingredient = prospect?.ingredient ?? study?.term ?? comparison?.request.ingredient ?? linkedCase?.ingredient;
    const region = prospect?.region ?? study?.region ?? linkedCase?.region;
    const pendingReplies = request.replies.filter(reply => !reviewed.has(`${request.id}:${reply.messageId}`)).length;
    const latest = Math.max(request.updatedAt, ...request.replies.map(reply => Date.parse(reply.receivedAt)).filter(Number.isFinite));
    return { request, supplier, ingredient, region, linkedCase, comparison, pendingReplies, latest };
  }).sort((a, b) => b.latest - a.latest || a.request.id.localeCompare(b.request.id));
}

function statusLabel(request: SavedQuotation, pendingReplies: number) {
  if (pendingReplies) return pendingReplies === 1 ? "Reply to review" : `${pendingReplies} replies to review`;
  if (request.replies.length) return "Reply details saved";
  return { draft: "Draft · not sent", sent: "Sent · awaiting reply", sending: "Sending", uncertain: "Send unconfirmed", failed: "Send failed" }[request.state];
}

export function MessagesLink({ active, onClick }: { active?: boolean; onClick: () => void }) {
  return <MailboxBoundary fallback={<Button variant="text" onClick={onClick}><Mail size={18} />Messages</Button>}>
    <ConnectedMessagesLink active={active} onClick={onClick} />
  </MailboxBoundary>;
}

function ConnectedMessagesLink({ active, onClick }: { active?: boolean; onClick: () => void }) {
  const { token } = useDemoSession();
  const entries = useMailbox(token);
  const count = entries?.reduce((sum, entry) => sum + entry.pendingReplies, 0) ?? 0;
  return <Button variant="text" aria-current={active ? "page" : undefined} onClick={onClick}>
    <Mail size={18} aria-hidden="true" />Messages
    {count > 0 && <span className="messages-count"><span aria-hidden="true">{count}</span><span className="sr-only">{count} {count === 1 ? "reply" : "replies"} to review</span></span>}
  </Button>;
}

type Props = {
  requestId?: string;
  visit: number;
  onSelect: (id?: string) => void;
  onBack: () => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onOpenFollowup: (id: string, requestId?: string) => void;
};

export default function Messages(props: Props) {
  const { token, error } = useDemoSession();
  return <main id="messages-main" className="messages-main" tabIndex={-1}>
    <Button variant="text" onClick={props.onBack}><ArrowLeft size={16} />Back to workspace</Button>
    <header className="messages-heading">
      <h1 tabIndex={-1}>Messages</h1>
      <p>Your supplier inquiries and replies, across all your saved work.</p>
    </header>
    <MailboxBoundary fallback={<p role="alert">Messages couldn’t load. Check your connection and reopen Messages. Your saved work is unchanged.</p>}>
      {error ? <p role="alert">Site storage is unavailable. Messages belong to the browser where you prepared them.</p>
        : token ? <ConnectedMessages {...props} token={token} /> : <p role="status">Loading your messages…</p>}
    </MailboxBoundary>
  </main>;
}

function ConnectedMessages({ token, ...props }: Props & { token: string }) {
  const entries = useMailbox(token);
  const { isWebSocketConnected } = useConvexConnectionState();
  type MessageFilter = "all" | "replies" | "waiting" | "drafts";
  const [filter, setFilter] = useState<MessageFilter>(() => readWorkspaceCheckpoint<MessageFilter>("messagesFilter") ?? "all");
  useEffect(() => writeWorkspaceCheckpoint("messagesFilter", filter), [filter]);
  const [incoming, setIncoming] = useState<{ seed: PurchaseSeed; comparison: SavedComparison; caseId?: string } | null>(null);
  const [equivalent, setEquivalent] = useState(false);
  const [error, setError] = useState("");
  if (!entries) return <p role="status">Loading your messages…</p>;
  const selected = entries.find(item => item.request.id === props.requestId);
  const visible = entries.filter(({ request }) => filter === "all" || (filter === "replies" ? request.replies.length > 0 : filter === "drafts" ? request.state === "draft" : request.state === "sent" && !request.replies.length));
  const pending = entries.reduce((sum, item) => sum + item.pendingReplies, 0);
  function openComparison(comparison: SavedComparison, caseId?: string) {
    props.onPrepare({ ...comparison, sourcingCaseId: caseId, resumeComparison: { id: comparison.id, revision: comparison.revision, selectedOfferId: comparison.selectedOfferId, unchanged: true } });
  }
  function prepareReply(seed: PurchaseSeed) {
    if (selected?.comparison) {
      setIncoming({ seed, comparison: selected.comparison, caseId: selected.linkedCase?.id });
      setEquivalent(false);
      setError("");
    } else props.onPrepare({ ...seed, sourcingCaseId: selected?.linkedCase?.id });
  }
  return <>
    <div className="messages-toolbar">
      <SegmentedControl label="Filter messages" value={filter} onValueChange={setFilter} options={[
        { value: "all", label: `All (${entries.length})` },
        { value: "replies", label: `Replies (${entries.filter(item => item.request.replies.length).length})` },
        { value: "waiting", label: `Waiting (${entries.filter(item => item.request.state === "sent" && !item.request.replies.length).length})` },
        { value: "drafts", label: `Drafts (${entries.filter(item => item.request.state === "draft").length})` },
      ]} />
      <p className="messages-summary" role="status">{pending ? `${pending} ${pending === 1 ? "reply needs" : "replies need"} review` : `${entries.length} saved ${entries.length === 1 ? "conversation" : "conversations"}`}</p>
    </div>
    <p className="messages-guidance">Replies appear here automatically. Prices and terms change only after you review and save them.</p>
    {!isWebSocketConnected && <p className="notice info" role="status">Reconnecting. New replies will appear when the connection returns.</p>}
    {props.requestId && !selected && <p role="alert">This conversation isn’t available in this browser. Choose a message below.</p>}
    {visible.length ? <ul className="messages-list" aria-label="Supplier messages">
      {visible.map(({ request, supplier, ingredient, region, pendingReplies, latest }) => <li key={request.id}>
        <button className="message-row" onClick={() => props.onSelect(request.id)}>
          <span className="message-identity"><strong>{supplier}</strong><span>{request.subject}</span><small>{[ingredient, region].filter(Boolean).join(" · ")}</small><small>To: {request.recipient ?? "Recipient not configured"}</small></span>
          <span className="message-state"><strong className={pendingReplies ? "message-needs-review" : undefined}>{statusLabel(request, pendingReplies)}</strong><time dateTime={new Date(latest).toISOString()}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(latest)}</time></span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </li>)}
    </ul> : <div className="messages-empty">
      <Inbox size={28} aria-hidden="true" />
      <h2>{entries.length ? "No messages in this view" : "Your supplier conversations start here"}</h2>
      <p>{entries.length ? "Choose another filter to see your saved conversations." : "Choose Prepare inquiry on a supplier to draft your first message. Sent requests and incoming replies will stay together here."}</p>
      {!entries.length && <Button variant="secondary" onClick={props.onBack}>Explore suppliers</Button>}
    </div>}
    {selected && <QuotationMail
      key={`${selected.request.id}:${props.visit}`}
      initialRequestId={selected.request.id}
      dialogOnly
      comparisonId={selected.request.comparisonId ?? null}
      studyId={selected.request.studyId}
      prospectId={selected.request.prospectId}
      resultId={selected.request.resultId}
      conversationContext={<div className="message-context"><strong>{selected.supplier}</strong><span>{[selected.ingredient, selected.region].filter(Boolean).join(" · ")}</span></div>}
      conversationActions={<div className="message-context-actions">{selected.comparison && <Button variant="text" onClick={() => openComparison(selected.comparison!, selected.linkedCase?.id)}>Open linked comparison</Button>}{selected.linkedCase && <Button variant="text" onClick={() => props.onOpenFollowup(selected.linkedCase!.id, selected.request.id)}>Open supplier follow-up</Button>}</div>}
      onCloseConversation={() => props.onSelect()}
      offers={[]}
      onEditOffer={() => { if (selected.comparison) openComparison(selected.comparison, selected.linkedCase?.id); }}
      onPrepare={prepareReply}
      onAddReply={selected.comparison ? prepareReply : undefined}
      comparisonLabel={selected.comparison?.request.ingredient}
      deliveryComparison={selected.comparison}
      onDeliveryApplied={comparison => openComparison(comparison, selected.linkedCase?.id)}
      onOpenComparison={comparison => openComparison(comparison, selected.linkedCase?.id)}
    />}
    {incoming && <Dialog title="Update your comparison" onClose={() => { setIncoming(null); props.onSelect(); }}>
      <p>Add the reviewed reply to your saved comparison. Existing offers remain; unconfirmed delivery, tax and minimum terms stay pending.</p>
      <label className="checkbox"><input type="checkbox" checked={equivalent} onChange={event => setEquivalent(event.target.checked)} />I confirm the same ingredient, specification, unit and currency.</label>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="dialog-actions"><Button onClick={() => { setIncoming(null); props.onSelect(); }}>Keep reviewing</Button><Button variant="primary" disabled={!equivalent} onClick={() => {
        try {
          props.onPrepare({ ...mergeReplyOffer(incoming.comparison, incoming.seed, equivalent), sourcingCaseId: incoming.caseId, resumeComparison: { id: incoming.comparison.id, revision: incoming.comparison.revision } });
          setIncoming(null);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Review the reply details."); }
      }}>Review updated comparison</Button></div>
    </Dialog>}
  </>;
}

class MailboxBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

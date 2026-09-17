import { casePriority } from "../domain/casePriority";
import { evaluateOffer } from "../domain/procurement";
import { researchCoverage, RESEARCH_POLICY } from "../domain/researchCoverage";
import { Disclosure } from "./ui/Disclosure";
import { Component, useEffect, useState, type ReactNode } from "react";
import {
  useAction,
  useConvexConnectionState,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { Compass, History, Radar } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PurchaseSeed } from "../domain/market";
import type { StudyProspect, WebSelection } from "../domain/study";
import { ResearchWorkspace } from "./LiveResearch";
import { SaveWebProspect } from "./WebProspects";
import { Button } from "./ui/Button";
import { Dialog } from "./Dialog";
import QuotationMail from "./QuotationMail";
import { caseProgress } from "../domain/caseProgress";
import { mergeReplyOffer } from "../domain/replyReview";
import { mergeCaseEvidence } from "../domain/caseEvidence";
import "../styles/sourcing.css";

export type StudyCaseLink = {
  studyId: Id<"studies"> | null;
  caseId?: Id<"sourcingCases">;
  comparison?: import("./SavedComparisons").SavedComparison;
  ready: boolean;
};

type Props = {
  ingredient: string;
  region: string;
  studyId: Id<"studies"> | null;
  onPrepare: (seed: PurchaseSeed) => void;
  onReview: (selection: WebSelection) => void;
  onProspect: (prospect: StudyProspect) => void;
  selections: WebSelection[];
  onStudyCase?: (link: StudyCaseLink) => void;
  comparisonStudyId?: Id<"studies"> | null;
};

const eventTitles: Record<string, string> = {
  created: "Research question saved",
  delivery_confirmed: "Delivery confirmed from supplier reply",
  minimum_confirmed: "Minimum confirmed from supplier reply",
  study_linked: "Market study linked",
  comparison_saved: "Reviewed comparison saved",
  started: "Research started",
  canceled: "Research stopped",
  completed: "Research finished",
  failed: "Research interrupted",
  mail_draft: "Message prepared for your review",
  mail_draft_started: "AI is drafting a message",
  mail_draft_suggested: "AI draft ready for your review",
  mail_draft_failed: "AI drafting interrupted",
  mail_draft_revised: "Message edited — approval needed again",
  mail_approved: "Message approved; sending started",
  mail_sent: "Message sent",
  mail_reply: "Supplier reply received — terms to review",
  mail_extraction_started: "AI is reading the reply",
  mail_extracted: "Reply details ready for your review",
  mail_extraction_failed: "Reply needs manual review",
  mail_reviewed: "Reply confirmed as an offer",
  watch_started: "Source watch started",
  watch_stopped: "Source watch stopped",
  watch_unverified: "Source could not be verified",
  watch_expired: "Source watch finished",
};

function observationLabel(value: string) {
  try {
    const fields = JSON.parse(value) as Record<string, string | null>;
    return `${fields.currency?.toUpperCase() ?? "Currency pending"} ${fields.price ?? "price pending"} / ${fields.packageContent ?? "size pending"} ${fields.packageUnit ?? ""}`;
  } catch {
    return "Review source evidence";
  }
}
function date(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
function message(cause: unknown) {
  return cause instanceof ConvexError && typeof cause.data === "string"
    ? cause.data
    : "The action was not confirmed. Check your connection before trying again.";
}

export default function SourcingCase(props: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      let stored = localStorage.getItem("procurement-demo-session-v1");
      if (!stored || !/^[a-f0-9]{64}$/.test(stored)) {
        stored = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        localStorage.setItem("procurement-demo-session-v1", stored);
      }
      setToken(stored);
    } catch {
      setStorageError(true);
    }
  }, []);
  if (!token)
    return storageError ? (
      <p className="notice info">
        Research cases need site storage to keep your work recoverable.
      </p>
    ) : null;
  return (
    <CaseBoundary>
      <ConnectedCase {...props} token={token} />
    </CaseBoundary>
  );
}

function ConnectedCase({ token, ...props }: Props & { token: string }) {
  const cases = useQuery(api.sourcing.list, { token });
  const comparisons = useQuery(api.comparisons.list, { token });
  const comparisonStudyId =
    props.comparisonStudyId === undefined
      ? props.studyId
      : props.comparisonStudyId;
  useEffect(() => {
    const linked = comparisonStudyId
      ? cases?.find((item) => item.studyId === comparisonStudyId)
      : undefined;
    const comparison = linked?.comparisonId
      ? comparisons?.find((item) => item.id === linked.comparisonId)
      : undefined;
    props.onStudyCase?.({
      studyId: comparisonStudyId,
      caseId: linked?.id,
      comparison,
      ready:
        cases !== undefined &&
        (!linked?.comparisonId || comparison !== undefined),
    });
  }, [cases, comparisons, comparisonStudyId, props.onStudyCase]);
  const status = useQuery(api.sourcing.status, {});
  const create = useMutation(api.sourcing.create);
  const connection = useConvexConnectionState();
  const [activeId, setActiveId] = useState<Id<"sourcingCases"> | null>(null);
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const current = cases?.find((item) => item.id === activeId);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const connected = online && connection.isWebSocketConnected;

  async function openCase() {
    if (busy || !connected || !objective.trim()) return;
    setBusy(true);
    setError("");
    try {
      const id = await create({
        token,
        ...(props.studyId
          ? { studyId: props.studyId }
          : {
              ingredient: props.ingredient.trim(),
              region: props.region.trim(),
            }),
        objective: objective.trim(),
      });
      setActiveId(id);
      setExpanded(true);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sourcing-case" aria-labelledby="sourcing-title">
      <div className="sourcing-heading">
        <div>
          <Compass size={23} aria-hidden="true" />
          <h2 id="sourcing-title">Take the research further</h2>
        </div>
        <Button
          variant="text"
          aria-expanded={expanded}
          aria-controls="sourcing-body"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Close research case" : "Open research case"}
        </Button>
      </div>
      <p>
        Investigate beyond the first search. Follow evidence gaps and build a
        shortlist across research rounds.
      </p>
      {expanded && (
        <div id="sourcing-body">
          {!connected && (
            <p className="notice info" role="status">
              Reconnecting. Saved results remain visible; actions will be
              available when connected.
            </p>
          )}
          <Disclosure
            className="sourcing-switcher"
            key={`switcher:${current?.id ?? "new"}`}
            defaultOpen={!current}
            title={
              <>
                {current
                  ? "Switch case or save another question"
                  : "Your research questions"}
              </>
            }
          >
            <div className="sourcing-intake">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void openCase();
                }}
              >
                <h3>
                  {props.ingredient.trim()
                    ? `${props.ingredient} in ${props.region}`
                    : "Start with an ingredient and location"}
                </h3>
                <label className="field">
                  <span>What would you like to find out?</span>
                  <textarea
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    maxLength={500}
                    rows={2}
                    placeholder="Find comparable pack sizes and identify which delivery terms still need a quote."
                  />
                </label>
                <Button
                  type="submit"
                  variant="primary"
                  busy={busy}
                  busyLabel="Saving case…"
                  disabled={
                    !connected ||
                    !props.ingredient.trim() ||
                    !props.region.trim() ||
                    !objective.trim() ||
                    cases === undefined
                  }
                >
                  Save research question
                </Button>
                <p className="field-hint">
                  No document, quantity or purchase history required. Saving
                  does not make provider calls.
                </p>
              </form>
              <div className="sourcing-library">
                <h3>
                  <History size={18} aria-hidden="true" /> Your cases
                </h3>
                <p className="field-hint">Missing commercial terms first, then research needing attention and available evidence. This is a case worklist, not a basket-cost ranking.</p>
                {cases === undefined ? (
                  <p role="status">Loading saved cases…</p>
                ) : cases.length === 0 ? (
                  <p>
                    No cases yet. Save a question to keep its research and
                    updates together.
                  </p>
                ) : (
                  <ul>
                    {[...cases].sort((a,b) => casePriority(a, comparisons?.find(c => c.id === a.comparisonId)).rank - casePriority(b, comparisons?.find(c => c.id === b.comparisonId)).rank).map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="sourcing-case-link"
                          aria-pressed={item.id === activeId}
                          onClick={() => {
                            setActiveId(item.id);
                            setError("");
                          }}
                        >
                          <strong>{item.ingredient}</strong>
                          <span>{item.objective}</span>
                          <small>{comparisons === undefined ? "Checking next action…" : casePriority(item, comparisons.find(c => c.id === item.comparisonId)).reason}</small>
                          <span>{comparisons === undefined ? "" : casePriority(item, comparisons.find(c => c.id === item.comparisonId)).next}</span>
                          <small>
                            {item.region} ·{" "}
                            {item.status === "idle"
                              ? "Saved"
                              : item.status === "running"
                                ? "Researching"
                                : item.status === "complete"
                                  ? "Research finished"
                                  : item.status === "failed"
                                    ? "Needs attention"
                                    : "Research stopped"}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Disclosure>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {current && (
            <CaseDetail
              key={current.id}
              {...props}
              token={token}
              caseId={current.id}
              connected={connected}
              liveEnabled={Boolean(status?.enabled)}
              watchEnabled={Boolean(status?.watchEnabled)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function CaseDetail({
  token,
  caseId,
  connected,
  liveEnabled,
  watchEnabled,
  ...props
}: Props & {
  token: string;
  caseId: Id<"sourcingCases">;
  connected: boolean;
  liveEnabled: boolean;
  watchEnabled: boolean;
}) {
  const detail = useQuery(api.sourcing.get, { token, caseId });
  const runs = useQuery(api.sourcing.research, { token, caseId });
  const deliveryConfirmations = useQuery(
    api.quotationMail.listDeliveryConfirmations,
    detail?.case.comparisonId
      ? { token, comparisonId: detail.case.comparisonId }
      : "skip",
  );
  const researchStatus = useQuery(api.research.status, {});
  const comparisons = useQuery(api.comparisons.list, { token });
  const requests = useQuery(api.quotationMail.list, { token });
  const start = useMutation(api.sourcing.start);
  const cancel = useMutation(api.sourcing.cancel);
  const attach = useMutation(api.sourcing.attachStudy);
  const watch = useMutation(api.sourcing.watch);
  const stopWatch = useMutation(api.sourcing.stopWatch);
  const extract = useAction(api.research.extract);
  const read = useAction(api.research.readProduct);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const [incoming, setIncoming] = useState<PurchaseSeed | null>(null);
  const [equivalent, setEquivalent] = useState(false);
  const [mailId, setMailId] = useState<string | null>(null);
  const [mailVisit, setMailVisit] = useState(0);
  async function act(
    key: string,
    operation: () => Promise<unknown>,
    success: string,
  ) {
    if (pending || !connected) return;
    setPending(key);
    setError("");
    setNotice("");
    try {
      await operation();
      setNotice(success);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setPending(null);
    }
  }
  if (!detail) return <p role="status">Loading the case…</p>;
  const item = detail.case;
  if (!item)
    return (
      <p className="notice info">
        This case is no longer available in this session.
      </p>
    );
  const running = item.status === "running";
  const coverage = researchCoverage(runs ?? []);
  const stopLabels = {
    review_ready: "Candidates ready for review",
    diminishing_returns: "Further rounds added no new evidence",
    needs_confirmation: "Remaining conditions need confirmation",
    budget: "Research budget reached — coverage incomplete",
    failed: "Research interrupted",
  };
  const savedComparison = comparisons?.find(
    (comparison) => comparison.id === item.comparisonId,
  );
  const linkedRequests =
    requests?.filter(
      (request) =>
        (item.studyId && request.studyId === item.studyId) ||
        (item.comparisonId && request.comparisonId === item.comparisonId) ||
        detail.events.some(
          (event) =>
            event.sourceId === request.id && event.kind.startsWith("mail_"),
        ),
    ) ?? [];
  const selectedRequest = linkedRequests.find(
    (request) => request.id === mailId,
  );
  const reviewedIds = [
    ...Object.keys(savedComparison?.sources ?? {}),
    ...(deliveryConfirmations ?? []).map(
      (item) => `reply:${item.requestId}:${item.messageId}`,
    ),
  ];
  const hasEvidence =
    runs?.some((run) =>
      run.sources.some(
        (source, index) =>
          source.markdown &&
          source.analysis?.kind !== "irrelevant" &&
          !reviewedIds.includes(`${run.id}:${index}`) &&
          !props.selections.some(
            (selection) => selection.sourceId === `${run.id}:${index}`,
          ),
      ),
    ) ?? false;
  const progress = caseProgress({
    status: item.status,
    liveEnabled,
    hasComparison: Boolean(savedComparison),
    hasEvidence,
    watches: detail.watches,
    requests: linkedRequests,
    reviewedReplyIds: reviewedIds,
  });
  const progressLoaded =
    requests !== undefined &&
    runs !== undefined &&
    comparisons !== undefined &&
    (!detail.case.comparisonId || deliveryConfirmations !== undefined);
  const runsExhausted =
    detail.events.filter((event) => event.kind === "started").length >= 3;
  const openComparison = () => {
    if (savedComparison)
      props.onPrepare({
        ...savedComparison,
        resumeComparison: {
          id: savedComparison.id,
          revision: savedComparison.revision,
          selectedOfferId: savedComparison.selectedOfferId,
          unchanged: true,
        },
        sourcingCaseId: caseId,
      });
  };
  function focusSection(selector: string) {
    requestAnimationFrame(() => {
      const section = document.querySelector<HTMLElement>(selector);
      section?.scrollIntoView({ behavior: "auto", block: "start" });
      section?.focus({ preventScroll: true });
    });
  }
  function nextAction() {
    if (progress.target === "mail") {
      setMailId(progress.requestId);
      setMailVisit((value) => value + 1);
      focusSection(".sourcing-correspondence");
    } else if (progress.target === "evidence") {
      setReviewOpen(true);
      focusSection(".sourcing-reviews");
    } else if (progress.target === "comparison") openComparison();
    else if (progress.target === "watch") {
      setWatchOpen(true);
      focusSection(".sourcing-watches");
    } else if (progress.target === "history") setHistoryOpen(true);
    else if (progress.target === "research")
      void act(
        "start",
        () => start({ token, caseId }),
        "Research started. Return to this case for findings.",
      );
  }
  const disabled = !connected || Boolean(pending);
  const contextMatches =
    props.ingredient.trim().toLowerCase() ===
      item.ingredient.trim().toLowerCase() &&
    props.region.trim().toLowerCase() === item.region.trim().toLowerCase();
  return (
    <div className="sourcing-detail">
      {incoming && savedComparison && (
        <Dialog
          title="Update the case comparison"
          onClose={() => setIncoming(null)}
        >
          <p>
            Add this reviewed evidence to the saved comparison. An offer from
            the same source URL is replaced; its earlier evidence remains in
            history. New delivery, tax and minimum terms stay pending.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={equivalent}
              onChange={(event) => setEquivalent(event.target.checked)}
            />
            I confirm the same ingredient, specification, unit and currency.
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button onClick={() => setIncoming(null)}>Keep reviewing</Button>
            <Button
              variant="primary"
              disabled={!equivalent}
              onClick={() => {
                try {
                  props.onPrepare({
                    ...(incoming.offers.some(
                      (offer) => incoming.sources[offer.id]?.replyReview,
                    )
                      ? {
                          ...mergeReplyOffer(
                            savedComparison,
                            incoming,
                            equivalent,
                          ),
                          resumeComparison: {
                            id: savedComparison.id,
                            revision: savedComparison.revision,
                          },
                        }
                      : mergeCaseEvidence(
                          savedComparison,
                          incoming,
                          equivalent,
                        )),
                    sourcingCaseId: caseId,
                  });
                  setIncoming(null);
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Review the evidence.",
                  );
                }
              }}
            >
              Review updated comparison
            </Button>
          </div>
        </Dialog>
      )}
      <div className="sourcing-detail-heading">
        <div>
          <h3>{item.objective}</h3>
          <p>
            {item.ingredient} · {item.region}
          </p>
        </div>
        <span className="sourcing-state" role="status">
          {running
            ? "Researching"
            : item.status === "failed"
              ? "Research interrupted"
              : item.status === "canceled"
                ? "Research stopped"
                : "Saved case"}
        </span>
      </div>
      <section aria-label="Case decision brief" className="case-decision-brief">
        <h4>What we know</h4>
        <p>{runs === undefined || comparisons === undefined ? "Loading saved evidence and comparison…" : `${coverage.total} retained sources${savedComparison ? ` and a saved comparison of ${savedComparison.offers.length} offers` : "; no saved comparison yet"}.`}</p>
        <h4>What still needs confirmation</h4>
        <p>{savedComparison ? (() => {
          const pending = [...new Set(savedComparison.offers.flatMap(offer => evaluateOffer(savedComparison.request, offer).pending))];
          return pending.length ? pending.slice(0,3).join(" ") : "Review the recommendation using your current quantity and preferences.";
        })() : "Review source evidence, product equivalence and commercial terms before deciding."}</p>
      </section>
      <section
        className="sourcing-next"
        aria-label="Next step for this case"
        aria-live="polite"
      >
        <div>
          <p className="field-hint">Recommended next action</p>
          <h3>
            {!connected
              ? "You are offline"
              : progressLoaded
                ? progress.title
                : "Checking case updates…"}
          </h3>
          <p>
            {!connected
              ? "Reconnect to check for new replies and findings. The last saved case is shown below."
              : progressLoaded
                ? progress.description
                : "Loading messages, findings and the saved comparison."}
          </p>
          {progressLoaded && progress.action && (
            <Button
              variant="primary"
              disabled={
                disabled || (progress.target === "research" && runsExhausted)
              }
              onClick={nextAction}
            >
              {progress.action}
            </Button>
          )}
        </div>
      </section>
      <div className="sourcing-actions">
        {savedComparison && progress.target !== "comparison" && (
          <Button onClick={openComparison}>Open case comparison</Button>
        )}
        {progress.target !== "research" &&
          (liveEnabled || progress.title === "Your question is saved") && (
            <Button
              variant="secondary"
              busy={pending === "start"}
              busyLabel="Starting research…"
              disabled={disabled || running || !liveEnabled || runsExhausted}
              onClick={() =>
                void act(
                  "start",
                  () => start({ token, caseId }),
                  "Research started. You can close this view and return to the saved case.",
                )
              }
            >
              {running
                ? "Research in progress"
                : item.status === "complete"
                  ? "Continue research from these findings"
                  : "Investigate this question"}
            </Button>
          )}
        {running && (
          <Button
            disabled={disabled}
            onClick={() =>
              void act(
                "cancel",
                () => cancel({ token, caseId }),
                "Research canceled. Earlier evidence is preserved.",
              )
            }
          >
            Cancel research
          </Button>
        )}
        {props.studyId && contextMatches && item.studyId !== props.studyId && (
          <Button
            disabled={disabled || running}
            onClick={() =>
              void act(
                "attach",
                () => attach({ token, caseId, studyId: props.studyId! }),
                "This saved study is now linked to the case.",
              )
            }
          >
            Link current saved study
          </Button>
        )}
      </div>
      {(running || coverage.total > 0 || item.stopReason) && (
        <details className="sourcing-coverage" aria-label="Research coverage">
          <summary>{coverage.total} sources · {coverage.priceDomains} domains with prices — {item.stopReason === "budget" || item.stopReason === "diminishing_returns" ? "coverage incomplete" : "research details"}</summary>
          <div>
            <h3>
              {running
                ? `Research round ${Math.max(1, item.steps)} of up to ${RESEARCH_POLICY.maxRounds}`
                : item.stopReason
                  ? stopLabels[item.stopReason]
                  : "Collected research"}
            </h3>
            <p>{item.summary}</p>
            <p>
              {coverage.total} unique sources · {coverage.analyzed} interpreted
              · {coverage.priceDomains} independent domains with published
              prices.
            </p>
            <p className="field-hint">
              Sources are not approved offers. Delivery, equivalence and final
              cost still need review.
            </p>
            {coverage.shortlist.length > 0 && (
              <>
                <h4>Start with these sources</h4>
                <p className="field-hint">
                  Prioritized by product evidence and completeness, with one
                  source per domain. This is not a lowest-price ranking.
                </p>
                <ol>
                  {coverage.shortlist.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title}
                      </a>
                      <p>{source.analysis?.summary}</p>
                      {source.analysis?.warnings.length ? (
                        <details>
                          <summary>
                            Conditions to verify (
                            {source.analysis.warnings.length})
                          </summary>
                          <ul>
                            {source.analysis.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ol>

              </>
            )}
            <details>
              <summary>Remaining evidence gaps</summary>
              <ul>
                {coverage.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </details>
          </div>
        </details>
      )}
      {runsExhausted && (
        <p className="field-hint">
          This case has used its three research runs. You can still review
          findings, messages and your comparison.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="field-hint" role="status">
          {notice}
        </p>
      )}
      {linkedRequests.length > 0 && (
        <section
          className="sourcing-correspondence"
          tabIndex={-1}
          aria-label="Supplier conversations"
        >
          <Disclosure
            className="sourcing-disclosure"
            title={
              <>
                Supplier conversations{" "}
                <span>{linkedRequests.length} saved</span>
              </>
            }
          >
            <ul>
              {linkedRequests.map((request) => (
                <li key={request.id}>
                  <button
                    className="sourcing-case-link"
                    aria-pressed={mailId === request.id}
                    onClick={() => {
                      setMailId(request.id);
                      setMailVisit((value) => value + 1);
                    }}
                  >
                    <strong>{request.subject}</strong>
                    <span>
                      {request.replies.length
                        ? `${request.replies.length} replies received`
                        : request.state === "sent"
                          ? "Sent · waiting for reply"
                          : request.state === "draft"
                            ? "Draft · needs your approval"
                            : request.state === "uncertain"
                              ? "Send outcome uncertain"
                              : request.state === "sending"
                                ? "Sending approved message"
                                : "Send failed"}
                    </span>
                    <small>Updated {date(request.updatedAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </Disclosure>
          {selectedRequest && (
            <QuotationMail
              key={`${selectedRequest.id}:${mailVisit}`}
              initialRequestId={selectedRequest.id}
              comparisonId={selectedRequest.comparisonId ?? null}
              studyId={selectedRequest.studyId}
              prospectId={selectedRequest.prospectId}
              resultId={selectedRequest.resultId}
              offers={[]}
              deliveryComparison={savedComparison}
              onEditOffer={openComparison}
              onPrepare={(seed) => {
                if (savedComparison) {
                  setIncoming(seed);
                  setEquivalent(false);
                } else props.onPrepare({ ...seed, sourcingCaseId: caseId });
              }}
              onAddReply={
                savedComparison
                  ? (seed) => {
                      setIncoming(seed);
                      setEquivalent(false);
                    }
                  : undefined
              }
              comparisonLabel={
                savedComparison ? "this case comparison" : undefined
              }
            />
          )}
        </section>
      )}
      <div className="sourcing-activity">
        <div>
          <History size={20} aria-hidden="true" />
          <div>
            <strong>Every step, kept together</strong>
            <p>
              {detail.events[0]
                ? (eventTitles[detail.events[0].kind] ??
                  detail.events[0].summary)
                : "Your case history will appear here."}
            </p>
          </div>
        </div>
        <Button onClick={() => setHistoryOpen(true)}>View case history</Button>
      </div>
      {historyOpen && (
        <Dialog title="Case history" onClose={() => setHistoryOpen(false)} wide>
          <p>{item.objective}</p>
          <p className="field-hint">
            Latest first. Saved decisions, research and message updates stay
            here when you leave.
          </p>
          <section
            className="sourcing-history"
            tabIndex={-1}
            aria-label="Case history"
          >
            {item.summary && item.status !== "idle" && (
              <p className="sourcing-result">{item.summary}</p>
            )}
            <h3>How this case developed</h3>
            <ol>
              {detail.events.map((event) => (
                <li key={event.id}>
                  <time dateTime={new Date(event.createdAt).toISOString()}>
                    {date(event.createdAt)}
                  </time>
                  {eventTitles[event.kind] ? (
                    <>
                      <p className="sourcing-event-title">
                        {eventTitles[event.kind]}
                      </p>
                      <Disclosure
                        className="sourcing-event-details"
                        title={<>View details</>}
                      >
                        <p>{event.summary}</p>
                      </Disclosure>
                    </>
                  ) : (
                    <p>{event.summary}</p>
                  )}
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noreferrer">
                      View source
                    </a>
                  )}
                </li>
              ))}
            </ol>
            {detail.events.length === 0 && <p>No actions recorded yet.</p>}
          </section>
        </Dialog>
      )}
      <Disclosure
        className="sourcing-disclosure"
        open={watchOpen}
        onOpenChange={setWatchOpen}
        title={
          <>
            <Radar size={18} aria-hidden="true" /> Source watches{" "}
            <span>
              {
                detail.watches.filter((watch) =>
                  ["active", "checking"].includes(watch.status),
                ).length
              }{" "}
              active
            </span>
          </>
        }
      >
        <section
          className="sourcing-watches"
          tabIndex={-1}
          aria-label="Source watches"
        >
          <p>
            Get daily price checks for seven days. Review changes before
            updating your comparison.
          </p>
          {!item.studyId && (
            <p className="field-hint">
              Save and link a study to choose prices to track.
            </p>
          )}
          {item.studyId && detail.watchableSources.length === 0 && (
            <p className="field-hint">
              Add a product page with a confirmed price to start tracking. Demo
              examples and contacts without prices cannot be tracked.
            </p>
          )}
          {detail.watchableSources.length > 0 && !watchEnabled && (
            <p className="field-hint">
              Price tracking is unavailable in this demo. Your sources are
              saved.
            </p>
          )}
          {detail.watchableSources.map((source) => (
            <div className="sourcing-watch-option" key={source.resultId}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <Button
                disabled={
                  disabled ||
                  !watchEnabled ||
                  detail.watches.some(
                    (entry) => entry.resultId === source.resultId,
                  )
                }
                onClick={() =>
                  void act(
                    `watch:${source.resultId}`,
                    () => watch({ token, caseId, resultId: source.resultId }),
                    "Source watch saved. Its schedule and observations appear below.",
                  )
                }
              >
                Watch this source
              </Button>
            </div>
          ))}
          {detail.watches.map((entry) => (
            <div className="sourcing-watch" key={entry.id}>
              <strong>{entry.title}</strong>
              <p>
                Latest check:{" "}
                {entry.lastOutcome === "pending"
                  ? "Not checked yet"
                  : entry.lastOutcome === "unverified"
                    ? "Could not verify this product"
                    : entry.lastOutcome === "changed"
                      ? "Changed — review required"
                      : "No new verified change"}
              </p>
              {entry.lastObservation !== entry.baseline && (
                <div className="sourcing-price-change">
                  <span>
                    Saved baseline: {observationLabel(entry.baseline)}
                  </span>
                  <span>
                    Last observed: {observationLabel(entry.lastObservation)}
                  </span>
                </div>
              )}
              <p>
                {entry.status} · {entry.checks} checks recorded
              </p>
              <p className="field-hint">
                {entry.status === "active"
                  ? `Next check: ${date(entry.nextCheckAt)}`
                  : `Updated: ${date(entry.updatedAt)}`}
                <br />
                Ends: {date(entry.expiresAt)}
              </p>
              {(entry.status === "active" || entry.status === "checking") && (
                <Button
                  variant="text"
                  disabled={disabled}
                  onClick={() =>
                    void act(
                      `stop:${entry.id}`,
                      () => stopWatch({ token, watchId: entry.id }),
                      "Source watch stopped.",
                    )
                  }
                >
                  Stop watching
                </Button>
              )}
            </div>
          ))}
        </section>
      </Disclosure>
      {Boolean(runs?.length) && (
        <div className="sourcing-reviews" tabIndex={-1}>
          {(reviewOpen || progress.target !== "evidence") && <Button
            aria-expanded={reviewOpen}
            onClick={() => setReviewOpen(!reviewOpen)}
          >
            {reviewOpen ? "Close research evidence" : "Review research evidence"}
          </Button>}
          {reviewOpen && (
            <ResearchWorkspace
              autoSelectLatest
              status={researchStatus}
              runs={runs}
              request={null}
              onStatus={() => {}}
              onSearch={async () => {
                throw new Error("Start research from the case.");
              }}
              onExtract={(runId, sourceIndex) =>
                extract({
                  token,
                  runId: runId as Id<"researchRuns">,
                  sourceIndex,
                })
              }
              onRead={(runId, sourceIndex, url) =>
                read({
                  token,
                  runId: runId as Id<"researchRuns">,
                  sourceIndex,
                  url,
                })
              }
              onPrepare={(seed) => {
                if (item.comparisonId) {
                  if (!savedComparison) {
                    setError(
                      "The saved comparison is unavailable. Restore it before updating this case.",
                    );
                    return;
                  }
                  setIncoming(seed);
                  setEquivalent(false);
                  setError("");
                } else props.onPrepare({ ...seed, sourcingCaseId: caseId });
              }}
              selections={
                contextMatches
                  ? props.selections.filter(
                      (selection) =>
                        !savedComparison?.sources[selection.sourceId],
                    )
                  : undefined
              }
              onReview={contextMatches ? props.onReview : undefined}
              renderProspect={(run, index) => (
                <SaveWebProspect
                  token={token}
                  runId={run.id as Id<"researchRuns">}
                  sourceIndex={index}
                  title={run.sources[index].title}
                  url={run.sources[index].url}
                  onSaved={contextMatches ? props.onProspect : undefined}
                />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

class CaseBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="notice info">
        Research cases are unavailable on this server. Your existing studies
        remain accessible.
      </p>
    ) : (
      this.props.children
    );
  }
}

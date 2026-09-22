import ResearchReviewStatus from "./ResearchReviewStatus";
import { comparisonBlockers, blockerLabels } from "../domain/comparisonBlockers";
import { researchCoverage, RESEARCH_POLICY } from "../domain/researchCoverage";
import { Disclosure } from "./ui/Disclosure";
import { SegmentedControl } from "./ui/SegmentedControl";
import SourcingEntry, { type SourcingEntryRequest } from "./SourcingEntry";
import type { SavedStudy } from "./SavedStudies";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { readWorkspaceCheckpoint, writeWorkspaceCheckpoint } from "../workspaceCheckpoint";
import {
  useAction,
  useConvexConnectionState,
  useMutation,
  useQuery,
  useQueries,
} from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowLeft, ArrowRight, ChevronRight, Radar } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PurchaseSeed } from "../domain/market";
import type { StudyProspect, WebSelection } from "../domain/study";
import { ResearchWorkspace, type ResearchResumeRequest } from "./LiveResearch";
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

export type FollowupLocation = { id: string | null; requestId?: string; section?: "sources"; runId?: string; visit: number };
type Props = {
  location: FollowupLocation | null;
  questionOpen?: boolean;
  onCloseQuestion?: () => void;
  onOpen: (id: string | null, requestId?: string) => void;
  onBack: () => void;
  backLabel?: string;
  onOpenStudy: (study: SavedStudy) => void;
  ingredient: string;
  region: string;
  studyId: Id<"studies"> | null;
  onPrepare: (seed: PurchaseSeed) => void;
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
  const activeId = props.location?.id;
  const [ingredient, setIngredient] = useState(props.ingredient);
  const [area, setArea] = useState(props.region);
  const [objective, setObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = cases?.find((item) => item.id === activeId);
  useEffect(() => {
    if (!props.location?.id) {
      setIngredient(props.ingredient);
      setArea(props.region);
      setObjective("");
      setError("");
    }
  }, [props.location?.id, props.ingredient, props.region]);
  useEffect(() => {
    if (props.location && !props.location.id) { setObjective(""); setError(""); }
  }, [props.location?.id, props.location?.visit]);
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
              ingredient: ingredient.trim(),
              region: area.trim(),
            }),
        objective: objective.trim(),
      });
      setObjective("");
      props.onOpen(id);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const questionForm = (
          <form className="sourcing-form followup-intake" onSubmit={event => { event.preventDefault(); void openCase(); }}>
            {!props.studyId && <div className="followup-context-fields">
              <label className="field">Ingredient<input value={ingredient} onChange={event => setIngredient(event.target.value)} maxLength={120} /></label>
              <label className="field">Delivery area<input value={area} onChange={event => setArea(event.target.value)} maxLength={80} /></label>
            </div>}
            {props.studyId && <p>{props.ingredient} · {props.region}</p>}
            <label className="field"><span>What would you like to find out?</span><textarea value={objective} onChange={event => setObjective(event.target.value)} maxLength={500} rows={3} placeholder="Find comparable pack sizes and identify which delivery terms still need a quote." /></label>
            <div className="sourcing-prompt-chips">
              <button type="button" className="sourcing-chip" onClick={() => setObjective("Compare pack sizes and published bulk prices")}>Pack sizes & bulk prices</button>
              <button type="button" className="sourcing-chip" onClick={() => setObjective("Find published delivery coverage and order minimums")}>Delivery & minimums</button>
            </div>
            <div className="sourcing-form-actions">
              <Button type="submit" variant="primary" busy={busy} busyLabel="Saving question…" disabled={!connected || !(props.studyId ? props.ingredient : ingredient).trim() || !area.trim() || !objective.trim() || cases === undefined}>Save research question</Button>
              <p className="field-hint">Your question is saved first. You choose when to start research or send a message.</p>
            </div>
          </form>
  );
  if (props.questionOpen) return (
    <Dialog title="Research a question" className="research-question-dialog" onClose={() => { if (!busy) props.onCloseQuestion?.(); }}>
      <p className="muted">Save what you need to find out, then choose how to investigate it.</p>
      {!connected && <p className="notice info" role="status">Reconnecting. Your question stays here until you can save it.</p>}
      {questionForm}
      {error && <p className="notice error" role="alert">{error}</p>}
    </Dialog>
  );
  if (!props.location) return null;
  return (
    <main id="followup-main" className="followup-main" tabIndex={-1}>
      <div className="workspace-nav">
        <Button variant="text" onClick={props.onBack}><ArrowLeft size={16} />{props.backLabel ?? "Back to workspace"}</Button>
      </div>
      <header className="followup-heading">
        <h1 tabIndex={-1}>{activeId ? current?.ingredient ?? (cases === undefined ? "Opening your research…" : "Research unavailable") : "Research a question"}</h1>
        <p>{activeId ? current ? `${current.region} · Saved research question` : cases === undefined ? "Restoring your saved messages and findings." : "Return to your workspace to continue another item." : "Find the details you need before choosing a supplier."}</p>
      </header>
      <section className="sourcing-case is-expanded" aria-label="Saved research question">
        {!connected && <p className="notice info" role="status">Reconnecting. Saved results remain visible; actions will be available when connected.</p>}
        {activeId ? (
          cases === undefined ? <p role="status">Loading your research…</p>
          : current ? <CaseDetail key={current.id} {...props} token={token} caseId={current.id} connected={connected} liveEnabled={Boolean(status?.enabled)} watchEnabled={Boolean(status?.watchEnabled)} />
          : <div className="followup-unavailable"><h2>This research question isn’t available.</h2><p>Saved work belongs to the browser where it was created. Open another item from Overview.</p></div>
        ) : (
          questionForm
        )}
        {error && <p className="notice error" role="alert">{error}</p>}
      </section>
    </main>
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
  const caseRuns = useQuery(api.sourcing.research, { token, caseId });
  const allRuns = useQuery(api.research.list, { token });
  const reviewQueries = useMemo(() => Object.fromEntries([...(caseRuns ?? []), ...(allRuns ?? [])].map(run => [
    run.id, { query: api.overview.research, args: { token, runId: run.id } },
  ])), [caseRuns, allRuns, token]);
  const researchReviews = useQueries(reviewQueries);

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
  const [reviewOpen, setReviewOpen] = useState(true);
  const [sourceResume, setSourceResume] = useState<ResearchResumeRequest | null>(null);
  type CaseSection = "overview" | "sources" | "messages" | "activity";
  const [section, setSection] = useState<CaseSection>(() => readWorkspaceCheckpoint<CaseSection>(`followup:${caseId}`) ?? "overview");
  useEffect(() => writeWorkspaceCheckpoint(`followup:${caseId}`, section), [caseId, section]);
  const studies = useQuery(api.studies.list, { token });
  const saveStudy = useMutation(api.studies.save);
  const [evidenceDraft, setEvidenceDraft] = useState<{ selections: WebSelection[]; prospects: StudyProspect[]; baseStudy: SavedStudy | undefined } | null>(null);
  const [savedEvidenceStudy, setSavedEvidenceStudy] = useState<SavedStudy | null>(null);
  const [evidenceClientId] = useState(() => crypto.randomUUID());
  const [watchOpen, setWatchOpen] = useState(false);
  const [incoming, setIncoming] = useState<PurchaseSeed | null>(null);
  const [equivalent, setEquivalent] = useState(false);
  const [sourceEntry, setSourceEntry] = useState<SourcingEntryRequest | null>(null);
  const [mailId, setMailId] = useState<string | null>(null);
  const [mailVisit, setMailVisit] = useState(0);
  useEffect(() => {
    if (props.location?.id === caseId && props.location.requestId) {
      setSection("messages");
      setMailId(props.location.requestId);
      setMailVisit(n => n + 1);
    }
  }, [props.location?.id, props.location?.requestId, props.location?.visit, caseId]);
  useEffect(() => {
    if (props.location?.section === "sources") {
      setSection("sources");
      if (props.location.runId) setSourceResume({ id: props.location.runId, sequence: props.location.visit });
    }
  }, [props.location?.section, props.location?.runId, props.location?.visit]);
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
  if (detail === undefined) return <p role="status">Loading your research…</p>;
  if (detail === null) return <p>This follow-up is no longer available.</p>;
  const item = detail.case;
  if (!item)
    return (
      <p className="notice info">
        This case is no longer available in this session.
      </p>
    );
  const running = item.status === "running";
  const linkedStudy = studies?.find(study => study.id === item.studyId);
  const evidenceStudy = savedEvidenceStudy && (!linkedStudy || savedEvidenceStudy.revision > linkedStudy.revision) ? savedEvidenceStudy : linkedStudy;
  const selectedEvidence = evidenceDraft?.selections ?? evidenceStudy?.webSelections ?? [];
  const selectedProspects = evidenceDraft?.prospects ?? evidenceStudy?.prospects ?? [];
  const associatedComparison = comparisons?.find(comparison => comparison.id === item.comparisonId);
  const relatedRunIds = new Set([
    ...(allRuns ?? []).filter(run => run.studyId === item.studyId && item.studyId).map(run => run.id),
    ...(linkedStudy?.prospects ?? []).map(prospect => prospect.runId),
    ...(linkedStudy?.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources).flatMap(source => source.webReview ? [source.webReview.runId] : [])),
    ...Object.values(associatedComparison?.sources ?? {}).flatMap(source => source.webReview ? [source.webReview.runId] : []),
  ]);
  const runs = caseRuns === undefined || allRuns === undefined || studies === undefined || comparisons === undefined
    ? undefined
    : [...caseRuns, ...allRuns.filter(run => relatedRunIds.has(run.id) && !caseRuns.some(existing => existing.id === run.id))];
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
        (request.prospectId && linkedStudy?.prospects?.some(prospect => prospect.id === request.prospectId)) ||
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
    ...(linkedStudy?.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources).flatMap(source => source.replyReview ? [`reply:${source.replyReview.requestId}:${source.replyReview.messageId}`] : [])),
    ...(deliveryConfirmations ?? []).map(
      (item) => `reply:${item.requestId}:${item.messageId}`,
    ),
  ];
  const hasEvidence =
    runs?.some((run) =>
      researchReviews[run.id] && !(researchReviews[run.id] instanceof Error) && !researchReviews[run.id].reviewed &&
      run.sources.some(
        (source, index) =>
          source.markdown &&
          source.analysis?.kind !== "irrelevant" &&
          !reviewedIds.includes(`${run.id}:${index}`) &&
          !selectedProspects.some(prospect => prospect.runId === run.id && prospect.sourceIndex === index) &&
          !selectedEvidence.some(
            (selection) => selection.sourceId === `${run.id}:${index}`,
          ),
      ),
    ) ?? false;
  const progress = caseProgress({
    status: item.status,
    liveEnabled,
    hasComparison: Boolean(savedComparison),
    blocker: savedComparison ? comparisonBlockers(savedComparison)[0]?.message : undefined,
    hasEvidence,
    watches: detail.watches,
    requests: linkedRequests,
    reviewedReplyIds: reviewedIds,
  });
  const progressLoaded =
    requests !== undefined &&
    Object.values(researchReviews).every(review => review && !(review instanceof Error)) &&
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
  function nextAction() {
    if (progress.target === "mail") {
      setMailId(progress.requestId);
      setMailVisit((value) => value + 1);
      setSection("messages");
    } else if (progress.target === "evidence") {
      setReviewOpen(true);
      setSection("sources");
    } else if (progress.target === "comparison") openComparison();
    else if (progress.target === "watch") {
      setWatchOpen(true);
      setSection("activity");
    } else if (progress.target === "history") setSection("activity");
    else if (progress.target === "research")
      void act(
        "start",
        () => start({ token, caseId }),
        "Research started. Return to this case for findings.",
      );
  }
  const disabled = !connected || Boolean(pending);
  const contextMatches =
    (!item.studyId || item.studyId === props.studyId) &&
    props.ingredient.trim().toLowerCase() ===
      item.ingredient.trim().toLowerCase() &&
    props.region.trim().toLowerCase() === item.region.trim().toLowerCase();
  return (
    <div className="sourcing-detail">
      {sourceEntry && <SourcingEntry entry={sourceEntry} onClose={() => setSourceEntry(null)} onReady={(saved, id, requestId) => {
        setSavedEvidenceStudy(saved); setEvidenceDraft(null); setSourceEntry(null); props.onOpen(id, requestId ?? undefined);
      }} />}

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
          <h2>{item.objective}</h2>
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
      <SegmentedControl
        label="Research sections"
        value={section}
        onValueChange={value => { setSection(value); if (value === "sources") setReviewOpen(true); }}
        options={[{ value: "overview", label: "Overview" }, { value: "messages", label: "Messages" }, { value: "sources", label: "Sources" }, { value: "activity", label: "Activity" }]}
      />
      <div hidden={section !== "overview"}>
      <div className="sourcing-decision-layout">
        <section aria-label="Case decision brief" className="case-decision-brief">
          <div>
            <h3>Saved for this follow-up</h3>
            <p>
              {runs === undefined || comparisons === undefined
                ? "Loading saved evidence and comparison…"
                : savedComparison
                  ? `${savedComparison.offers.length} offers saved for comparison. Sources and reviewed terms stay attached to each offer.`
                  : coverage.total > 0 ? `${coverage.total} sources found. Review their details before adding an offer.`
                  : "Your question is saved. Add supplier findings or prepare a message to move forward."}
            </p>
          </div>
          <div>
            <h3>Still to confirm</h3>
            {savedComparison ? (() => {
              const blockers = comparisonBlockers(savedComparison);
              const describe = (blocker: typeof blockers[number]) =>
                `${blockerLabels[blocker.kind]} · ${blocker.supplier}: ${blocker.message}`;
              return blockers.length ? (
                <>
                  <p>{describe(blockers[0])}</p>
                  {blockers.length > 1 && (
                    <Disclosure
                      className="case-conditions"
                      title={`Other conditions (${blockers.length - 1})`}
                    >
                      <ul>
                        {blockers.slice(1).map((blocker, index) => (
                          <li key={index}>{describe(blocker)}</li>
                        ))}
                      </ul>
                    </Disclosure>
                  )}
                </>
              ) : (
                <p>Review the recommendation using your current quantity and preferences.</p>
              );
            })() : (
              <p>Review source evidence, product equivalence and commercial terms before deciding.</p>
            )}
          </div>
        </section>
        <div className="sourcing-decision-actions">
          <section
            className="sourcing-next"
            aria-label="Next step for this case"
            aria-live="polite"
          >
            <div>

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
      {linkedStudy && <Button variant="text" onClick={() => props.onOpenStudy(linkedStudy)}>Open linked study</Button>}

            {savedComparison && progress.target !== "comparison" && (
              <Button onClick={openComparison}>Open comparison</Button>
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
        </div>
      </div>
      </div>
      <div hidden={section !== "sources"}>
      {(running || coverage.total > 0 || item.stopReason) && (
        <Disclosure
          className="sourcing-coverage"
          aria-label="Research coverage"
          defaultOpen={false}
          title={<>Research coverage · {coverage.total} sources · {coverage.priceDomains} domains with prices</>}
        >
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
            {coverage.gaps.length > 0 && (
              <div className="sourcing-coverage-gaps">
                <h4>Remaining evidence gaps</h4>
                <ul>
                  {coverage.gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Disclosure>
      )}
      {runsExhausted && (
        <p className="field-hint">
          This case has used its three research runs. You can still review
          findings, messages and your comparison.
        </p>
      )}
      {!runs?.length && (
        <p className="followup-empty">
          No research sources yet. Start with the next step in Overview. Sources attached to saved offers are available in the comparison.
        </p>
      )}
      {Boolean(runs?.length) && (
        <div className="sourcing-reviews" tabIndex={-1}>
          {evidenceDraft && (
            <div className="followup-save-findings">
              <p>
                {selectedEvidence.length} reviewed offers and {selectedProspects.length} supplier contacts selected. Save to keep them with this follow-up.
              </p>
              <Button
                variant="primary"
                disabled={disabled}
                busy={pending === "save-evidence"}
                busyLabel="Saving findings…"
                onClick={() => void act("save-evidence", async () => {
                  const saved = await saveStudy({
                    token, clientId: evidenceClientId, id: evidenceDraft.baseStudy?.id ?? null, expectedRevision: evidenceDraft.baseStudy?.revision ?? 0,
                    term: item.ingredient, region: item.region, selectedIds: evidenceDraft.baseStudy?.selectedIds ?? [],
                    webReviews: selectedEvidence.map(({ seed, sourceId }) => {
                      const review = seed.sources[sourceId].webReview!;
                      return { ...review, runId: review.runId as Id<"researchRuns"> };
                    }),
                    prospectIds: selectedProspects.map(prospect => prospect.id),
                  });
                  setSavedEvidenceStudy(saved);
                  try {
                    if (item.studyId !== saved.id) await attach({ token, caseId, studyId: saved.id });
                    setEvidenceDraft(current => current === evidenceDraft ? null : current ? { ...current, baseStudy: saved } : null);
                  } catch (cause) {
                    setEvidenceDraft(current => current ? { ...current, baseStudy: saved } : null);
                    throw cause;
                  }
                }, "Findings saved with this follow-up.")}
              >
                Save findings
              </Button>
            </div>
          )}
          {reviewOpen && (
            <ResearchWorkspace
              renderReviewStatus={runId => <ResearchReviewStatus token={token} runId={runId} />}
              connected={connected}
              reviewDestination="followup"
              autoSelectLatest
              resumeRequest={sourceResume}
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
              selections={selectedEvidence}
              onReview={selection => setEvidenceDraft({
                baseStudy: evidenceDraft ? evidenceDraft.baseStudy : evidenceStudy,
                selections: selectedEvidence.some(item => item.sourceId === selection.sourceId)
                  ? selectedEvidence.map(item => item.sourceId === selection.sourceId ? selection : item)
                  : [...selectedEvidence, selection],
                prospects: selectedProspects,
              })}
              renderHeaderActions={() => (
                savedComparison ? (
                  <Button
                    variant="secondary"
                    onClick={openComparison}
                    aria-label="Compare saved offers"
                  >
                    Compare saved offers ({savedComparison.offers.length}) <ArrowRight size={15} />
                  </Button>
                ) : null
              )}
              renderProspect={(run, index) => (
                <SaveWebProspect
                  token={token}
                  runId={run.id as Id<"researchRuns">}
                  sourceIndex={index}
                  title={run.sources[index].title}
                  url={run.sources[index].url}
                  simulated={run.simulated}
                  primaryInquiry
                  onContinue={item.studyId && evidenceStudy ? (prospect, intent) => {
                    const base = evidenceDraft ? evidenceDraft.baseStudy : evidenceStudy;
                    setSourceEntry({ supplier: prospect.supplier, intent, target: { prospectId: prospect.id }, draft: {
                      clientId: evidenceClientId, id: base?.id ?? null, expectedRevision: base?.revision ?? 0,
                      term: item.ingredient, region: item.region, selectedIds: base?.selectedIds ?? [],
                      webSelections: selectedEvidence,
                      prospects: [...selectedProspects.filter(item => item.id !== prospect.id), prospect],
                    } });
                  } : undefined}
                  savedActionLabel="Keep candidate in this follow-up"
                  onSaved={prospect => setEvidenceDraft({
                    baseStudy: evidenceDraft ? evidenceDraft.baseStudy : evidenceStudy,
                    selections: selectedEvidence,
                    prospects: [...selectedProspects.filter(item => item.id !== prospect.id), prospect],
                  })}
                />
              )}
            />
          )}
        </div>
      )}
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="field-hint" role="status">{notice}</p>}
      <div hidden={section !== "messages"}>
      {requests !== undefined && linkedRequests.length === 0 && <p className="followup-empty">No messages yet. Prepare an inquiry from a supplier or from your comparison when you need to confirm terms.</p>}
      {linkedRequests.length > 0 && (
        <section
          className="sourcing-correspondence"
          tabIndex={-1}
          aria-label="Supplier conversations"
        >
          <Disclosure
            className="sourcing-disclosure"
            open={true}
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
                    <span className="followup-message-title"><strong>{request.subject}</strong><small>Updated {date(request.updatedAt)}</small></span>
                    <span className="followup-message-status">
                      {request.replies.length
                        ? `${request.replies.length} ${request.replies.length === 1 ? "reply" : "replies"} received`
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
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Disclosure>
          {selectedRequest && (
            <QuotationMail
              key={`${selectedRequest.id}:${mailVisit}`}
              initialRequestId={selectedRequest.id}
              dialogOnly
              comparisonId={selectedRequest.comparisonId ?? null}
              studyId={selectedRequest.studyId}
              prospectId={selectedRequest.prospectId}
              resultId={selectedRequest.resultId}
              offers={[]}
              deliveryComparison={savedComparison}
              onDeliveryApplied={comparison => props.onPrepare({
                ...comparison, sourcingCaseId: caseId,
                resumeComparison: { id: comparison.id, revision: comparison.revision, selectedOfferId: comparison.selectedOfferId, unchanged: true },
              })}
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
      </div>
      <div hidden={section !== "activity"}>
      <div className="followup-history">
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
            <h3>Activity</h3>
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
      </div>
      {(watchEnabled || detail.watches.length > 0) && (
      <Disclosure
        className="sourcing-disclosure"
        open={watchOpen}
        onOpenChange={setWatchOpen}
        title={
          <>
            <Radar size={18} aria-hidden="true" /> Price tracking{" "}
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
      )}
      </div>
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

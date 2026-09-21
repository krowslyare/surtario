import ResearchReviewStatus from "./ResearchReviewStatus";
import ResearchProgress, { ResearchCompletion } from "./ResearchProgress";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { scrollToContent } from "../scroll";
import type { ResearchProgress as Progress } from "../../convex/researchValidators";
import { reviewedWebEvidence } from "../domain/webEvidence";
import { SaveWebProspect, WebProspectLibrary } from "./WebProspects";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ExternalLink, FileSearch, History, Info, LoaderCircle, Search } from "lucide-react";
import { useAction, useQuery, useConvexConnectionState } from "convex/react";
import { ConvexError } from "convex/values";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  combineReviewedOffers,
  draftValues,
  extractionToPurchase,
  quickReviewIssues,
  searchMarketCurrency,
  type ExtractedOffer,
  type ExtractionSource,
} from "../domain/extraction";
import { MAX_COMPARISON_OFFERS, MAX_STUDY_OPTIONS, sameStudyContext, type WebSelection, type StudyProspect } from "../domain/study";
import type { PurchaseSeed } from "../domain/market";
import { Button } from "./ui/Button";
import { Dialog } from "./Dialog";
import { Disclosure } from "./ui/Disclosure";
import ExtractionReview from "./ExtractionReview";
import { money, parseCents, parseDecimal } from "../numbers";
import {
  pricePerComparisonUnit,
  type PackageUnit,
} from "../domain/procurement";
import {
  ProductLinkReader,
  SourceQualitySummary,
  type SourceAnalysis,
  type SourceInspection,
} from "./SourceQuality";

const SESSION_KEY = "procurement-demo-session-v1";
const PACKAGE_UNITS = new Set<PackageUnit>([
  "kg", "g", "lb", "oz", "L", "ml", "unit",
]);

function extractedComparablePrice(proposal: ExtractedOffer) {
  const price = proposal.price.value ? parseCents(proposal.price.value) : null;
  const content = proposal.packageContent.value
    ? parseDecimal(proposal.packageContent.value)
    : null;
  const unit = proposal.packageUnit.value;
  if (
    price === null ||
    !Number.isFinite(price) ||
    content === null ||
    !Number.isFinite(content) ||
    !unit ||
    !PACKAGE_UNITS.has(unit as PackageUnit)
  ) return null;
  return pricePerComparisonUnit(price, content, unit as PackageUnit);
}

export type ResearchStatus = {
  autoReviewEnabled?: boolean;
  searchEnabled: boolean;
  extractionEnabled: boolean;
};

export type ResearchSource = {
  url: string;
  title: string;
  description: string;
  markdown: string | null;
  contentTruncated: boolean;
  extraction: ExtractedOffer | null;
  extractionStatus: "idle" | "running" | "complete" | "failed";
  extractionError: string | null;
  analysis?: SourceAnalysis;
  inspection?: SourceInspection;
  parentSourceIndex?: number;
  observedAt?: string;
  readStatus?: "running" | "complete" | "failed";
  readError?: string | null;
};

export type SavedResearch = {
  clientId?: string;
  progress?: Progress;
  id: string;
  simulated: boolean;
  ingredient: string;
  region: string;
  observedAt: string;
  status: "running" | "complete" | "failed";
  error: string | null;
  sources: ResearchSource[];
  discarded: number;
  warning: boolean;
};

export type WebSearchRequest = {
  id: number;
  clientId?: string;
  ingredient: string;
  region: string;
};

export type ResearchResumeRequest = {
  id?: string;
  clientId?: string;
  showAllSources?: boolean;
  sourceIndex?: number;
  sequence: number;
};

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function observedLabel(value: string, includeTime = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date pending"
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? { timeZone: "UTC" } : {}),
        ...(includeTime && value.includes("T") ? { hour: "numeric", minute: "2-digit" } as const : {}),
      }).format(date);
}

function currencyReviewLabel(value: string | null, region: string) {
  if (value) return value;
  const marketCurrency = searchMarketCurrency(region);
  return marketCurrency
    ? `(defaults to ${marketCurrency} for this search market)`
    : "(currency unconfirmed)";
}

export function ResearchWorkspace({
  status,
  runs,
  request,
  onStatus,
  onSearch,
  onExtract,
  onRead,
  onPrepare,
  renderProspect,
  renderReviewStatus,
  selections,
  availableStudySlots,
  onReview,
  reviewDestination = "study",
  renderHeaderActions,
  onOpenStudy,
  onBackToOverview,
  pendingRun,
  autoSelectLatest = false,
  resumeRequest,
  onActiveRun,
  onCalculate,
  caseComparisonContext,
  onExploreDemo,
  connected = true,
}: {
  renderReviewStatus?: (runId: string) => ReactNode;
  connected?: boolean;
  renderHeaderActions?: (context?: { ingredient: string; region: string } | null) => ReactNode;
  pendingRun?: SavedResearch;
  autoSelectLatest?: boolean;
  resumeRequest?: ResearchResumeRequest | null;
  onActiveRun?: (cursor: Omit<ResearchResumeRequest, "sequence">) => void;
  onCalculate?: (seed: PurchaseSeed, context: { ingredient: string; region: string }) => void;
  caseComparisonContext?: { ingredient: string; region: string };
  onExploreDemo?: () => void;
  reviewDestination?: "study" | "followup";
  selections?: WebSelection[];
  availableStudySlots?: number;
  onReview?: (selection: WebSelection) => boolean | void;
  onOpenStudy?: () => void;
  onBackToOverview?: () => void;
  renderProspect?: (run: SavedResearch, sourceIndex: number, primaryInquiry: boolean) => ReactNode;
  status: ResearchStatus | undefined;
  runs: SavedResearch[] | undefined;
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onSearch: (ingredient: string, region: string) => Promise<SavedResearch>;
  onExtract: (runId: string, sourceIndex: number) => Promise<ExtractedOffer>;
  onRead?: (
    runId: string,
    sourceIndex: number,
    url: string,
  ) => Promise<SavedResearch>;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [showAllSources, setShowAllSources] = useState(resumeRequest?.showAllSources ?? false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const focusedSourceRequest = useRef<number | null>(null);
  const scrollAfterHistory = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(resumeRequest?.id ?? null);
  const [localRun, setLocalRun] = useState<SavedResearch | null>(null);
  const [searching, setSearching] = useState(false);
  const reducedMotion = useReducedMotion();
  const runningVisit = useRef<{ id: string | null; requestKey: string | number | undefined } | null>(null);
  const [finishedRunId, setFinishedRunId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string[]>([]);
  const [bulkExtraction, setBulkExtraction] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [bulkNotice, setBulkNotice] = useState("");
  const bulkVisit = useRef(0);
  const bulkRunning = useRef(false);
  const [quickReviewOpen, setQuickReviewOpen] = useState(false);
  const [quickReviewSelection, setQuickReviewSelection] = useState<string[]>([]);
  const [quickReviewConfirmed, setQuickReviewConfirmed] = useState(false);
  const [quickReviewError, setQuickReviewError] = useState("");
  const [reading, setReading] = useState<string[]>([]);
  const [readFailures, setReadFailures] = useState<Record<string, string>>({});
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>(
    {},
  );
  const [readNotice, setReadNotice] = useState("");
  const [localExtractions, setLocalExtractions] = useState<
    Record<string, ExtractedOffer>
  >({});
  const [localReviewed, setReviewed] = useState<
    { sourceId: string; seed: PurchaseSeed }[]
  >([]);
  const reviewed = selections ?? localReviewed;
  const selectionLimit = selections
    ? reviewed.length + (availableStudySlots ?? Math.max(0, MAX_STUDY_OPTIONS - reviewed.length))
    : MAX_COMPARISON_OFFERS;
  const remainingSelectionSlots = Math.max(0, selectionLimit - reviewed.length);
  useEffect(() => setShowAllSources(!request && activeId === resumeRequest?.id && Boolean(resumeRequest?.showAllSources)), [request?.id, request?.clientId, activeId]);
  const [equivalent, setEquivalent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onStatus(status), [onStatus, status]);
  useEffect(() => {
    if (!resumeRequest) return;
    runningVisit.current = null;
    setFinishedRunId(null);
    setActiveId(resumeRequest.id ?? null); setLocalRun(null); setError(""); setSearching(false);
    setShowAllSources(Boolean(resumeRequest.showAllSources));
  }, [resumeRequest]);

  useEffect(() => {
    if (!request) return;
    let current = true;
    setSearching(true);
    setError("");
    void onSearch(request.ingredient, request.region)
      .then((run) => {
        if (!current) return;
        setLocalRun(run);
        setActiveId(run.id);
        setReviewed([]);
        setEquivalent(false);
        setReadFailures({});
        setSelectedLinks({});
        setReadNotice("");
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof ConvexError && typeof cause.data === "string"
              ? cause.data
              : "Could not complete the search. Try again.",
          );
      })
      .finally(() => current && setSearching(false));
    return () => {
      current = false;
    };
  }, [request?.id, request?.clientId]);

  useEffect(() => {
    if (!autoSelectLatest || activeId || request || !runs?.length) return;
    const latest = runs.reduce((current, run) => run.observedAt >= current.observedAt ? run : current);
    setActiveId(latest.id);
  }, [autoSelectLatest, activeId, request, runs]);

  const active = useMemo(() => {
    if (searching) return pendingRun ?? null;
    const persisted = runs?.find((run) => run.id === activeId ||
      (!activeId && !request && resumeRequest?.clientId && run.clientId === resumeRequest.clientId));
    const localReadResolved = localRun?.sources.some((source, index) => {
      const persistedSource = persisted?.sources[index];
      return (
        source.parentSourceIndex !== undefined &&
        source.readStatus !== "running" &&
        persistedSource?.readStatus === "running"
      );
    });
    if (
      localRun?.id === activeId &&
      ((persisted?.status === "running" && localRun.status !== "running") ||
        localRun.sources.length > (persisted?.sources.length ?? 0) ||
        localReadResolved)
    )
      return localRun;
    return persisted ?? (localRun?.id === activeId ? localRun : null);
  }, [activeId, localRun, runs, searching, pendingRun, request, resumeRequest]);

  useEffect(() => {
    setBulkExtraction(null);
    setBulkNotice("");
    setQuickReviewOpen(false);
    bulkRunning.current = false;
    return () => { bulkVisit.current += 1; };
  }, [active?.id]);

  useEffect(() => {
    if (active) onActiveRun?.({ id: active.id, showAllSources });
  }, [active?.id, showAllSources, onActiveRun]);

  useEffect(() => {
    if (resumeRequest?.sourceIndex === undefined || active?.id !== resumeRequest.id || !showAllSources) return;
    if (focusedSourceRequest.current === resumeRequest.sequence) return;
    const source = sourcesRef.current?.querySelector<HTMLElement>(`[data-source-index="${resumeRequest.sourceIndex}"]`);
    if (!source) return;
    focusedSourceRequest.current = resumeRequest.sequence;
    scrollToContent(source);
  }, [active?.id, resumeRequest, showAllSources]);

  // A terminal checkpoint can arrive before the action promise resolves.
  const busy = !error && (active ? active.status === "running" : searching);
  const requestKey = request?.clientId ?? request?.id;
  useEffect(() => {
    if (busy) {
      runningVisit.current = { id: active?.id ?? null, requestKey };
      setFinishedRunId(null);
      return;
    }
    const visit = runningVisit.current;
    runningVisit.current = null;
    if (visit && !error && active?.status === "complete" &&
      (visit.id ? visit.id === active.id : visit.requestKey === requestKey)) {
      setFinishedRunId(active.id);
    }
  }, [busy, active?.id, active?.status, error, requestKey]);

  async function extract(
    run: SavedResearch,
    sourceIndex: number,
    quiet = false,
  ) {
    const sourceId = `${run.id}:${sourceIndex}`;
    setExtracting((current) =>
      current.includes(sourceId) ? current : [...current, sourceId],
    );
    if (!quiet) setError("");
    try {
      const proposal = await onExtract(run.id, sourceIndex);
      setLocalExtractions((current) => ({ ...current, [sourceId]: proposal }));
      return true;
    } catch (cause) {
      if (!quiet)
        setError(
          cause instanceof ConvexError && typeof cause.data === "string"
            ? cause.data
            : "Could not extract this source. You can try again.",
        );
      return false;
    } finally {
      setExtracting((current) => current.filter((id) => id !== sourceId));
    }
  }

  const extractableIndexes = active
    ? active.sources.flatMap((source, index) => {
        const sourceId = `${active.id}:${index}`;
        const readable =
          !source.inspection || source.inspection.state === "readable";
        const canAnalyze =
          !source.analysis || source.analysis.kind === "product";
        return source.markdown &&
          readable &&
          canAnalyze &&
          !source.extraction &&
          !localExtractions[sourceId] &&
          !extracting.includes(sourceId) &&
          source.extractionStatus !== "running"
          ? [index]
          : [];
      })
    : [];

  const reviewCandidateOffers = active && reviewDestination === "study"
    ? active.sources.flatMap((source, index) => {
        const sourceId = `${active.id}:${index}`;
        const proposal = localExtractions[sourceId] ?? source.extraction;
        const values = proposal ? draftValues(proposal) : null;
        if (
          source.analysis?.kind !== "product" ||
          !proposal ||
          !values ||
          reviewed.some((item) => item.sourceId === sourceId)
        ) return [];
        const reviewedValues = {
          ...values,
          currency: values.currency || searchMarketCurrency(active.region) || "",
        };
        const missing = quickReviewIssues(reviewedValues);
        return [{ source, index, sourceId, proposal, values: reviewedValues, missing }];
      })
    : [];
  const quickReviewOffers = reviewCandidateOffers.filter(
    (offer) => offer.missing.length === 0,
  );
  const productOfferCount = active
    ? active.sources.filter((source, index) =>
        source.analysis?.kind === "product" &&
        Boolean(localExtractions[`${active.id}:${index}`] ?? source.extraction),
      ).length
    : 0;
  const quickReviewCount = Math.min(
    quickReviewOffers.length,
    remainingSelectionSlots,
  );
  const individualReviewCount = reviewCandidateOffers.length - quickReviewOffers.length;
  const reviewedProductCount = Math.max(
    0,
    productOfferCount - reviewCandidateOffers.length,
  );

  function openQuickReview() {
    const available = remainingSelectionSlots;
    setQuickReviewSelection(
      quickReviewOffers.slice(0, available).map((offer) => offer.sourceId),
    );
    setQuickReviewConfirmed(false);
    setQuickReviewError("");
    setQuickReviewOpen(true);
  }

  function addQuickReviewOffers() {
    if (!active || !quickReviewConfirmed) return;
    try {
      const selected = quickReviewOffers.filter((offer) =>
        quickReviewSelection.includes(offer.sourceId),
      ).slice(0, remainingSelectionSlots);
      if (!selected.length) throw new Error("Select at least one offer to add.");
      let added = 0;
      for (const { source, index, sourceId, proposal, values } of selected) {
        const url = safeUrl(source.url);
        const extractionSource: ExtractionSource = {
          id: sourceId,
          title: source.title,
          text: reviewedWebEvidence(source),
          observedAt: source.observedAt ?? active.observedAt,
          simulated: active.simulated,
          ...(url ? { url } : {}),
        };
        const seed = extractionToPurchase(
          extractionSource,
          proposal,
          values,
          true,
          !proposal.currency.value && values.currency
            ? { currency: values.currency }
            : {},
        );
        const entry = seed.sources[sourceId];
        if (entry.extraction)
          entry.webReview = {
            runId: active.id,
            sourceIndex: index,
            values: { ...entry.extraction.reviewed },
            confirmed: true,
          };
        if (saveReview(sourceId, seed)) added += 1;
      }
      if (!added)
        throw new Error("These offers do not match the current study context.");
      setBulkNotice(
        `${added} ${added === 1 ? "offer" : "offers"} added to My study. You can edit any offer before comparing.`,
      );
      setQuickReviewOpen(false);
      setQuickReviewError("");
    } catch (cause) {
      setQuickReviewError(
        cause instanceof Error ? cause.message : "Could not add the selected offers.",
      );
    }
  }

  async function extractRemaining(run: SavedResearch) {
    const targets = [...extractableIndexes];
    if (!targets.length || bulkRunning.current) return;
    bulkRunning.current = true;
    const visit = bulkVisit.current;
    setBulkNotice("");
    setError("");
    setBulkExtraction({ completed: 0, total: targets.length });
    let completed = 0;
    let failed = 0;
    for (const sourceIndex of targets) {
      if (bulkVisit.current !== visit) return;
      const ok = await extract(run, sourceIndex, true);
      if (bulkVisit.current !== visit) return;
      completed += 1;
      if (!ok) failed += 1;
      setBulkExtraction({ completed, total: targets.length });
    }
    setBulkExtraction(null);
    bulkRunning.current = false;
    setBulkNotice(
      failed
        ? `${completed - failed} sources analyzed; ${failed} could not be analyzed. You can retry those sources individually.`
        : `${completed} ${completed === 1 ? "source" : "sources"} analyzed. Review the product offers before adding them to your study.`,
    );
  }

  async function readProduct(
    run: SavedResearch,
    sourceIndex: number,
    url: string,
  ) {
    if (!onRead) return;
    const sourceId = `${run.id}:${sourceIndex}`;
    setReading((current) => [...current, sourceId]);
    setReadNotice("");
    setReadFailures((current) => {
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
    try {
      const updated = await onRead(run.id, sourceIndex, url);
      setLocalRun(updated);
      const child = updated.sources.find(
        (source) => source.parentSourceIndex === sourceIndex,
      );
      setReadNotice(
        child?.readStatus === "failed"
          ? "The product page could not be read. It will not retry automatically."
          : "Product page read. Review the new source before using its data.",
      );
    } catch (cause) {
      setReadFailures((current) => ({
        ...current,
        [sourceId]:
          cause instanceof ConvexError && typeof cause.data === "string"
            ? cause.data
            : "Could not read the selected page. It will not retry automatically.",
      }));
    } finally {
      setReading((current) => current.filter((id) => id !== sourceId));
    }
  }

  function saveReview(sourceId: string, seed: PurchaseSeed) {
    if (onReview) {
      const accepted = onReview({
        sourceId,
        seed,
        ingredient: active!.ingredient,
        region: active!.region,
      });
      setEquivalent(false);
      return accepted !== false;
    }
    setReviewed((current) => {
      const existing = current.findIndex((item) => item.sourceId === sourceId);
      if (existing >= 0)
        return current.map((item, index) =>
          index === existing ? { sourceId, seed } : item,
        );
      return current.length < selectionLimit ? [...current, { sourceId, seed }] : current;
    });
    setEquivalent(false);
    return true;
  }

  function compareReviewed() {
    try {
      onPrepare(
        combineReviewedOffers(
          reviewed.map((item) => item.seed),
          reviewed.length === 1 || equivalent,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Review the selected offers.",
      );
    }
  }

  if (!status) return <p className="notice info">Checking web search…</p>;

  // When there are no searches yet and no active search in flight:
  if (!searching && !active && !error && !resumeRequest && !runs?.length) {
    return (
      <section className="live-research" aria-labelledby="live-research-title">
        <div className="live-research-heading">
          <div>
            <h2 id="live-research-title">{reviewDestination === "followup" ? "Sources to review" : "Web research"}</h2>
            <p>
              Found pages are candidate sources. Review the content before
              treating them as supplier offers.
            </p>
          </div>
          {renderHeaderActions?.(request)}
        </div>

        {!status.searchEnabled && (
          <p className="notice info">
            Web search is not configured. You can keep exploring the samples.
          </p>
        )}

        <div className="empty-state">
          <History size={32} />
          <h3>No saved searches yet</h3>
          <p>
            Searches you run for ingredients and suppliers will appear here.
          </p>
          {onBackToOverview && (
            <Button variant="secondary" onClick={onBackToOverview}>
              Back to overview
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="live-research" aria-labelledby="live-research-title">
      <div className="live-research-heading">
        <div>
          <h2 id="live-research-title">{reviewDestination === "followup" ? "Sources to review" : "Web research"}</h2>
          <p>
            Found pages are candidate sources. Review the content before
            treating them as supplier offers.
          </p>
        </div>
        {renderHeaderActions?.(active ?? request)}
      </div>
      {active?.sources.length ? renderReviewStatus?.(active.id) : null}

      {!status.searchEnabled && (
        <p className="notice info">
          Web search is not configured. You can keep exploring the samples.
        </p>
      )}

      <AnimatePresence initial={false} mode="wait">
        {busy ? (
          <motion.div key="searching" exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>
            <ResearchProgress connected={connected} sources={active?.sources} progress={active?.progress}
              ingredient={active?.ingredient ?? request?.ingredient ?? "Your ingredient"}
              region={active?.region ?? request?.region ?? "Your delivery area"} />
          </motion.div>
        ) : active?.status === "complete" && finishedRunId === active.id && !error ? (
          <motion.div key={`finished-${active.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
            <ResearchCompletion count={active.sources.length} partial={active.warning} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!searching && active?.status !== "running" && runs && runs.length > 0 && (
        <div className="research-history" ref={historyRef}>
          <Disclosure
            title={<span className="research-history-label"><History size={16} aria-hidden="true" />{reviewDestination === "followup" ? "Searches in this follow-up" : "Saved searches"} <span>({runs.length})</span></span>}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            onAfterClose={() => {
              if (!scrollAfterHistory.current) return;
              scrollAfterHistory.current = false;
              const trigger = historyRef.current?.querySelector<HTMLButtonElement>(".disclosure-trigger");
              scrollToContent(historyRef.current, trigger ?? historyRef.current);
            }}
          >
            <div className="research-history-list" role="group" aria-label="Saved searches">
              {runs.map((run, index) => (
                <button
                  type="button"
                  className="research-history-option"
                  key={run.id}
                  aria-label={`Search ${index + 1} · ${run.ingredient} · ${run.region} · ${run.sources.length} sources · ${observedLabel(run.observedAt, true)}`}
                  aria-pressed={activeId === run.id}
                  disabled={searching}
                  onClick={() => {
                    historyRef.current?.querySelector<HTMLButtonElement>(".disclosure-trigger")?.focus({ preventScroll: true });
                    scrollAfterHistory.current = true;
                    setHistoryOpen(false);
                    if (activeId === run.id) return;
                    setActiveId(run.id);
                    setFinishedRunId(null);
                    setLocalRun(null);
                    setEquivalent(false);
                    setReadFailures({});
                    setSelectedLinks({});
                    setReadNotice("");
                    setError("");
                  }}
                >
                  <span className="research-history-identity"><strong>{run.ingredient}</strong><span>{run.region}</span></span>
                  <span className="research-history-date">{observedLabel(run.observedAt, true)}<span>{run.sources.length} sources</span></span>
                  <Check size={16} aria-hidden="true" className="research-history-check" />
                </button>
              ))}
            </div>
            <p className="field-hint research-history-hint">
              {onReview
                ? reviewDestination === "followup" ? "Save findings to keep your reviewed offers with this follow-up." : "Your selection remains in My study when you open another search."
                : "Reviewed selections remain available across saved searches."}{" "}
              {reviewDestination !== "followup" && "Up to 10 quick searches per browser; case rounds have separate limits. Clearing site data removes access."}
            </p>
          </Disclosure>
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
          {onExploreDemo && <Button variant="secondary" onClick={onExploreDemo}>Explore demo catalog</Button>}
        </p>
      )}

      {resumeRequest && !request && !active && (
        <p className="notice info" role="status">
          {runs === undefined ? "Opening your saved search…" : "This search is unavailable. Open another saved search or change your search to continue."}
        </p>
      )}

      {active && active.status !== "running" && (
        <div className="research-run" data-just-completed={finishedRunId === active.id || undefined}>
          <div className="research-search-context">
            <div className="research-run-meta">
              <h3>
                {active.ingredient}<span> in {active.region}</span>
              </h3>
              <span>Observed on {observedLabel(active.observedAt)}</span>
            </div>
            {readNotice && (
              <p className="field-hint" role="status" aria-live="polite">
                {readNotice}
              </p>
            )}
            <Disclosure
              key={active.id}
              className="research-search-details"
              title={<span className="research-summary-line"><strong>{active.sources.length} candidate sources</strong><span>Search details</span></span>}
            >
              <div className="research-search-detail-copy">
                <p>
                  {active.sources.filter((source) => source.markdown).length} with recovered text ·{" "}
                  {active.sources.filter((source) => !source.markdown).length} without readable text.
                  Coverage is limited; these counts do not confirm delivery to {active.region} or comparable prices.
                </p>
                {reviewDestination !== "followup" && active.status === "complete" && status.autoReviewEnabled && active.sources.length > 3 && (
                  <p>AI analyzes up to 3 product pages automatically. More sources are available below; review their details before adding them to your study.</p>
                )}
                {active.discarded > 0 && (
                  <p>{active.discarded} {active.discarded === 1 ? "result was discarded" : "results were discarded"} because of relevance, duplicate sources, or reading limits.</p>
                )}
              </div>
            </Disclosure>
            {active.warning && (
              <p className="research-content-warning">
                <Info size={16} aria-hidden="true" />
                The search returned partial content; review the sources.
              </p>
            )}
          </div>
          {active.error && <div className="notice error" role="alert">
            <p>{active.error}</p>
            {!error && onExploreDemo && <Button variant="secondary" onClick={onExploreDemo}>Explore demo catalog</Button>}
          </div>}
          {active.sources.length > 0 &&
            active.sources.every(
              (source) =>
                source.inspection?.state === "blocked" ||
                source.inspection?.state === "unrelated" ||
                source.analysis?.kind === "irrelevant",
            ) && (
              <p className="notice" role="status">
                No source is ready to analyze as an offer. You can review the
                source pages or try a more specific search.
              </p>
            )}
          {active.status === "complete" && active.sources.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>No usable sources were retrieved</h3>
              <p>This does not confirm that no suppliers serve the area.</p>
            </div>
          )}
          {active.sources.length > 0 && <div className="research-source-toolbar">
            <div className="research-source-list-label">
              <strong>{reviewDestination === "followup" ? "Sources in this search" : "Candidate sources"}</strong>
              <span>{active.sources.length > 12 && !showAllSources ? `Showing 12 of ${active.sources.length} sources` : `Showing all ${active.sources.length} sources`}</span>
            </div>
            <div className="research-source-toolbar-actions">
              {quickReviewOffers.length > 0 && remainingSelectionSlots > 0 && (
                <Button variant="primary" onClick={openQuickReview}>
                  <Check size={16} aria-hidden="true" />
                  Review {quickReviewCount} remaining complete {quickReviewCount === 1 ? "offer" : "offers"}
                </Button>
              )}
              {reviewDestination === "study" &&
                productOfferCount > 0 &&
                quickReviewOffers.length === 0 &&
                reviewedProductCount > 0 && (
                  <span className="research-source-toolbar-status" role="status">
                    <Check size={16} aria-hidden="true" />
                    All complete offers reviewed
                  </span>
                )}
              {reviewDestination === "study" && remainingSelectionSlots === 0 && onOpenStudy && (
                <Button variant="secondary" onClick={onOpenStudy}>
                  <Check size={16} aria-hidden="true" />
                  View full study ({selectionLimit})
                </Button>
              )}
              {status.extractionEnabled && (extractableIndexes.length > 1 || bulkExtraction) && (
                <button
                  className="button secondary"
                  disabled={Boolean(bulkExtraction)}
                  onClick={() => void extractRemaining(active)}
                >
                  {bulkExtraction ? (
                    <LoaderCircle className="research-reading-icon" size={16} aria-hidden="true" />
                  ) : (
                    <FileSearch size={16} aria-hidden="true" />
                  )}
                  {bulkExtraction
                    ? `Analyzing ${bulkExtraction.completed} of ${bulkExtraction.total}`
                    : `Analyze remaining sources (${extractableIndexes.length})`}
                </button>
              )}
              {active.sources.length > 12 && <button className="button text-button research-show-sources" aria-expanded={showAllSources} onClick={() => setShowAllSources(value => !value)}>
                {showAllSources ? "Show first 12 sources" : `Show all ${active.sources.length} sources`}
              </button>}
            </div>
          </div>}
          {(bulkExtraction || bulkNotice) && (
            <p className="research-bulk-status" role="status" aria-live="polite">
              {bulkExtraction
                ? `Analyzing source ${Math.min(bulkExtraction.completed + 1, bulkExtraction.total)} of ${bulkExtraction.total}. Each source is handled once, in sequence.`
                : bulkNotice}
            </p>
          )}
          {!bulkExtraction && reviewDestination === "study" && productOfferCount > 0 && (
            <p className="research-bulk-breakdown">
              {productOfferCount} {productOfferCount === 1 ? "product offer" : "product offers"} analyzed · {quickReviewOffers.length} ready for quick review
              {individualReviewCount > 0 && <> · {individualReviewCount} {individualReviewCount === 1 ? "needs" : "need"} individual review</>}
              {reviewedProductCount > 0 && <> · {reviewedProductCount} already in My study</>}.
            </p>
          )}
          {active.sources.length > 1 && (
            <p className="research-priority-note">
              Prioritized for review: product pages with an extracted price and package size appear first. Placement reflects data completeness, not supplier quality.
            </p>
          )}
          {!bulkExtraction &&
            !bulkNotice &&
            status.extractionEnabled &&
            extractableIndexes.length > 1 && (
              <p className="research-bulk-hint">
                Analyze readable sources together, then review the product offers. Keep this view open while analysis runs; completed sources are saved.
              </p>
            )}
          <div className="research-sources" ref={sourcesRef}>
            {active.sources.map((source, index) => ({ source, index }))
              .sort((a, b) => {
                const rank = ({ source, index }: { source: ResearchSource; index: number }) => {
                  const proposal = localExtractions[`${active.id}:${index}`] ?? source.extraction;
                  return source.analysis?.kind === "product" && proposal?.price.value
                    ? proposal.packageContent.value && proposal.packageUnit.value ? 4 : 3
                    : source.analysis?.kind === "product" ? 2.5
                    : source.inspection?.state === "readable" ? 2
                    : source.inspection?.state === "unreadable" ? 1 : 0;
                };
                return rank(b) - rank(a);
              }).slice(0, showAllSources ? undefined : 12).map(({ source, index }) => {
              const sourceId = `${active.id}:${index}`;
              const url = safeUrl(source.url);
              const localProposal = localExtractions[sourceId];
              const proposal = localProposal ?? source.extraction;
              const comparablePrice = proposal
                ? extractedComparablePrice(proposal)
                : null;
              const awaitingAnalysis = Boolean(
                localProposal && !source.extraction && !source.analysis,
              );
              const isExtracting =
                extracting.includes(sourceId) ||
                source.extractionStatus === "running";
              const isReading =
                reading.includes(sourceId) || source.readStatus === "running";
              const readFailure =
                readFailures[sourceId] ||
                (source.readStatus === "failed" ? source.readError : "") ||
                "";
              const isChild = source.parentSourceIndex !== undefined;
              const parentTitle = isChild
                ? active.sources[source.parentSourceIndex!]?.title
                : undefined;
              const hasChild = active.sources.some(
                (candidate) => candidate.parentSourceIndex === index,
              );
              const inspectionBlocksAnalysis =
                source.inspection && source.inspection.state !== "readable";
              const readBlocksAnalysis =
                source.readStatus === "running" ||
                source.readStatus === "failed";
              const analysisIsProduct =
                !source.analysis || source.analysis.kind === "product";
              const prospectAllowed =
                source.inspection?.state !== "blocked" &&
                source.inspection?.state !== "unrelated" &&
                source.analysis?.kind !== "irrelevant";
              const wasReviewed = reviewed.some(
                (item) => item.sourceId === sourceId,
              );
              const extractionSource: ExtractionSource = {
                id: sourceId,
                title: source.title,
                text: reviewedWebEvidence(source),
                observedAt: source.observedAt ?? active.observedAt,
                simulated: active.simulated,
                ...(url ? { url } : {}),
              };
              return (
                <article
                  className={`research-source${isChild ? " research-source-child" : ""}${wasReviewed ? " is-reviewed" : ""}`}
                  key={sourceId}
                  data-source-index={index}
                  tabIndex={-1}
                >
                  <div className="research-source-copy">
                    <span>
                      {isChild
                        ? `Product page read from ${parentTitle ?? "a candidate source"}`
                        : "Candidate web source"}
                    </span>
                    <h3>{source.title}</h3>
                    {!source.analysis && <p className="research-source-description">{source.description}</p>}
                    {source.analysis && (
                      <SourceQualitySummary analysis={source.analysis} compact />
                    )}
                    {analysisIsProduct && proposal?.price.value && (
                      <div className="research-extracted-price">
                        <p className="field-hint">
                          Extracted price: {proposal.price.value}{" "}
                          {currencyReviewLabel(
                            proposal.currency.value,
                            active.region,
                          )}
                          {proposal.packageContent.value &&
                          proposal.packageUnit.value
                            ? ` · ${proposal.packageContent.value} ${proposal.packageUnit.value} per package`
                            : " · package contents need review"}
                          {" · Review before comparing."}
                        </p>
                        {comparablePrice && (
                          <p className="research-comparable-price">
                            Comparable unit price: {money(
                              comparablePrice.priceCents,
                              proposal.currency.value || searchMarketCurrency(active.region) || "",
                            )} / {comparablePrice.unit}
                            <small>Calculated from the extracted package terms.</small>
                          </p>
                        )}
                      </div>
                    )}
                    {source.contentTruncated && (
                      <small>The retrieved content is incomplete.</small>
                    )}
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        View source page <ExternalLink size={14} />
                      </a>
                    ) : (
                      <small>
                        The source does not include a valid web URL.
                      </small>
                    )}
                  </div>
                  <div className="research-source-action">
                    {wasReviewed && (
                      <div className="research-source-state" role="status">
                        <Check size={15} aria-hidden="true" />
                        In My study
                      </div>
                    )}
                    {source.readStatus === "running" && (
                      <p
                        className="field-hint"
                        role="status"
                        aria-live="polite"
                      >
                        The page is being read. It will not retry automatically.
                      </p>
                    )}
                    {source.readStatus === "failed" && source.readError && (
                      <p className="notice error" role="alert">
                        {source.readError}
                      </p>
                    )}
                    {readBlocksAnalysis ? (
                      <p className="field-hint">
                        Wait for this page to finish loading. If it failed,
                        review the source manually.
                      </p>
                    ) : inspectionBlocksAnalysis ? (
                      <p className="field-hint">
                        {source.inspection?.state === "unrelated"
                          ? "We did not find enough text matches for this search. Review the source if you need to confirm it."
                          : source.inspection?.reason ||
                            "This page has no readable content to analyze."}
                      </p>
                    ) : !analysisIsProduct ? (
                      <p className="field-hint">
                        This source provides context or contact information, but
                        not a comparable product offer.
                      </p>
                    ) : awaitingAnalysis ? (
                      <p
                        className="field-hint"
                        role="status"
                        aria-live="polite"
                      >
                        Classifying the source before enabling review…
                      </p>
                    ) : !source.markdown ? (
                      <p>No retrieved text is available for extraction.</p>
                    ) : !status.extractionEnabled && !proposal ? (
                      <p>Extraction is not configured on the server.</p>
                    ) : proposal ? (
                      <div className="research-source-primary-actions">
                        {!wasReviewed && remainingSelectionSlots === 0 ? (
                          <Button disabled>Study full ({selectionLimit} of {selectionLimit})</Button>
                        ) : (
                          <ExtractionReview
                            source={extractionSource}
                            proposal={proposal}
                            triggerLabel={
                              wasReviewed ? "Edit review" : "Review offer"
                            }
                            triggerVariant="primary"
                            confirmLabel={reviewDestination === "followup" ? "Keep reviewed offer" : "Add to study"}
                            confirmationNote={reviewDestination === "followup" ? "Review this offer, then save your findings to keep it with this follow-up. No purchase is recorded." : "Add this reviewed offer to My study. Save the study to recover it later; you are not preparing a purchase yet."}
                            defaultCurrency={searchMarketCurrency(active.region)}
                            savedValues={reviewed.find((item) => item.sourceId === sourceId)?.seed.sources[sourceId]?.extraction?.reviewed}
                            onPrepare={(seed) => {
                              const entry = seed.sources[sourceId];
                              if (entry.extraction)
                                entry.webReview = {
                                  runId: active.id,
                                  sourceIndex: index,
                                  values: { ...entry.extraction.reviewed },
                                  confirmed: true,
                                };
                              saveReview(sourceId, seed);
                            }}
                          />
                        )}
                        {wasReviewed && onCalculate && <Button variant="secondary" onClick={() => {
                          const selection = reviewed.find(r => r.sourceId === sourceId);
                          if (selection) onCalculate(selection.seed, active);
                        }}>{caseComparisonContext && sameStudyContext(caseComparisonContext, active) ? "Open case comparison" : "Calculate this offer"}</Button>}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button primary"
                          disabled={isExtracting || Boolean(bulkExtraction)}
                          onClick={() => void extract(active, index)}
                        >
                          {isExtracting ? (
                            <LoaderCircle className="research-reading-icon" size={16} aria-hidden="true" />
                          ) : (
                            <FileSearch size={16} aria-hidden="true" />
                          )}
                          {isExtracting ? "Analyzing source…" : "Extract data"}
                        </button>
                        {!isExtracting && (
                          <p className="field-hint">
                            First identify the page type and cite the evidence;
                            only a product page moves to review.
                          </p>
                        )}
                      </>
                    )}
                    {url && prospectAllowed && renderProspect?.(active, index, !source.markdown || !analysisIsProduct || Boolean(inspectionBlocksAnalysis))}
                    {!isChild &&
                    !hasChild &&
                    onRead &&
                    source.inspection?.state !== "blocked" &&
                    source.inspection?.state !== "unrelated" &&
                    source.analysis?.kind !== "irrelevant" &&
                    source.inspection?.links.length ? (
                      <details
                        className="source-reader-options"
                        open={
                          source.analysis?.kind === "catalog" ||
                          source.analysis?.kind === "contact" ||
                          isReading ||
                          Boolean(readFailure)
                        }
                      >
                        <summary>Product pages on this site</summary>
                        <ProductLinkReader
                          links={source.inspection.links}
                          selectedUrl={
                            selectedLinks[sourceId] ??
                            source.inspection.links[0]?.url ??
                            ""
                          }
                          reading={isReading}
                          failed={readFailure}
                          onSelect={(selectedUrl) =>
                            setSelectedLinks((current) => ({
                              ...current,
                              [sourceId]: selectedUrl,
                            }))
                          }
                          onRead={() =>
                            void readProduct(
                              active,
                              index,
                              selectedLinks[sourceId] ??
                                source.inspection?.links[0]?.url ??
                                "",
                            )
                          }
                        />
                      </details>
                    ) : null}
                    {source.extractionStatus === "failed" &&
                      source.extractionError && (
                        <p className="notice error">{source.extractionError}</p>
                      )}
                    {isExtracting && (
                      <p className="field-hint">
                        AI is reviewing the source and its references. The
                        request will not retry automatically.
                      </p>
                    )}
                    {wasReviewed && (
                      <small className="research-source-review-note">Reviewed offer added to this selection.</small>
                    )}
                    {!wasReviewed && remainingSelectionSlots === 0 && proposal && analysisIsProduct && (
                      <small>
                        My study already has {selectionLimit} options. Remove one before adding another.
                      </small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {reviewed.length > 0 && onOpenStudy && (
        <div className="reviewed-research" role="status">
          <strong>
            {reviewed.length}{" "}
            {reviewed.length === 1
              ? `offer reviewed in ${reviewDestination === "followup" ? "this follow-up" : "My study"}`
              : `offers reviewed in ${reviewDestination === "followup" ? "this follow-up" : "My study"}`}
          </strong>
          <p>
            Save the study to recover your corrections. Comparing a purchase is
            optional.
          </p>
          <button className="button primary" onClick={onOpenStudy}>
            View my study
          </button>
        </div>
      )}
      {reviewed.length > 0 && !onOpenStudy && (
        <div className="reviewed-research">
          <strong>
            {reviewed.length}{" "}
            {reviewed.length === 1 ? "offer reviewed" : "offers reviewed"}
          </strong>
          <p>
            Corrections in this selection are kept when you save the comparison.
            Sources and extractions already remain in the research record.
          </p>
          {reviewed.length > 1 && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={equivalent}
                onChange={(event) => setEquivalent(event.target.checked)}
              />
              I confirm they match the same ingredient, specification, base
              unit, and currency.
            </label>
          )}
          <button
            type="button"
            className="button primary"
            disabled={reviewed.length > 1 && !equivalent}
            onClick={compareReviewed}
          >
            Compare {reviewed.length} reviewed {reviewed.length === 1 ? "offer" : "offers"}
          </button>
          <small>
            Enter quantity when preparing the purchase; totals are not shown
            yet.
          </small>
        </div>
      )}
      {quickReviewOpen && active && (
        <Dialog
          title="Review product offers"
          wide
          className="quick-review-dialog"
          onClose={() => setQuickReviewOpen(false)}
        >
          <div className="quick-review-body">
            <p className="quick-review-intro">
              {reviewCandidateOffers.length} product {reviewCandidateOffers.length === 1 ? "offer was" : "offers were"} found. {quickReviewOffers.length} {quickReviewOffers.length === 1 ? "is" : "are"} complete enough for quick review. Check the source summaries, choose up to {Math.min(remainingSelectionSlots, quickReviewOffers.length)}, and add them together.
            </p>
            <div className="quick-review-list" role="group" aria-label="Ready offers">
              {reviewCandidateOffers.map(({ source, sourceId, values, missing }) => {
                const checked = quickReviewSelection.includes(sourceId);
                const atLimit = quickReviewSelection.length >= remainingSelectionSlots;
                const ready = missing.length === 0;
                return (
                  <label className={`quick-review-offer${ready ? "" : " is-incomplete"}`} key={sourceId}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!ready || (!checked && atLimit)}
                      onChange={(event) => {
                        setQuickReviewSelection((current) =>
                          event.target.checked
                            ? [...current, sourceId]
                            : current.filter((id) => id !== sourceId),
                        );
                        setQuickReviewConfirmed(false);
                      }}
                    />
                    <span>
                      <strong>{values.supplier}</strong>
                      <span>{source.title}</span>
                      <small>{source.analysis?.summary}</small>
                      <small>{values.price} {values.currency} · {values.packageContent} {values.packageUnit} · {values.specification}</small>
                      {source.analysis?.warnings.map((warning, index) => (
                        <small className="quick-review-warning" key={index}>{warning}</small>
                      ))}
                      {!ready && (
                        <small className="quick-review-incomplete">Needs individual review: {missing.join(", ")}.</small>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <label className="checkbox quick-review-confirmation">
              <input
                type="checkbox"
                checked={quickReviewConfirmed}
                onChange={(event) => setQuickReviewConfirmed(event.target.checked)}
              />
              I reviewed these source summaries and confirm the selected offer data.
            </label>
            {quickReviewError && <p className="notice error" role="alert">{quickReviewError}</p>}
            <div className="dialog-actions">
              <Button onClick={() => setQuickReviewOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!quickReviewConfirmed || quickReviewSelection.length === 0}
                onClick={addQuickReviewOffers}
              >
                Add {quickReviewSelection.length} {quickReviewSelection.length === 1 ? "offer" : "offers"} to study
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}

type LiveResearchProps = {
  renderHeaderActions?: (context?: { ingredient: string; region: string } | null) => ReactNode;
  caseComparisonContext?: { ingredient: string; region: string };
  resumeRequest?: ResearchResumeRequest | null;
  onActiveRun?: (cursor: Omit<ResearchResumeRequest, "sequence">) => void;
  onCalculate?: (seed: PurchaseSeed, context: { ingredient: string; region: string }) => void;
  onExploreDemo?: () => void;
  onContextualProspect?: (prospect: StudyProspect, intent: "inquiry" | "research") => void;
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onPrepare: (seed: PurchaseSeed) => void;
  selections?: WebSelection[];
  availableStudySlots?: number;
  onReview?: (selection: WebSelection) => boolean | void;
  onOpenStudy?: () => void;
  onBackToOverview?: () => void;
  selectedProspectIds?: string[];
  onProspect?: (prospect: StudyProspect) => void;
};
export default function LiveResearch(props: LiveResearchProps) {
  const [token, setToken] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      let stored = localStorage.getItem(SESSION_KEY);
      if (!stored || !/^[a-f0-9]{64}$/.test(stored)) {
        stored = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        localStorage.setItem(SESSION_KEY, stored);
      }
      setToken(stored);
    } catch {
      setStorageError(true);
    }
  }, []);
  if (!token)
    return (
      <p className="notice info">
        {storageError
          ? "Your browser cannot keep this session. Web research requires site storage."
          : "Preparing the research session…"}
      </p>
    );
  return (
    <ResearchBoundary>
      <ConnectedResearch {...props} token={token} />
    </ResearchBoundary>
  );
}

function ConnectedResearch({
  token,
  ...props
}: LiveResearchProps & { token: string }) {
  const status = useQuery(api.research.status, {});
  const { isWebSocketConnected } = useConvexConnectionState();
  const runs = useQuery(api.research.list, { token });
  const search = useAction(api.research.search);
  const attempts = useRef(new Map<string, Promise<SavedResearch>>());
  const fallbackClientId = useMemo(() => crypto.randomUUID(), [props.request?.id]);
  const searchClientId = props.request?.clientId ?? fallbackClientId;
  const extract = useAction(api.research.extract);
  const readProduct = useAction(api.research.readProduct);
  return (
    <>
      <ResearchWorkspace
        {...props}
        renderReviewStatus={runId => <ResearchReviewStatus token={token} runId={runId} />}
        connected={isWebSocketConnected}
        renderProspect={(run, index, primaryInquiry) => (
          <SaveWebProspect
            primaryInquiry={primaryInquiry}
            onSaved={props.onProspect}
            onContinue={props.onContextualProspect}
            simulated={run.simulated}
            token={token}
            runId={run.id as Id<"researchRuns">}
            sourceIndex={index}
            title={run.sources[index].title}
            url={run.sources[index].url}
          />
        )}
        status={status}
        runs={runs}
        pendingRun={runs?.find(run => run.clientId === searchClientId)}
        onSearch={(ingredient, region) => {
          const existing = attempts.current.get(searchClientId);
          if (existing) return existing;
          const pending = search({
            token,
            clientId: searchClientId,
            ingredient,
            region,
          });
          attempts.current.set(searchClientId, pending);
          return pending;
        }}
        onExtract={(runId, sourceIndex) =>
          extract({ token, runId: runId as Id<"researchRuns">, sourceIndex })
        }
        onRead={(runId, sourceIndex, url) =>
          readProduct({
            token,
            runId: runId as Id<"researchRuns">,
            sourceIndex,
            url,
          })
        }
      />
      <WebProspectLibrary
        token={token}
        onPrepare={props.onPrepare}
        onSelect={props.onProspect}
        onContinue={props.onContextualProspect}
        selectedIds={props.selectedProspectIds}
        availableStudySlots={props.availableStudySlots}
      />
    </>
  );
}

class ResearchBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="notice error" role="alert">
        Web research is unavailable. The samples remain accessible.
      </p>
    ) : (
      this.props.children
    );
  }
}

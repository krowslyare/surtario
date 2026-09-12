import { SaveWebProspect, WebProspectLibrary } from "./WebProspects";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ExternalLink, FileSearch, History, Search } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  combineReviewedOffers,
  type ExtractedOffer,
  type ExtractionSource,
} from "../domain/extraction";
import type { WebSelection, StudyProspect } from "../domain/study";
import type { PurchaseSeed } from "../domain/market";
import ExtractionReview from "./ExtractionReview";
import {
  ProductLinkReader,
  SourceQualitySummary,
  type SourceAnalysis,
  type SourceInspection,
} from "./SourceQuality";

const SESSION_KEY = "procurement-demo-session-v1";

export type ResearchStatus = {
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
  ingredient: string;
  region: string;
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

function observedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date pending"
    : new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
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
  selections,
  onReview,
  onOpenStudy,
}: {
  selections?: WebSelection[];
  onReview?: (selection: WebSelection) => void;
  onOpenStudy?: () => void;
  renderProspect?: (run: SavedResearch, sourceIndex: number) => ReactNode;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localRun, setLocalRun] = useState<SavedResearch | null>(null);
  const [searching, setSearching] = useState(false);
  const [extracting, setExtracting] = useState<string[]>([]);
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
  const [equivalent, setEquivalent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onStatus(status), [onStatus, status]);

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
              : "Could not completar la search. Vuelve a trylo.",
          );
      })
      .finally(() => current && setSearching(false));
    return () => {
      current = false;
    };
  }, [request?.id]);

  const active = useMemo(() => {
    const persisted = runs?.find((run) => run.id === activeId);
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
      (persisted?.status === "running" ||
        localRun.sources.length > (persisted?.sources.length ?? 0) ||
        localReadResolved)
    )
      return localRun;
    return persisted ?? (localRun?.id === activeId ? localRun : null);
  }, [activeId, localRun, runs]);

  async function extract(run: SavedResearch, sourceIndex: number) {
    const sourceId = `${run.id}:${sourceIndex}`;
    setExtracting((current) => [...current, sourceId]);
    setError("");
    try {
      const proposal = await onExtract(run.id, sourceIndex);
      setLocalExtractions((current) => ({ ...current, [sourceId]: proposal }));
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Could not extract this source. You can try again.",
      );
    } finally {
      setExtracting((current) => current.filter((id) => id !== sourceId));
    }
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
      onReview({
        sourceId,
        seed,
        ingredient: active!.ingredient,
        region: active!.region,
      });
      setEquivalent(false);
      return;
    }
    setReviewed((current) => {
      const existing = current.findIndex((item) => item.sourceId === sourceId);
      if (existing >= 0)
        return current.map((item, index) =>
          index === existing ? { sourceId, seed } : item,
        );
      return current.length < 3 ? [...current, { sourceId, seed }] : current;
    });
    setEquivalent(false);
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

  if (!status) return <p className="notice info">Comprobando la search web…</p>;

  // Keep the status subscription mounted without an empty duplicate search panel.
  if (!searching && !active && !error && !runs?.length) return null;

  return (
    <section className="live-research" aria-labelledby="live-research-title">
      <div className="live-research-heading">
        <div>
          <h2 id="live-research-title">Web research</h2>
          <p>
            Found pages are candidate sources. Review the content before
            treating them as supplier offers.
          </p>
        </div>
        {searching && <span role="status">Buscando sources…</span>}
      </div>

      {!status.searchEnabled && (
        <p className="notice info">
          Web search is not configured. You can keep exploring the samples.
        </p>
      )}

      {runs && runs.length > 0 && (
        <div className="research-history" aria-label="Investigaciones saveds">
          <p className="field-hint">
            {onReview
              ? "Your selection remains in My study when you open another search."
              : "Opening another search replaces the reviewed selection in this view."}{" "}
            Up to 10 searches per browser; clearing site data removes acceso.
          </p>
          <span>
            <History size={16} /> Investigaciones saveds
          </span>
          <div>
            {runs.map((run) => (
              <button
                type="button"
                className="button text-button"
                key={run.id}
                aria-pressed={activeId === run.id}
                disabled={searching}
                onClick={() => {
                  if (activeId === run.id) return;
                  setActiveId(run.id);
                  setLocalRun(null);
                  setReviewed([]);
                  setEquivalent(false);
                  setReadFailures({});
                  setSelectedLinks({});
                  setReadNotice("");
                  setError("");
                }}
              >
                {run.ingredient} · {run.region} ·{" "}
                {observedLabel(run.observedAt)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {active && (
        <div className="research-run">
          <div className="research-run-meta">
            <strong>
              {active.ingredient} en {active.region}
            </strong>
            <span>Observado el {observedLabel(active.observedAt)}</span>
            {active.status === "running" && (
              <span role="status">
                Search in progress. If interrupted, it will not retry
                automatically.
              </span>
            )}
          </div>
          {readNotice && (
            <p className="field-hint" role="status" aria-live="polite">
              {readNotice}
            </p>
          )}
          {active.warning && (
            <p className="notice info">
              The search returned partial content; review the sources.
            </p>
          )}
          {active.error && <p className="notice error">{active.error}</p>}
          {active.discarded > 0 && (
            <p className="field-hint">
              {active.discarded}{" "}
              {active.discarded === 1
                ? "result was discarded"
                : "resultados se descartaron"}{" "}
              for not meeting the search limits.
            </p>
          )}
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
          <div className="research-sources">
            {active.sources.map((source, index) => {
              const sourceId = `${active.id}:${index}`;
              const url = safeUrl(source.url);
              const localProposal = localExtractions[sourceId];
              const proposal = localProposal ?? source.extraction;
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
                text: source.analysis
                  ? `Page title: ${source.title.replace(/\s+/g, " ").trim()}\n\n${source.markdown ?? source.description}`
                  : (source.markdown ?? source.description),
                observedAt: source.observedAt ?? active.observedAt,
                simulated: active.simulated,
                ...(url ? { url } : {}),
              };
              return (
                <article
                  className={`research-source${isChild ? " research-source-child" : ""}`}
                  key={sourceId}
                >
                  <div className="research-source-copy">
                    <span>
                      {isChild
                        ? `Product page read from ${parentTitle ?? "a candidate source"}`
                        : "Web source candidata"}
                    </span>
                    <h3>{source.title}</h3>
                    <p>{source.description}</p>
                    {source.analysis && (
                      <SourceQualitySummary analysis={source.analysis} />
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
                    {url && prospectAllowed && renderProspect?.(active, index)}
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
                        <summary>Read a product page from this site</summary>
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
                        not a offer de producto comparable.
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
                      <ExtractionReview
                        source={extractionSource}
                        proposal={proposal}
                        triggerLabel={
                          wasReviewed ? "Edit review" : "Review extraction"
                        }
                        confirmLabel="Add al study"
                        confirmationNote="Add this reviewed offer to My study. Save the study to recover it later; you are not preparing a purchase yet."
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
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button primary"
                          disabled={isExtracting}
                          onClick={() => void extract(active, index)}
                        >
                          <FileSearch size={16} />
                          {isExtracting ? "Analizando source…" : "Extraer data"}
                        </button>
                        {!isExtracting && (
                          <p className="field-hint">
                            First identify the page type and cite the evidence;
                            only a product page moves to review.
                          </p>
                        )}
                      </>
                    )}
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
                      <small>Reviewed offer added to this selection.</small>
                    )}
                    {!wasReviewed && reviewed.length >= 3 && proposal && (
                      <small>
                        You already selected the maximum of 3 offers.
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
              ? "offer revisada en Mi study"
              : "offers revisadas en Mi study"}
          </strong>
          <p>
            Save the study to recover your corrections. Comparing a purchase es
            opcional.
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
            {reviewed.length === 1 ? "offer revisada" : "offers revisadas"}
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
              I confirm they match the same ingredient, specification, unit base
              y moneda
            </label>
          )}
          <button
            type="button"
            className="button primary"
            disabled={reviewed.length > 1 && !equivalent}
            onClick={compareReviewed}
          >
            Comparar offers revisadas
          </button>
          <small>
            Enter quantity when preparing the purchase; it is not muestran
            totales.
          </small>
        </div>
      )}
    </section>
  );
}

type LiveResearchProps = {
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onPrepare: (seed: PurchaseSeed) => void;
  selections?: WebSelection[];
  onReview?: (selection: WebSelection) => void;
  onOpenStudy?: () => void;
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
  const runs = useQuery(api.research.list, { token });
  const search = useAction(api.research.search);
  const attempts = useRef(new Map<number, Promise<SavedResearch>>());
  const extract = useAction(api.research.extract);
  const readProduct = useAction(api.research.readProduct);
  return (
    <>
      <ResearchWorkspace
        {...props}
        renderProspect={(run, index) => (
          <SaveWebProspect
            onSaved={props.onProspect}
            token={token}
            runId={run.id as Id<"researchRuns">}
            sourceIndex={index}
            title={run.sources[index].title}
            url={run.sources[index].url}
          />
        )}
        status={status}
        runs={runs}
        onSearch={(ingredient, region) => {
          const requestId = props.request?.id ?? 0;
          const existing = attempts.current.get(requestId);
          if (existing) return existing;
          const pending = search({
            token,
            clientId: crypto.randomUUID(),
            ingredient,
            region,
          });
          attempts.current.set(requestId, pending);
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
        selectedIds={props.selectedProspectIds}
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

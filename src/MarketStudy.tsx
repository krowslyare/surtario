import { scrollToContent } from "./scroll";
import { mergeReplyOffer } from "./domain/replyReview";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { readWorkspaceCheckpoint, writeWorkspaceCheckpoint } from "./workspaceCheckpoint";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  FileText,
  FolderOpen,
  Info,
  ListPlus,
  PenLine,
  Search,
} from "lucide-react";
import {
  marketExamples,
  allMarketExamples,
  usMarketExamples,
  findMarketExampleContextByIds,
} from "../fixtures/market";
import {
  filterMarketExamples,
  preparePurchaseFromCatalog,
  type CatalogResult,
  type MarketResult,
  type PurchaseSeed,
} from "./domain/market";
import { money, numberLabel } from "./numbers";
import Brand from "./components/Brand";
import ContinueWork from "./components/ContinueWork";
import Messages, { MessagesLink } from "./components/Messages";
import SourcingEntry, { type SourcingEntryRequest } from "./components/SourcingEntry";
import MarketHero from "./components/MarketHero";
import {
  MarketResultRow,
  marketDateLabel as dateLabel,
  marketKindLabel as kindLabel,
} from "./components/MarketResultRow";
import { Button } from "./components/ui/Button";
import { Disclosure } from "./components/ui/Disclosure";
import { SegmentedControl } from "./components/ui/SegmentedControl";
import { Dialog } from "./components/Dialog";
import LiveResearch, {
  type ResearchStatus,
  type ResearchResumeRequest,
  type WebSearchRequest,
} from "./components/LiveResearch";
import ExtractionReview from "./components/ExtractionReview";
import type { SavedComparison } from "./components/SavedComparisons";
import DocumentExtraction from "./components/DocumentExtraction";
import IngredientIntake from "./components/IngredientIntake";
import SavedStudies, { type SavedStudy } from "./components/SavedStudies";
import type { Id } from "../convex/_generated/dataModel";
import StudySelections from "./components/StudySelections";
import SourcingCase, { type StudyCaseLink, type FollowupLocation } from "./components/SourcingCase";
import {
  sameStudyContext,
  studyOptionCount,
  type StudyProspect,
  type WebSelection,
} from "./domain/study";

type MarketCheckpoint = {
  study: { id: Id<"studies"> | null; revision: number; savedSelectedIds: string[];
    savedContext?: { term: string; region: string }; clientId: string };
  catalog: MarketResult[];
  term: string; region: string; search: { term: string; region: string } | null;
  selectedIds: string[]; webSelections: WebSelection[]; prospects: StudyProspect[];
  filter: "all" | "catalog" | "distributor" | "reference";
  showStudy: boolean; resultsView: "example" | "web"; searchOpen: boolean;
  continuityOpen: boolean; extrasIngredientOpen: boolean; extrasQuotesOpen: boolean;
  researchCursor: Omit<ResearchResumeRequest, "sequence"> | null;
};

export default function MarketStudy({
  onPrepare,
  onManualExample,
  persistenceEnabled,
  followup,
  active,
  onOpenFollowup,
  onExitFollowup,
  onBackFollowup,
  followupBackLabel,
  messages,
  onOpenMessages,
  onSelectMessage,
}: {
  persistenceEnabled: boolean;
  active: boolean;
  followup: FollowupLocation | null;
  onOpenFollowup: (id: string | null, requestId?: string) => void;
  onExitFollowup: () => void;
  onBackFollowup: () => void;
  followupBackLabel?: string;
  messages: { requestId?: string; visit: number } | null;
  onOpenMessages: () => void;
  onSelectMessage: (id?: string) => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onManualExample: () => void;
}) {
  const [restored] = useState(() => readWorkspaceCheckpoint<MarketCheckpoint>("market"));
  const [researchCursor, setResearchCursor] = useState(restored?.researchCursor ?? null);
  const [study, setStudy] = useState<{
    id: Id<"studies"> | null;
    revision: number;
    savedSelectedIds: string[];
    savedContext?: { term: string; region: string };
    clientId: string;
  }>(() => restored?.study ?? ({
    id: null,
    revision: 0,
    savedSelectedIds: [],
    clientId: crypto.randomUUID(),
  }));
  const [studyCase, setStudyCase] = useState<StudyCaseLink>({
    studyId: null,
    ready: false,
  });
  const currentStudyCase =
    study.id && studyCase.studyId === study.id ? studyCase : null;
  const caseLinkPending = Boolean(
    persistenceEnabled &&
    study.id &&
    (!currentStudyCase || !currentStudyCase.ready),
  );
  const [entry, setEntry] = useState<SourcingEntryRequest | null>(null);
  const [resumeResearch, setResumeResearch] = useState<ResearchResumeRequest | null>(() => restored?.researchCursor ? { ...restored.researchCursor, sequence: 0 } : null);
  const [continuityOpen, setContinuityOpen] = useState(restored?.continuityOpen ?? false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionContext, setQuestionContext] = useState<{ ingredient: string; region: string } | null>(null);
  const [webStatus, setWebStatus] = useState<ResearchStatus | undefined>();
  const [webRequest, setWebRequest] = useState<WebSearchRequest | null>(null);
  const samplePeru = new URLSearchParams(window.location.search).get("example") === "pe";
  const [catalog, setCatalog] = useState<MarketResult[]>(restored?.catalog ?? allMarketExamples);
  const [term, setTerm] = useState(restored?.term ?? "");
  const [region, setRegion] = useState(
    restored?.region ?? (samplePeru ? "Lima" : "Portland, OR, US"),
  );
  const [search, setSearch] = useState<{ term: string; region: string } | null>(
    restored?.search ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(restored?.selectedIds ?? []);
  const [webSelections, setWebSelections] = useState<WebSelection[]>(restored?.webSelections ?? []);
  const [prospects, setProspects] = useState<StudyProspect[]>(restored?.prospects ?? []);
  const optionCount = studyOptionCount({
    selectedIds,
    webSelections,
    prospects,
  });
  const [filter, setFilter] = useState<
    "all" | "catalog" | "distributor" | "reference"
  >(restored?.filter ?? "all");
  const [source, setSource] = useState<MarketResult | null>(null);
  const [quote, setQuote] = useState<MarketResult | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [copyState, setCopyState] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(restored?.searchOpen ?? false);
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [caseReply, setCaseReply] = useState<PurchaseSeed | null>(null);
  const [replyEquivalent, setReplyEquivalent] = useState(false);
  function prepareStudyReply(seed: PurchaseSeed) {
    if (caseLinkPending) {
      setError("The saved study is still loading. Try again once it is ready.");
      return;
    }
    if (currentStudyCase?.comparison) {
      setCaseReply(seed);
      setReplyEquivalent(false);
    } else onPrepare({ ...seed, sourcingCaseId: currentStudyCase?.caseId });
  }

  function openUpdatedReplyComparison(comparison: SavedComparison) {
    onPrepare({ ...comparison, sourcingCaseId: currentStudyCase?.caseId,
      resumeComparison: { id: comparison.id, revision: comparison.revision, selectedOfferId: comparison.selectedOfferId, unchanged: true } });
  }

  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [showStudy, setShowStudy] = useState(restored?.showStudy ?? false);
  const [resultsView, setResultsView] = useState<"example" | "web">(restored?.resultsView ?? "example");
  const [nextIngredient, setNextIngredient] = useState<string | null>(null);
  const [extrasIngredientOpen, setExtrasIngredientOpen] = useState(restored?.extrasIngredientOpen ?? false);
  const [extrasQuotesOpen, setExtrasQuotesOpen] = useState(restored?.extrasQuotesOpen ?? false);

  useEffect(() => {
    writeWorkspaceCheckpoint<MarketCheckpoint>("market", {
      study, catalog, term, region, search, selectedIds, webSelections, prospects,
      filter, showStudy, resultsView, searchOpen, continuityOpen,
      extrasIngredientOpen, extrasQuotesOpen, researchCursor,
    });
  }, [study, catalog, term, region, search, selectedIds, webSelections, prospects,
    filter, showStudy, resultsView, searchOpen, continuityOpen,
    extrasIngredientOpen, extrasQuotesOpen, researchCursor]);

  function openExtras(target: "ingredients" | "quotes") {
    if (target === "ingredients") {
      setExtrasIngredientOpen(true);
    } else {
      setExtrasQuotesOpen(true);
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(
        target === "ingredients"
          ? "disclosure-ingredients"
          : "disclosure-quotes",
      );
      const trigger = el?.querySelector<HTMLElement>(".disclosure-trigger");
      scrollToContent(el, trigger ?? el);
    });
  }
  const results = search
    ? filterMarketExamples(catalog, search.term, search.region)
    : [];
  const selected = catalog.filter((item) => selectedIds.includes(item.id));
  const visible = (showStudy ? selected : results).filter(
    (item) => filter === "all" || item.kind === filter,
  );
  const filteredEmpty =
    filter !== "all" && (showStudy ? selected : results).length > 0;
  const priced = selected.filter(
    (item): item is CatalogResult => item.kind === "catalog",
  );
  const sourceTitle = search
    ? `${search.term} in ${search.region}`
    : "Your study";
  const showExampleWorkspace = resultsView === "example" || showStudy;
  const hasVisibleExternalSelection =
    webSelections.some(
      ({ seed }) =>
        filter === "all" ||
        (filter === "catalog" && seed.offers[0].priceCents !== null) ||
        (filter === "distributor" && seed.offers[0].priceCents === null),
    ) ||
    (prospects.length > 0 && (filter === "all" || filter === "distributor"));

  const selectedContext = webSelections[0] ?? prospects[0] ?? findMarketExampleContextByIds(selectedIds)
    ?? (study.savedContext ? { ingredient: study.savedContext.term, region: study.savedContext.region } : null);
  const currentViewContext = showStudy && selectedContext?.ingredient && selectedContext.region
    ? { ingredient: selectedContext.ingredient, region: selectedContext.region }
    : { ingredient: search?.term ?? term, region: search?.region ?? region };
  const followupContext = questionOpen && questionContext ? questionContext : currentViewContext;

  function openQuestion(context: { ingredient: string; region: string }) {
    setQuestionContext(context);
    setQuestionOpen(true);
  }

  function renderResultActions(context?: { ingredient: string; region: string } | null) {
    const currentContext = context ?? currentViewContext;
    const linkedCase = study.savedContext && sameStudyContext(
      { ingredient: study.savedContext.term, region: study.savedContext.region }, currentContext,
    ) ? currentStudyCase?.caseId : undefined;
    return <div className="market-result-actions" role="group" aria-label="Search actions">
      <Button variant="text" aria-expanded={searchOpen} aria-controls="search-editor" onClick={() => {
        setSearchOpen(!searchOpen);
        if (!searchOpen) {
          if (!search || !sameStudyContext(
            { ingredient: search.term, region: search.region }, currentContext,
          )) {
            setTerm(currentContext.ingredient);
            setRegion(currentContext.region);
          }
          requestAnimationFrame(() => scrollToContent(
            document.getElementById("market-search"),
            document.querySelector<HTMLInputElement>("#market-search input"),
          ));
        }
      }}><PenLine size={16} />{searchOpen ? "Close search" : "Change search"}</Button>
      {persistenceEnabled && <Button variant="text" onClick={() => linkedCase ? onOpenFollowup(linkedCase) : openQuestion(currentContext)}>
        {linkedCase ? "Open supplier follow-up" : "Research a question"}
      </Button>}
    </div>;
  }

  function canAddContext(context: { ingredient?: string; region?: string }) {
    const existing =
      webSelections[0] ??
      prospects[0] ??
      findMarketExampleContextByIds(selectedIds) ??
      null;
    if (existing && !sameStudyContext(existing, context)) {
      setError(
        "This option belongs to a different ingredient or area. Save this study and start another before adding it.",
      );
      return false;
    }
    return true;
  }

  function addReview(selection: WebSelection) {
    if (!canAddContext(selection)) return;
    setWebSelections((current) =>
      current.some((item) => item.sourceId === selection.sourceId)
        ? current.map((item) =>
            item.sourceId === selection.sourceId ? selection : item,
          )
        : current.length < 3
          ? [...current, selection]
          : current,
    );
  }

  function toggleProspect(prospect: StudyProspect) {
    if (!canAddContext(prospect)) return;
    setProspects((current) =>
      current.some((item) => item.id === prospect.id)
        ? current.filter((item) => item.id !== prospect.id)
        : current.length < 3
          ? [...current, prospect]
          : current,
    );
  }

  function beginIngredientStudy(ingredient: string) {
    setCatalog(allMarketExamples);
    setSelectedIds([]);
    setWebSelections([]);
    setProspects([]);
    setStudy({
      id: null,
      revision: 0,
      savedSelectedIds: [],
      clientId: crypto.randomUUID(),
    });
    setTerm(ingredient);
    setSearch({ term: ingredient, region });
    setResultsView("example");
    setShowStudy(false);
    setFilter("all");
    setError("");
    setNextIngredient(null);
  }

  function resumeSavedResearch(id: string, ingredient: string, area: string) {
    const context = webSelections[0] ?? prospects[0] ?? findMarketExampleContextByIds(selectedIds)
      ?? (study.savedContext ? { ingredient: study.savedContext.term, region: study.savedContext.region } : null);
    if (context && !sameStudyContext(context, { ingredient, region: area })) {
      setSelectedIds([]);
      setWebSelections([]);
      setProspects([]);
      setCatalog(allMarketExamples);
      setStudy({ id: null, revision: 0, savedSelectedIds: [], clientId: crypto.randomUUID() });
    }
    setWebRequest(null);
    setResumeResearch({ id, sequence: Date.now() });
    setResearchCursor({ id });
    setTerm(ingredient);
    setRegion(area);
    setSearch({ term: ingredient, region: area });
    setResultsView("web");
    setShowStudy(false);
    setFilter("all");
    setError("");
    setContinuityOpen(false);
    if (followup || messages) onExitFollowup();
  }

  function validateSearchIngredient() {
    if (term.trim()) {
      setSearchError("");
      return true;
    }
    setSearchError("Enter an ingredient or category to explore.");
    document.querySelector<HTMLInputElement>("#market-search input")?.focus();
    return false;
  }

  function searchWeb() {
    if (!validateSearchIngredient() || !region.trim()) return;
    setSearch({ term: term.trim(), region: region.trim() });
    setError("");
    setResultsView("web");
    setSearchOpen(false);
    setShowStudy(false);
    setFilter("all");
    const clientId = crypto.randomUUID();
    setResearchCursor({ clientId });
    setWebRequest((current) => ({
      clientId,
      id: (current?.id ?? 0) + 1,
      ingredient: term.trim(),
      region,
    }));
  }

  function explore(event?: FormEvent) {
    event?.preventDefault();
    if (!validateSearchIngredient()) return;
    setError("");
    setSearch({ term: term.trim(), region: region.trim() });
    setResultsView("example");
    setSearchOpen(false);
    setShowStudy(false);
    setFilter("all");
  }
  function startExample() {
    const sample = samplePeru ? marketExamples : usMarketExamples;
    const sampleTerm = sample[0].ingredient;
    const sampleRegion = sample[0].region;
    if (optionCount > 0 && !canAddContext({ ingredient: sampleTerm, region: sampleRegion })) return;
    setCatalog(allMarketExamples);
    setTerm(sampleTerm);
    setRegion(sampleRegion);
    setSearch({ term: sampleTerm, region: sampleRegion });
    setResultsView("example");
    setSearchOpen(false);
    setFilter("all");
    setShowStudy(false);
    setError("");
  }
  function openStudy(saved: SavedStudy) {
    setCatalog(saved.results);
    setSelectedIds(saved.selectedIds);
    setWebSelections(
      (saved.webSelections ?? []).map((item) => ({
        ...item,
        ingredient: item.ingredient ?? saved.term,
        region: item.region ?? saved.region,
      })),
    );
    setProspects(saved.prospects ?? []);
    setTerm(saved.term);
    setRegion(saved.region);
    setSearch({ term: saved.term, region: saved.region });
    const sourceRunId = (saved.webSelections ?? [])
      .flatMap(item => Object.values(item.seed.sources))
      .find(source => source.webReview)?.webReview?.runId
      ?? saved.prospects?.[0]?.runId;
    setWebRequest(null);
    setResumeResearch(sourceRunId ? { id: sourceRunId, sequence: Date.now() } : null);
    setResearchCursor(sourceRunId ? { id: sourceRunId } : null);
    setResultsView(sourceRunId ? "web" : "example");
    setStudy({
      id: saved.id,
      savedContext: { term: saved.term, region: saved.region },
      revision: saved.revision,
      savedSelectedIds: saved.selectedIds,
      clientId: crypto.randomUUID(),
    });
    setShowStudy(true);
    setFilter("all");
    setError("");
  }
  function toggle(result: MarketResult) {
    if (!selectedIds.includes(result.id) && !canAddContext(result)) return;
    if (showStudy && selectedIds.includes(result.id)) {
      requestAnimationFrame(() =>
        document
          .getElementById("results-title")
          ?.focus({ preventScroll: true }),
      );
    }
    setSelectionMessage(
      `${result.supplier}: ${selectedIds.includes(result.id) ? "removed from study" : "added to study"}. Save your study to keep these changes.`,
    );
    setSelectedIds((current) =>
      current.includes(result.id)
        ? current.filter((id) => id !== result.id)
        : [...current, result.id],
    );
  }
  function contextualProspect(prospect: StudyProspect, intent: "inquiry" | "research") {
    if (!canAddContext(prospect)) return;
    setEntry({ supplier: prospect.supplier, intent, target: { prospectId: prospect.id }, draft: {
      clientId: study.clientId, id: study.id, expectedRevision: study.revision,
      term: prospect.ingredient, region: prospect.region, selectedIds, webSelections,
      prospects: [...prospects.filter(p => p.id !== prospect.id), prospect],
    } });
  }
  const entryReady = (saved: SavedStudy, caseId: Id<"sourcingCases">, requestId: Id<"quotationRequests"> | null) => {
    openStudy(saved);
    setEntry(null);
    onOpenFollowup(caseId, requestId ?? undefined);
  };
  function calculate(seed: PurchaseSeed, context?: { ingredient: string; region: string }) {
    const useCurrentStudy = !context || (study.savedContext && sameStudyContext({ ingredient: study.savedContext.term, region: study.savedContext.region }, context));
    if (!useCurrentStudy) { onPrepare(seed); return; }
    if (caseLinkPending) { setError("Wait for the saved study context before calculating."); return; }
    if (currentStudyCase?.comparison) { openUpdatedReplyComparison(currentStudyCase.comparison); return; }
    onPrepare({ ...seed, sourcingCaseId: currentStudyCase?.caseId });
  }
  function requestQuote(result: MarketResult) {
    if (persistenceEnabled && result.kind === "distributor") {
      if (!canAddContext(result)) return;
      setEntry({ supplier: result.supplier, intent: "inquiry", target: { resultId: result.id }, draft: {
        clientId: study.clientId, id: study.id, expectedRevision: study.revision,
        term: search?.term ?? result.ingredient, region: search?.region ?? result.region,
        selectedIds: [...new Set([...selectedIds, result.id])], webSelections, prospects,
      } });
      return;
    }
    setQuote(result);
    setCopyState("");
    setQuoteText(
      `Hello, I am researching ${result.ingredient.toLowerCase()} for a restaurant in ${search?.region ?? result.region}. Could you share pack sizes, prices, tax, minimum order and delivery coverage? This is a market inquiry; I have not set a purchase quantity yet. Thank you.`,
    );
  }
  useEffect(() => {
    setSearchError("");
  }, [search, showStudy, followup, messages]);

  const previousMarketPosition = useRef({ search, showStudy, searchOpen });
  useEffect(() => {
    const previous = previousMarketPosition.current;
    previousMarketPosition.current = { search, showStudy, searchOpen };
    if (previous.search === search && previous.showStudy === showStudy && previous.searchOpen === searchOpen) return;
    if (!active || (!search && !showStudy) || (searchOpen && !showStudy)) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById("results-title");
      scrollToContent(document.getElementById("market-main"), heading);
    });
    return () => cancelAnimationFrame(frame);
  }, [search, showStudy, searchOpen]);

  useEffect(() => {
    const summary = document.getElementById("study-summary");
    if (!summary) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSummaryVisible(entry.isIntersecting),
      {
        rootMargin: "-100px 0px -100px 0px",
        threshold: 0.15,
      },
    );
    observer.observe(summary);
    return () => observer.disconnect();
  }, []);

  function prepare() {
    try {
      if (caseLinkPending)
        throw new Error(
          "The saved study is still loading. Wait before preparing its comparison.",
        );
      onPrepare({
        ...preparePurchaseFromCatalog(selected, confirmed),
        ...(currentStudyCase?.caseId
          ? { sourcingCaseId: currentStudyCase.caseId }
          : {}),
      });
      setPrepareOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review your shortlist.");
    }
  }

  return (
    <>
      <a
        href={messages ? "#messages-main" : followup ? "#followup-main" : search || showStudy || resultsView === "web" ? "#market-results" : "#market-search"}
        className="skip-link"
      >
        Skip to content
      </a>
      <header className="topbar market-topbar">
        <Brand />
        <nav className="brand-nav" aria-label="Main navigation">
          <Button
            variant="text"
            className="brand-explore"
            aria-current={!followup && !messages && !showStudy ? "page" : undefined}
            onClick={() => {
              if (followup || messages) onExitFollowup();
              setShowStudy(false);
              setFilter("all");
              setSearchOpen(true);
              requestAnimationFrame(() => {
                scrollToContent(
                  document.getElementById("market-search"),
                  document.querySelector<HTMLInputElement>("#market-search input"),
                );
              });
            }}
          >
            Explore suppliers
          </Button>
          <Button
            variant="text"
            aria-current={!followup && !messages && showStudy ? "page" : undefined}
            onClick={() => {
              if (followup || messages) onExitFollowup();
              setShowStudy(true);
              setFilter("all");
            }}
          >
            <Bookmark size={18} />
            My study
            {optionCount > 0 && (
              <span className="selection-count">{optionCount}</span>
            )}
          </Button>
          {persistenceEnabled && <MessagesLink active={Boolean(messages)} onClick={onOpenMessages} />}
          {persistenceEnabled && <Button variant="text" onClick={() => setContinuityOpen(true)}>Continue your work</Button>}
        </nav>
      </header>
      <div hidden={Boolean(followup || messages)}>
      <main
        id="market-main"
        className={`market-main ${search || showStudy ? "has-results" : "is-intro"} ${showStudy ? "is-study" : ""} ${resultsView === "web" ? "is-live-research" : ""}`}
      >
        <div className="workspace-nav">
          <span>
            <Search size={16} />
            Explore suppliers
          </span>
        </div>
        <div className="market-hero" hidden={Boolean(search || showStudy || resultsView === "web") && !searchOpen}>
          <div className="hero-workspace">
            <div
              className={`market-intro ${search || showStudy ? "sr-only" : ""}`}
            >
              <h1 tabIndex={-1}>
                {search || showStudy ? (
                  showStudy ? (
                    "Your options, side by side."
                  ) : (
                    "Find your next supplier."
                  )
                ) : (
                  <>
                    Good judgment.
                    <br />
                    Better ingredients.
                  </>
                )}
              </h1>
              <p>
                Find suppliers, compare the real cost and decide with confidence.
              </p>
            </div>
            <div
              id="search-editor"
              hidden={Boolean(search || showStudy || resultsView === "web") && !searchOpen}
            >
              <form
                id="market-search"
                className="market-search"
                onSubmit={(event) => { event.preventDefault(); if (persistenceEnabled && !webStatus) return; if (webStatus?.searchEnabled) searchWeb(); else explore(); }}
              >
                <label className="field">
                  <span>Ingredient or category</span>
                  <div className="search-input">
                    <Search size={20} />
                    <input
                      aria-label="Ingredient or category"
                      value={term}
                      onChange={(e) => {
                        setTerm(e.target.value);
                        setSearchError("");
                      }}
                      placeholder="e.g. long-grain white rice"
                      maxLength={120}
                      aria-invalid={!!searchError}
                      aria-describedby={
                        searchError
                          ? "market-search-error"
                          : undefined
                      }
                    />
                  </div>
                </label>
                <label className="field">
                  <span>Delivery area</span>
                  <input
                    aria-label="Delivery area"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    list="delivery-area-suggestions"
                    placeholder="City, state, country (e.g. Portland, OR, US)"
                    maxLength={80}
                    required
                  />
                  <datalist id="delivery-area-suggestions">
                    {[
                      "Portland, OR, US",
                      "Chicago, IL, US",
                      "Miami, FL, US",
                      "Lima",
                      "Arequipa",
                      "Cusco",
                    ].map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                </label>
                <Button type="submit" variant="primary" disabled={persistenceEnabled && !webStatus}>
                  <Search size={18} />
                  {persistenceEnabled && !webStatus ? "Checking search…" : webStatus?.searchEnabled ? "Search suppliers" : "Explore demo catalog"}
                </Button>
                {searchError && (
                  <p id="market-search-error" className="field-error market-search-error" role="alert">
                    {searchError}
                  </p>
                )}
                <div className="market-search-support">
                  {webStatus?.searchEnabled && <Button variant="text" type="button" onClick={() => explore()}>Explore demo catalog</Button>}
                  <p className="market-search-note">
                    <Info size={16} />
                    Sample data is separate from live search.{" "}
                    {webStatus?.searchEnabled
                      ? webStatus?.autoReviewEnabled ? "Live search finds supplier sources. AI analyzes up to 3 product pages first; you can review more from the results." : "Live search checks public supplier sources."
                      : persistenceEnabled && !webStatus
                        ? "Checking live search availability…"
                        : "Demo catalog · fictional examples in Portland / Lima. Live search is unavailable."}
                  </p>
                </div>
              </form>
            </div>
            {!search && !showStudy && (
              <section
                className="market-start"
                aria-label="Sample study"
              >
                <span>Want to try it first?</span>
                <Button variant="text" onClick={startExample}>
                  Explore rice example <ArrowRight size={17} />
                </Button>
                {persistenceEnabled && <Button variant="text" onClick={() => openQuestion({ ingredient: term, region })}>Research a question</Button>}
                <span className="market-start-divider" aria-hidden="true">·</span>
                <Button
                  variant="text"
                  type="button"
                  onClick={() => openExtras("quotes")}
                >
                  <FileText size={16} />
                  Read a quote
                </Button>
                <span className="market-start-divider" aria-hidden="true">·</span>
                <Button
                  variant="text"
                  type="button"
                  onClick={() => openExtras("ingredients")}
                >
                  <ListPlus size={16} />
                  Import ingredient list
                </Button>
              </section>
            )}
          </div>
          {!search && !showStudy && resultsView !== "web" && <MarketHero />}
        </div>
        {error && !prepareOpen && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {persistenceEnabled && !search && !showStudy && resultsView !== "web" && <ContinueWork
          onStudy={openStudy}
          onCase={(id, _saved, requestId) => onOpenFollowup(id, requestId)}
          onResearch={resumeSavedResearch}
          onComparison={comparison => { setContinuityOpen(false); onPrepare({ ...comparison, resumeComparison: { id: comparison.id, revision: comparison.revision, selectedOfferId: comparison.selectedOfferId, unchanged: true } }); }}
        />}
        <div className="market-support">
          <div className="market-workspace">
          <div className="market-content">
            {persistenceEnabled && (
              <div
                id={resultsView === "web" && !showStudy ? "market-results" : undefined}
                tabIndex={-1}
                className="live-research-view"
                hidden={showStudy || resultsView !== "web"}
                aria-label="Supplier search results"
              >
                <LiveResearch
                  renderHeaderActions={renderResultActions}
                  resumeRequest={resumeResearch}
                  onActiveRun={setResearchCursor}
                  onContextualProspect={contextualProspect}
                  onCalculate={calculate}
                  caseComparisonContext={currentStudyCase?.comparison && study.savedContext ? { ingredient: study.savedContext.term, region: study.savedContext.region } : undefined}
                  onExploreDemo={startExample}
                  selections={webSelections}
                  onReview={addReview}
                  onOpenStudy={() => {
                    setShowStudy(true);
                    setFilter("all");
                  }}
                  onBackToOverview={() => {
                    setResultsView("example");
                    setShowStudy(false);
                  }}
                  selectedProspectIds={prospects.map((item) => item.id)}
                  onProspect={toggleProspect}
                  request={webRequest}
                  onStatus={setWebStatus}
                  onPrepare={onPrepare}
                />
              </div>
            )}
            {showExampleWorkspace && (search || showStudy) && (
              <section id="market-results" tabIndex={-1} aria-labelledby="results-title">
                <div className="section-heading market-results-heading">
                  <div>
                    <h2 id="results-title" tabIndex={-1}>
                      {showStudy ? "My market study" : sourceTitle}
                    </h2>
                    <p>
                      {showStudy
                        ? `${optionCount} ${optionCount === 1 ? "selected option" : "selected options"} in this study`
                        : `${results.length} sample results · Not a measure of market coverage`}
                    </p>
                  </div>
                  <div className="market-heading-controls">
                  {renderResultActions()}
                  {showStudy && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowStudy(false);
                        setFilter("all");
                      }}
                    >
                      Back to results
                    </Button>
                  )}
                  </div>
                </div>
                <div className="market-toolbar">
                  <SegmentedControl
                    label="Result types"
                    value={filter}
                    onValueChange={setFilter}
                    options={
                      [
                        { value: "all", label: "All" },
                        { value: "catalog", label: "With prices" },
                        { value: "distributor", label: "No price" },
                        { value: "reference", label: "References" },
                      ] as const
                    }
                  />
                </div>
                {showStudy && (
                  <StudySelections
                    onInquiry={prospect => contextualProspect(prospect, "inquiry")}
                    selections={webSelections}
                    prospects={prospects}
                    filter={filter}
                    onRemove={(id) =>
                      setWebSelections((current) =>
                        current.filter((item) => item.sourceId !== id),
                      )
                    }
                    onRemoveProspect={(id) =>
                      setProspects((current) =>
                        current.filter((item) => item.id !== id),
                      )
                    }
                    onPrepare={calculate}
                    onReplyPrepare={prepareStudyReply}
                    deliveryComparison={currentStudyCase?.comparison}
                    onDeliveryApplied={openUpdatedReplyComparison}
                    onOpenComparison={openUpdatedReplyComparison}
                  />
                )}
                {visible.length === 0 && !(showStudy && hasVisibleExternalSelection) ? (
                  <div className="empty-state">
                    <Search size={32} />
                    <h3>
                      {filteredEmpty
                        ? "No options match this filter"
                        : showStudy
                          ? "Your study is empty"
                          : "No examples match this search"}
                    </h3>
                    <p>
                      {filteredEmpty
                        ? "Your options are still here. Change the filter to see them."
                        : showStudy
                          ? "Add options to build your study. A purchase plan is optional."
                          : "This does not mean there are no suppliers. Try live search or open a sample study."}
                    </p>
                    {filteredEmpty ? (
                      <Button
                        variant="secondary"
                        onClick={() => setFilter("all")}
                      >
                        View all options
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={startExample}>
                        View rice example
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="market-results" data-filter={filter}>
                    {visible.map((result) => (
                      <MarketResultRow
                        key={result.id}
                        result={result}
                        selected={selectedIds.includes(result.id)}
                        onToggle={toggle}
                        onSource={setSource}
                        onQuote={requestQuote}
                        onCalculate={result => calculate(preparePurchaseFromCatalog([result], true), result)}
                        calculateBlocked={caseLinkPending}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          <aside
            id="study-summary"
            className="study-rail"
            aria-label="Study summary"
            hidden={!search && !showStudy && resultsView !== "web"}
          >
            <div className="study-rail-heading">
              <Bookmark size={20} />
              <h2 id="study-summary-title" tabIndex={-1}>
                {search || showStudy ? "Your study" : "Your saved studies"}
              </h2>
              {optionCount > 0 && (
                <span className="study-count" aria-hidden="true">
                  {optionCount}
                </span>
              )}
            </div>
            {optionCount > 0 && (
              <p className="study-total">
                {optionCount} {optionCount === 1 ? "option" : "options"} in your
                study
              </p>
            )}
            {(search || showStudy) && optionCount === 0 && (
              <div className="study-empty">
                <h3>Keep the options that matter.</h3>
                <p>
                  Add prices, supplier contacts or references. You can research without planning a purchase.
                </p>
              </div>
            )}
            {selected.length > 0 && !showStudy && (
              <ul className="study-picks" aria-label="Selected options">
                {selected.map((item) => (
                  <li key={item.id}>
                    <Check size={16} aria-hidden="true" />
                    <div>
                      <strong>{item.supplier}</strong>
                      <span>{kindLabel(item)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="study-library">
              {persistenceEnabled ? (
                <SavedStudies
                  draft={{
                    clientId: study.clientId,
                    id: study.id,
                    expectedRevision: study.revision,
                    term: search?.term ?? "",
                    region: search?.region ?? region,
                    selectedIds,
                    webSelections,
                    prospects,
                  }}
                  onOpen={openStudy}
                  onSaved={(saved) =>
                    setStudy((current) =>
                      current.clientId === study.clientId
                        ? {
                            ...current,
                            id: saved.id,
                            revision: saved.revision,
                            savedSelectedIds: saved.selectedIds,
                            savedContext: {
                              term: saved.term,
                              region: saved.region,
                            },
                          }
                        : current,
                    )
                  }
                />
              ) : (
                <p className="field-hint">
                  Saving is unavailable. You can explore examples, but this selection will be lost on reload.
                </p>
              )}
            </div>
            {optionCount > 0 && (
              <section
                className="study-next"
                aria-labelledby="study-next-title"
              >
                <h3 id="study-next-title">Ready to plan a purchase?</h3>
                <p>
                  Use your selected prices, or keep researching.
                </p>
                <div className="study-next-actions">
                  <Button
                    variant="secondary"
                    disabled={
                      caseLinkPending ||
                      (!currentStudyCase?.comparison && priced.length === 0 && webSelections.length === 0)
                    }
                    onClick={() => {
                      if (!currentStudyCase?.comparison && priced.length === 0 && webSelections.length > 0) {
                        setShowStudy(true);
                        setFilter("all");
                        return;
                      }
                      if (currentStudyCase?.comparison) {
                        const comparison = currentStudyCase.comparison;
                        onPrepare({
                          ...comparison,
                          sourcingCaseId: currentStudyCase.caseId,
                          resumeComparison: {
                            id: comparison.id,
                            revision: comparison.revision,
                            selectedOfferId: comparison.selectedOfferId,
                            unchanged: true,
                          },
                        });
                        return;
                      }
                      setPrepareOpen(true);
                      setConfirmed(false);
                      setError("");
                    }}
                  >
                    {currentStudyCase?.comparison
                      ? "Open saved case comparison"
                      : caseLinkPending
                        ? "Loading study context…"
                        : priced.length === 0 && webSelections.length > 0
                          ? "Review purchase options"
                          : "Plan purchase"}{" "}
                    <ArrowRight size={17} />
                  </Button>
                  {priced.length === 0 && webSelections.length === 0 && (
                    <small>
                      Add a priced offer or request a quote to calculate a purchase.
                    </small>
                  )}
                </div>
              </section>
            )}
          </aside>
          </div>
        </div>
        <section
          className="workspace-extras"
          aria-labelledby="workspace-extras-title"
        >
          <div className="extras-heading">
            <FolderOpen size={20} />
            <div>
              <h2 id="workspace-extras-title">Start with what you have</h2>
              <p>
                Bring an ingredient list or a quote to review.
              </p>
            </div>
          </div>
          <div className="extras-grid">
            <Disclosure
              id="disclosure-ingredients"
              title="Ingredient list"
              description="Research the ingredients on your list, one at a time."
              open={extrasIngredientOpen}
              onOpenChange={setExtrasIngredientOpen}
            >
              <IngredientIntake
                persistenceEnabled={persistenceEnabled}
                activeIngredient={search?.term ?? null}
                onExplore={(ingredient) => {
                  if (ingredient === search?.term) return;
                  if (optionCount > 0 || study.id)
                    setNextIngredient(ingredient);
                  else beginIngredientStudy(ingredient);
                }}
              />
            </Disclosure>
            <Disclosure
              id="disclosure-quotes"
              title="Quotes and documents"
              description="Review a quote or enter its details."
              open={extrasQuotesOpen}
              onOpenChange={setExtrasQuotesOpen}
            >
              <div className="quotes-quickstart">
                <div className="intake-actions">
                  <div className="quotes-actions">
                    <ExtractionReview onPrepare={onPrepare} />
                    <button
                      className="button secondary"
                      type="button"
                      onClick={onManualExample}
                    >
                      <PenLine size={17} />
                      Enter quote manually
                    </button>
                  </div>
                  <span>Synthetic sample quote or manual price entry</span>
                </div>
              </div>
              {persistenceEnabled && (
                <DocumentExtraction onPrepare={onPrepare} />
              )}
            </Disclosure>
          </div>
        </section>
        <p
          className="sr-only"
          role="status"
          aria-label="Study selection"
          aria-live="polite"
        >
          {selectionMessage}
        </p>
        {optionCount > 0 && !summaryVisible && (
          <Button
            variant="primary"
            className="mobile-study-link"
            onClick={() => {
              scrollToContent(
                document.getElementById("study-summary"),
                document.getElementById("study-summary-title"),
              );
            }}
          >
            <Bookmark size={18} />
            View summary{" "}
            <span className="mobile-study-count">{optionCount}</span>
            <ArrowRight size={18} />
          </Button>
        )}
        <footer>
          <span>
            Save your study to return to your sources and shortlist. Save purchase comparisons separately.
          </span>
          <span>
            Examples use fictional data. Review each email before sending.
          </span>
        </footer>
      </main>
      </div>
          {messages && (persistenceEnabled ? <Messages {...messages} onSelect={onSelectMessage} onBack={onExitFollowup} onPrepare={onPrepare} onOpenFollowup={onOpenFollowup} /> : <main id="messages-main" className="messages-main"><h1>Messages are unavailable</h1><p>Storage is disconnected.</p><Button onClick={onExitFollowup}>Back to workspace</Button></main>)}
          {!persistenceEnabled && followup && <main id="followup-main" className="followup-main">
            <Button variant="text" onClick={onExitFollowup}><ArrowLeft size={16} />Back to workspace</Button>
            <h1>Saved follow-ups are unavailable</h1>
            <p>Storage is disconnected. Return to your workspace to keep exploring.</p>
          </main>}
          {persistenceEnabled && (
            <SourcingCase
              location={followup}
              questionOpen={questionOpen}
              onCloseQuestion={() => setQuestionOpen(false)}
              onOpen={(id, requestId) => { setQuestionOpen(false); onOpenFollowup(id, requestId); }}
              onBack={onBackFollowup}
              backLabel={followupBackLabel}
              onOpenStudy={saved => { openStudy(saved); onExitFollowup(); }}
              ingredient={followupContext.ingredient}
              region={followupContext.region}
              studyId={study.savedContext && sameStudyContext(
                { ingredient: study.savedContext.term, region: study.savedContext.region },
                followupContext,
              ) ? study.id : null}
              onPrepare={onPrepare}
              onStudyCase={setStudyCase}
              comparisonStudyId={study.id}
            />
          )}
      {entry && <SourcingEntry entry={entry} onReady={entryReady} onClose={() => setEntry(null)} />}
      {continuityOpen && <Dialog title="Your recent work" className="continuity-dialog" onClose={() => setContinuityOpen(false)}>
        <ContinueWork
          onStudy={saved => { openStudy(saved); if (followup || messages) onExitFollowup(); setContinuityOpen(false); }}
          onCase={(id, _saved, requestId) => { onOpenFollowup(id, requestId); setContinuityOpen(false); }}
          onResearch={resumeSavedResearch}
          onComparison={comparison => { setContinuityOpen(false); onPrepare({ ...comparison, resumeComparison: { id: comparison.id, revision: comparison.revision, selectedOfferId: comparison.selectedOfferId, unchanged: true } }); }}
        />
      </Dialog>}
      {nextIngredient && (
        <Dialog
          title="Research another ingredient"
          onClose={() => setNextIngredient(null)}
        >
          <p>
            Start a study for {nextIngredient}. Your current selection will not carry over. Save it first if you want to keep it.
          </p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setNextIngredient(null)}>
              Back to study
            </Button>
            <Button
              variant="primary"
              onClick={() => beginIngredientStudy(nextIngredient)}
            >
              Start another study
            </Button>
          </div>
        </Dialog>
      )}
      {source && (
        <Dialog
          title={
            source.kind === "distributor"
              ? "Supplier source and contact"
              : "Result source"
          }
          onClose={() => setSource(null)}
        >
          <span className="demo-badge">Sample data</span>
          <div className="source-document">
            <h3>{source.source.title}</h3>
            <p>Sample observed: {dateLabel(source.source.observedAt)}</p>
            <blockquote>{source.source.evidence}</blockquote>
            {source.kind === "distributor" && source.contact && (
              <div className="example-contact">
                <strong>Sample email</strong>
                <code>{source.contact.value}</code>
                <small>
                  Fictional address. Messages cannot be sent to this contact.
                </small>
              </div>
            )}
          </div>
          <p className="muted">
            This is sample data, not a live search result.
          </p>
        </Dialog>
      )}
      {quote && (
        <Dialog
          title="Prepare supplier inquiry"
          onClose={() => setQuote(null)}
        >
          <p className="muted">
            Draft for {quote.supplier}. You can request a catalog without a quantity. Copying this text does not send an email.
          </p>
          {persistenceEnabled && (
            <p className="field-hint">
              To email the test recipient, save the study and open “Ask{" "}
              {quote.supplier}” on the page. Review the draft and recipient before approving the send.
            </p>
          )}
          <label className="field quote-field">
            <span>Edit message</span>
            <textarea
              rows={8}
              value={quoteText}
              onChange={(e) => {
                setQuoteText(e.target.value);
                setCopyState("");
              }}
              maxLength={3000}
            />
          </label>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setQuote(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(quoteText);
                  setCopyState("Text copied. No message was sent.");
                } catch {
                  setCopyState(
                    "Could not copy. Select the text and copy it manually.",
                  );
                }
              }}
            >
              Copy text
            </Button>
          </div>
          <p role="status" className="field-hint">
            {copyState}
          </p>
        </Dialog>
      )}
      {caseReply && currentStudyCase?.comparison && (
        <Dialog title="Update the case comparison" onClose={() => setCaseReply(null)}>
          <p>Add the reviewed reply to your saved comparison.</p>
          <label className="checkbox"><input type="checkbox" checked={replyEquivalent} onChange={(event) => setReplyEquivalent(event.target.checked)} />I confirm the same ingredient, specification, unit and currency.</label>
          {error && <p className="notice error" role="alert">{error}</p>}
          <Button disabled={!replyEquivalent} onClick={() => {
            try {
              const comparison = currentStudyCase.comparison!;
              onPrepare({ ...mergeReplyOffer(comparison, caseReply, replyEquivalent), sourcingCaseId: currentStudyCase.caseId, resumeComparison: { id: comparison.id, revision: comparison.revision } });
              setCaseReply(null);
            } catch (cause) { setError(cause instanceof Error ? cause.message : "Review the reply details."); }
          }}>Review updated comparison</Button>
        </Dialog>
      )}
      {prepareOpen && (
        <Dialog
          title="Plan a purchase from this study"
          onClose={() => setPrepareOpen(false)}
        >
          <p>
            You will use {priced.length}{" "}
            {priced.length === 1 ? "catalog price" : "catalog prices"}
            . You will still need to enter a quantity and confirm terms.
          </p>
          <ul className="review-list">
            {priced.map((result) => (
              <li key={result.id}>
                <strong>{result.supplier}</strong>
                <span>
                  {result.specification} · {numberLabel(result.packageContent)}{" "}
                  {result.packageUnit} ·{" "}
                  {money(result.priceCents, result.currency)}
                </span>
              </li>
            ))}
          </ul>
          {selected.length > priced.length && (
            <p className="muted">
              Contacts without prices and market references stay in your study; they do not become offers.
            </p>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              I reviewed the sources and confirmed that these products have the same specification and quality.
            </span>
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setPrepareOpen(false)}>
              Keep researching
            </Button>
            <Button variant="primary" disabled={!confirmed} onClick={prepare}>
              Enter quantity and terms
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

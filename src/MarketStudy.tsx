import StudySelections from "./components/StudySelections";
import {
  studyOptionCount,
  sameStudyContext,
  type WebSelection,
  type StudyProspect,
} from "./domain/study";
import Brand from "./components/Brand";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  FileText,
  Info,
  Mail,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { marketExamples } from "../fixtures/market";
import {
  filterMarketExamples,
  preparePurchaseFromCatalog,
  publishedUnitPrice,
  type CatalogResult,
  type MarketResult,
  type PurchaseSeed,
} from "./domain/market";
import { money, numberLabel } from "./numbers";
import { Dialog } from "./components/Dialog";
import LiveResearch, {
  type ResearchStatus,
  type WebSearchRequest,
} from "./components/LiveResearch";
import ExtractionReview from "./components/ExtractionReview";
import QuotationMail from "./components/QuotationMail";
import DocumentExtraction from "./components/DocumentExtraction";
import IngredientIntake from "./components/IngredientIntake";
import SavedStudies, { type SavedStudy } from "./components/SavedStudies";
import type { Id } from "../convex/_generated/dataModel";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const kindLabel = (result: MarketResult) =>
  result.kind === "catalog"
    ? "Catalog price"
    : result.kind === "distributor"
      ? "Supplier without a price"
      : "Market reference";

export default function MarketStudy({
  onPrepare,
  onManualExample,
  persistenceEnabled,
}: {
  persistenceEnabled: boolean;
  onPrepare: (seed: PurchaseSeed) => void;
  onManualExample: () => void;
}) {
  const [study, setStudy] = useState<{
    id: Id<"studies"> | null;
    revision: number;
    clientId: string;
  }>(() => ({ id: null, revision: 0, clientId: crypto.randomUUID() }));
  const [webStatus, setWebStatus] = useState<ResearchStatus | undefined>();
  const [webRequest, setWebRequest] = useState<WebSearchRequest | null>(null);
  const [catalog, setCatalog] = useState<MarketResult[]>(marketExamples);
  const [term, setTerm] = useState("");
  const [region, setRegion] = useState("Lima");
  const [search, setSearch] = useState<{ term: string; region: string } | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [webSelections, setWebSelections] = useState<WebSelection[]>([]);
  const [prospects, setProspects] = useState<StudyProspect[]>([]);
  const optionCount = studyOptionCount({
    selectedIds,
    webSelections,
    prospects,
  });
  function canAddContext(context: { ingredient?: string; region?: string }) {
    const existing =
      webSelections[0] ??
      prospects[0] ??
      (selectedIds.length ? { ingredient: "Arroz", region: "Lima" } : null);
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
        ? current
        : current.length < 3
          ? [...current, prospect]
          : current,
    );
  }
  const [filter, setFilter] = useState<
    "all" | "catalog" | "distributor" | "reference"
  >("all");
  const [source, setSource] = useState<MarketResult | null>(null);
  const [quote, setQuote] = useState<MarketResult | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [copyState, setCopyState] = useState("");
  const [prepareOpen, setPrepareOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [showStudy, setShowStudy] = useState(false);
  const [resultsView, setResultsView] = useState<"example" | "web">("example");
  const [nextIngredient, setNextIngredient] = useState<string | null>(null);
  const results = search
    ? filterMarketExamples(catalog, search.term, search.region)
    : [];
  const selected = catalog.filter((item) => selectedIds.includes(item.id));
  const visible = (showStudy ? selected : results).filter(
    (item) => filter === "all" || item.kind === filter,
  );
  const priced = selected.filter(
    (item): item is CatalogResult => item.kind === "catalog",
  );
  const sourceTitle = search
    ? `${search.term} in ${search.region}`
    : "Your study";
  const showExampleWorkspace = resultsView === "example" || showStudy;

  function beginIngredientStudy(ingredient: string) {
    setCatalog(marketExamples);
    setSelectedIds([]);
    setWebSelections([]);
    setProspects([]);
    setStudy({ id: null, revision: 0, clientId: crypto.randomUUID() });
    setTerm(ingredient);
    setSearch({ term: ingredient, region });
    setResultsView("example");
    setShowStudy(false);
    setFilter("all");
    setError("");
    setNextIngredient(null);
  }

  function searchWeb() {
    setSearch({ term: term.trim(), region });
    setError("");
    setResultsView("web");
    setShowStudy(false);
    setFilter("all");
    setWebRequest((current) => ({
      id: (current?.id ?? 0) + 1,
      ingredient: term.trim(),
      region,
    }));
  }

  function explore(event?: FormEvent) {
    event?.preventDefault();
    if (!term.trim()) {
      setError("Enter an ingredient or category to explore.");
      return;
    }
    setError("");
    setSearch({ term: term.trim(), region });
    setResultsView("example");
    setShowStudy(false);
    setFilter("all");
  }
  function startExample() {
    setTerm("Arroz");
    setRegion("Lima");
    setSearch({ term: "Arroz", region: "Lima" });
    setResultsView("example");
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
    setResultsView("example");
    setStudy({
      id: saved.id,
      revision: saved.revision,
      clientId: crypto.randomUUID(),
    });
    setShowStudy(true);
    setFilter("all");
    setError("");
  }
  function toggle(result: MarketResult) {
    if (!selectedIds.includes(result.id) && !canAddContext(result)) return;
    setSelectedIds((current) =>
      current.includes(result.id)
        ? current.filter((id) => id !== result.id)
        : [...current, result.id],
    );
  }
  function requestQuote(result: MarketResult) {
    setQuote(result);
    setCopyState("");
    setQuoteText(
      `Hello, I am researching ${result.ingredient.toLowerCase()} for a restaurant in ${search?.region ?? result.region}. Could you share pack sizes, prices, tax, minimum order and delivery coverage? This is a market inquiry; I have not set a purchase quantity yet. Thank you.`,
    );
  }
  function prepare() {
    try {
      onPrepare(preparePurchaseFromCatalog(selected, confirmed));
      setPrepareOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review your shortlist.");
    }
  }

  return (
    <>
      <a href="#market-results" className="skip-link">
        Skip to results
      </a>
      <header className="topbar market-topbar">
        <Brand />
        <button
          className="button text-button"
          onClick={() => {
            setShowStudy(!showStudy);
            setFilter("all");
            requestAnimationFrame(() =>
              document.getElementById("results-title")?.focus(),
            );
          }}
        >
          <Bookmark size={18} />
          My study
          {optionCount > 0 && (
            <span className="selection-count">{optionCount}</span>
          )}
        </button>
      </header>
      <main
        className={`market-main ${search || showStudy || resultsView === "web" ? "has-results" : "is-intro"}`}
      >
        <div className="workspace-nav">
          <span>
            <Search size={16} />
            Explore suppliers
          </span>
          <span className="demo-badge">Ingredient sourcing</span>
        </div>
        <div className="market-intro">
          <h1>Find the right ingredients.</h1>
          <p>
            Find suppliers, check pack sizes and keep the options worth comparing.
          </p>
        </div>
        <form
          className="market-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (webStatus?.searchEnabled && term.trim()) searchWeb();
            else explore();
          }}
        >
          <label className="field">
            <span>Ingredient or category</span>
            <div className="search-input">
              <Search size={20} />
              <input
                aria-label="Ingredient or category"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. long-grain white rice"
                maxLength={120}
              />
            </div>
          </label>
          <label className="field">
            <span>Delivery area</span>
            <select
              aria-label="Delivery area"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option>Lima</option>
              <option>Arequipa</option>
              <option>Cusco</option>
            </select>
          </label>
          <div className="market-search-actions">
            <button
              type={webStatus?.searchEnabled ? "button" : "submit"}
              className={`button ${webStatus?.searchEnabled ? "secondary" : "primary"}`}
              onClick={webStatus?.searchEnabled ? () => explore() : undefined}
            >
              Explore example
            </button>
            <button
              type={webStatus?.searchEnabled ? "submit" : "button"}
              className={`button ${webStatus?.searchEnabled ? "primary" : "secondary"}`}
              disabled={!webStatus?.searchEnabled || !term.trim()}
              aria-describedby="market-search-help"
            >
              <Search size={18} aria-hidden="true" /> Search suppliers
            </button>
          </div>
          <p className="market-search-note" id="market-search-help">
            <Info size={16} />
            {webStatus?.searchEnabled
              ? "Search public sources or try a sample study."
              : "Try a sample study while live search is unavailable."}
          </p>
          <a
            className="button text-button mobile-tool-link"
            href="#study-tools"
          >
            <FileText size={16} aria-hidden="true" /> Use a list or file
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </form>
        <div className="market-workspace">
          <div className="market-content">
            {persistenceEnabled && (
              <div
                className="live-research-view"
                hidden={showStudy}
                id={
                  resultsView === "web" && !showStudy
                    ? "market-results"
                    : undefined
                }
                tabIndex={resultsView === "web" && !showStudy ? -1 : undefined}
                aria-label="Supplier search results"
              >
                <LiveResearch
                  selections={webSelections}
                  onReview={addReview}
                  onOpenStudy={() => {
                    setShowStudy(true);
                    setFilter("all");
                    requestAnimationFrame(() =>
                      document.getElementById("results-title")?.focus(),
                    );
                  }}
                  selectedProspectIds={prospects.map((item) => item.id)}
                  onProspect={toggleProspect}
                  request={webRequest}
                  onStatus={setWebStatus}
                  onPrepare={onPrepare}
                />
              </div>
            )}
            {error && !prepareOpen && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}

            {showExampleWorkspace &&
              (!search && !showStudy ? (
                <section
                  className="market-start"
                  id="market-results"
                  tabIndex={-1}
                  aria-labelledby="start-title"
                >
                  <div>
                    <h2 id="start-title">Try a rice example</h2>
                    <p>
                      Compare two pack sizes and a supplier without a published price. See what you know and what to ask next.
                    </p>
                    <button className="button secondary" onClick={startExample}>
                      Explore rice example <ArrowRight size={17} />
                    </button>
                  </div>
                  <dl className="example-preview">
                    {marketExamples
                      .filter(
                        (item): item is CatalogResult =>
                          item.kind === "catalog",
                      )
                      .map((item) => (
                        <div key={item.id}>
                          <dt>
                            Pack size:{" "}
                            {item.packageContent === null
                              ? "peso pendiente"
                              : `${numberLabel(item.packageContent)} ${item.packageUnit}`}
                          </dt>
                          <dd>
                            {money(publishedUnitPrice(item), item.currency)}{" "}
                            <span>/ {item.packageUnit}</span>
                          </dd>
                        </div>
                      ))}
                    <div>
                      <dt>Another supplier</dt>
                      <dd>Ask supplier</dd>
                    </div>
                  </dl>
                </section>
              ) : (
                <section id="market-results" aria-labelledby="results-title">
                  <div className="section-heading">
                    <div>
                      <h2 id="results-title" tabIndex={-1}>
                        {showStudy ? "My market study" : sourceTitle}
                      </h2>
                      <p>
                        {showStudy
                          ? `${optionCount} ${optionCount === 1 ? "selected option" : "selected options"} in this view`
                          : `${results.length} resultados ilustrativos · No representan cobertura real del mercado`}
                      </p>
                    </div>
                    {showStudy && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setShowStudy(false);
                          setFilter("all");
                        }}
                      >
                        Back to results
                      </button>
                    )}
                  </div>
                  <div
                    className="market-toolbar"
                    aria-label="Result types"
                  >
                    <SlidersHorizontal size={16} />
                    {(
                      [
                        ["all", "All"],
                        ["catalog", "With prices"],
                        ["distributor", "No price"],
                        ["reference", "References"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        className="filter-button"
                        aria-pressed={filter === value}
                        onClick={() => setFilter(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {showStudy && (
                    <StudySelections
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
                      onPrepare={onPrepare}
                    />
                  )}
                  {visible.length === 0 ? (
                    showStudy &&
                    (webSelections.some(
                      ({ seed }) =>
                        filter === "all" ||
                        (filter === "catalog" &&
                          seed.offers[0].priceCents !== null) ||
                        (filter === "distributor" &&
                          seed.offers[0].priceCents === null),
                    ) ||
                      (prospects.length > 0 &&
                        (filter === "all" ||
                          filter === "distributor"))) ? null : (
                      <div className="empty-state">
                        <Search size={32} />
                        <h3>
                          {showStudy
                            ? "No options of this type yet"
                            : "No examples match this search"}
                        </h3>
                        <p>
                          {showStudy
                            ? "Add options to build your study. A purchase plan is optional."
                            : "This does not mean there are no suppliers. Try live search or open a sample study."}
                        </p>
                        <button
                          className="button secondary"
                          onClick={startExample}
                        >
                          View rice example
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="market-results">
                      {visible.map((result) => (
                        <article
                          key={result.id}
                          className={`market-result ${result.kind} ${selectedIds.includes(result.id) ? "is-selected" : ""}`}
                          aria-label={`Resultado: ${result.supplier}`}
                        >
                          <div className="result-main">
                            <span className={`result-kind ${result.kind}`}>
                              {kindLabel(result)}
                            </span>
                            <h3>{result.supplier}</h3>
                            <p>{result.description}</p>
                            <div className="result-location">
                              <MapPin size={14} />
                              {result.kind === "reference"
                                ? `Reference area: ${result.region}.`
                                : `${result.region} · Delivery to confirm`}
                            </div>
                            <button
                              className="button text-button source-button"
                              onClick={() => setSource(result)}
                            >
                              <FileText size={15} />
                              View example source{" "}
                              <span>{dateLabel(result.source.observedAt)}</span>
                            </button>
                          </div>
                          <div className="result-value">
                            {result.kind === "catalog" ? (
                              <>
                                <span>Unit price · example</span>
                                <strong className="normalized-price">
                                  {publishedUnitPrice(result) === null ? (
                                    "To confirm"
                                  ) : (
                                    <>
                                      {money(
                                        publishedUnitPrice(result),
                                        result.currency,
                                      )}{" "}
                                      <span>/ {result.packageUnit}</span>
                                    </>
                                  )}
                                </strong>
                                <p className="package-price">
                                  {money(result.priceCents, result.currency)}{" "}
                                  per{" "}
                                  {result.packageContent === null
                                    ? "pack size to confirm"
                                    : `${numberLabel(result.packageContent)} ${result.packageUnit}`}
                                </p>
                                <small>
                                  Stock, tax and delivery need confirmation.
                                </small>
                              </>
                            ) : result.kind === "distributor" ? (
                              <>
                                <span>Price not published</span>
                                <strong className="contact-heading">
                                  Request catalog
                                </strong>
                                <p>
                                  {result.contact
                                    ? "Sample supplier contact available"
                                    : "Contact not confirmed"}
                                </p>
                                <button
                                  className="button text-button"
                                  onClick={() => setSource(result)}
                                >
                                  <Mail size={16} />
                                  View contact
                                </button>
                              </>
                            ) : (
                              <>
                                <span>Market context</span>
                                <p>{result.note}</p>
                              </>
                            )}
                          </div>
                          <div className="result-actions">
                            <button
                              className={`button ${selectedIds.includes(result.id) ? "selected-button" : "secondary"}`}
                              aria-pressed={selectedIds.includes(result.id)}
                              onClick={() => toggle(result)}
                            >
                              {selectedIds.includes(result.id) ? (
                                <Check size={16} />
                              ) : (
                                <Bookmark size={16} />
                              )}
                              {selectedIds.includes(result.id)
                                ? "In my study"
                                : "Add to study"}
                            </button>
                            {result.kind !== "reference" && (
                              <button
                                className="button text-button"
                                onClick={() => requestQuote(result)}
                              >
                                Prepare inquiry <ArrowRight size={16} />
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  {selected.length > 0 && (
                    <section
                      className="study-next"
                      aria-labelledby="study-next-title"
                    >
                      <div>
                        <h3 id="study-next-title">
                          {selected.length}{" "}
                          {selected.length === 1 ? "option" : "options"} in your study
                        </h3>
                        <p>You can keep researching without planning a purchase.</p>
                      </div>
                      <div className="study-next-actions">
                        <button
                          className="button secondary"
                          onClick={() => {
                            setShowStudy(true);
                            setFilter("all");
                          }}
                        >
                          Review selection
                        </button>
                        <button
                          className="button primary"
                          disabled={priced.length === 0}
                          onClick={() => {
                            setPrepareOpen(true);
                            setConfirmed(false);
                            setError("");
                          }}
                        >
                          Plan purchase <ArrowRight size={17} />
                        </button>
                        {priced.length === 0 && (
                          <small>
                            Add a priced offer or request a quote to calculate a purchase.
                          </small>
                        )}
                      </div>
                    </section>
                  )}
                </section>
              ))}
            {showExampleWorkspace &&
              persistenceEnabled &&
              study.id &&
              catalog
                .filter(
                  (item) =>
                    item.kind === "distributor" &&
                    selectedIds.includes(item.id),
                )
                .map((item) => (
                  <div key={`${study.id}:${item.id}`}>
                    <h3>Ask {item.supplier}</h3>
                    <QuotationMail
                      comparisonId={null}
                      studyId={study.id!}
                      resultId={item.id}
                      offers={[]}
                      onEditOffer={() => {}}
                      onPrepare={onPrepare}
                    />
                  </div>
                ))}
          </div>
          <aside className="study-panel" aria-labelledby="study-panel-title">
            <div className="study-panel-heading">
              <Bookmark size={18} aria-hidden="true" />
              <h2 id="study-panel-title">Your study</h2>
              <span className="study-panel-count">
                {optionCount} {optionCount === 1 ? "option" : "options"}
              </span>
            </div>
            <button
              className="button text-button"
              onClick={() => {
                const next = term.trim() || search?.term || "Arroz";
                if (optionCount > 0 || study.id) setNextIngredient(next);
                else beginIngredientStudy(next);
              }}
            >
              New study
            </button>
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
                      ? { ...current, id: saved.id, revision: saved.revision }
                      : current,
                  )
                }
              />
            ) : (
              <p className="field-hint">
                Saving is unavailable. You can explore examples, but this selection will be lost on reload.
              </p>
            )}
          </aside>
          <aside
            className="study-tools"
            id="study-tools"
            tabIndex={-1}
            aria-label="Study tools"
          >
            <div className="study-tool-heading">
              <FileText size={18} aria-hidden="true" />
              <h2>Your ingredients</h2>
            </div>
            <IngredientIntake
              persistenceEnabled={persistenceEnabled}
              activeIngredient={search?.term ?? null}
              onExplore={(ingredient) => {
                if (ingredient === search?.term) return;
                if (optionCount > 0 || study.id) setNextIngredient(ingredient);
                else beginIngredientStudy(ingredient);
              }}
            />
            <details className="document-tools">
              <summary>
                <span>
                  <FileText size={18} aria-hidden="true" /> Review a quote
                </span>
                <ChevronDown
                  size={18}
                  className="disclosure-chevron"
                  aria-hidden="true"
                />
              </summary>
              <p className="document-tools-hint">
                Photo, PDF or manual entry. Review the details before comparing.
              </p>
              {persistenceEnabled && (
                <DocumentExtraction onPrepare={onPrepare} />
              )}
              <ExtractionReview onPrepare={onPrepare} />
              <aside className="market-context">
                <h3>Already have a quote?</h3>
                <p>
                  Enter the prices and terms from your quote. You can also review a sample document before comparing.
                </p>
                <button
                  className="button text-button"
                  onClick={onManualExample}
                >
                  Enter a quote manually{" "}
                  <ArrowRight size={16} />
                </button>
              </aside>
            </details>
          </aside>
        </div>
        <footer>
          <span>
            Save your study to return to reviewed sources and shortlisted suppliers.
          </span>
          <span>
            Examples use fictional data. Review and approve each email before sending.
          </span>
        </footer>
      </main>
      {nextIngredient && (
        <Dialog
          title="Research another ingredient"
          onClose={() => setNextIngredient(null)}
        >
          <p>
            Start a study for {nextIngredient}. Your current selection will not carry over. Save it first if you want to keep it.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setNextIngredient(null)}
            >
              Back to study
            </button>
            <button
              className="button primary"
              onClick={() => beginIngredientStudy(nextIngredient)}
            >
              Start another study
            </button>
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
            <button className="button secondary" onClick={() => setQuote(null)}>
              Close
            </button>
            <button
              className="button primary"
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
            </button>
          </div>
          <p role="status" className="field-hint">
            {copyState}
          </p>
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
            <button
              className="button secondary"
              onClick={() => setPrepareOpen(false)}
            >
              Keep researching
            </button>
            <button
              className="button primary"
              disabled={!confirmed}
              onClick={prepare}
            >
              Enter quantity and terms
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  Info,
  Search,
  FolderOpen,
} from "lucide-react";
import { marketExamples } from "../fixtures/market";
import {
  filterMarketExamples,
  preparePurchaseFromCatalog,
  type CatalogResult,
  type MarketResult,
  type PurchaseSeed,
} from "./domain/market";
import { money, numberLabel } from "./numbers";
import Brand from "./components/Brand";
import MarketHero from "./components/MarketHero";
import {
  MarketResultRow,
  marketDateLabel as dateLabel,
  marketKindLabel as kindLabel,
} from "./components/MarketResultRow";
import { Button } from "./components/ui/Button";
import { Select } from "./components/ui/Select";
import { Disclosure } from "./components/ui/Disclosure";
import { SegmentedControl } from "./components/ui/SegmentedControl";
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
import StudySelections from "./components/StudySelections";
import {
  sameStudyContext,
  studyOptionCount,
  type StudyProspect,
  type WebSelection,
} from "./domain/study";

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
  const optionCount = studyOptionCount({ selectedIds, webSelections, prospects });
  const [filter, setFilter] = useState<
    "all" | "catalog" | "distributor" | "reference"
  >("all");
  const [source, setSource] = useState<MarketResult | null>(null);
  const [quote, setQuote] = useState<MarketResult | null>(null);
  const [quoteText, setQuoteText] = useState("");
  const [copyState, setCopyState] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
  const filteredEmpty =
    filter !== "all" && (showStudy ? selected : results).length > 0;
  const priced = selected.filter(
    (item): item is CatalogResult => item.kind === "catalog",
  );
  const sourceTitle = search
    ? `${search.term} en ${search.region}`
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
        ? current.filter((item) => item.id !== prospect.id)
        : current.length < 3
          ? [...current, prospect]
          : current,
    );
  }

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
    if (!term.trim()) return;
    setSearch({ term: term.trim(), region });
    setError("");
    setResultsView("web");
    setSearchOpen(false);
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
    setSearchOpen(false);
    setShowStudy(false);
    setFilter("all");
  }
  function startExample() {
    setTerm("Arroz");
    setRegion("Lima");
    setSearch({ term: "Arroz", region: "Lima" });
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
    if (showStudy && selectedIds.includes(result.id)) {
      requestAnimationFrame(() =>
        document
          .getElementById("results-title")
          ?.focus({ preventScroll: true }),
      );
    }
    setSelectionMessage(
      `${result.supplier}: ${selectedIds.includes(result.id) ? "retirado del estudio" : "añadido al estudio"}. Los cambios todavía requiresn guardar.`,
    );
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
      `Hola, estoy investigando options de ${result.ingredient.toLowerCase()} para un restaurante en ${search?.region ?? result.region}. ¿Podrían compartir catálogo, packs, precios con impuestos, pedido mínimo y cobertura de entrega? Por ahora es una consulta de mercado; aún no tengo una cantidad de compra definida. Gracias.`,
    );
  }
  useEffect(() => {
    if (!search && !showStudy) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById("results-title");
      heading?.focus({ preventScroll: true });
      document
        .getElementById("market-main")
        ?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [search, showStudy]);

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
      onPrepare(preparePurchaseFromCatalog(selected, confirmed));
      setPrepareOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review your shortlist.");
    }
  }

  return (
    <>
      <a
        href={search || showStudy ? "#market-results" : "#market-search"}
        className="skip-link"
      >
        Ir al contenido
      </a>
      <header className="topbar market-topbar">
        <Brand />
        <nav className="brand-nav" aria-label="Navegación principal">
          <Button
            variant="text"
            className="brand-explore"
            aria-current={!showStudy ? "page" : undefined}
            onClick={() => {
              setShowStudy(false);
              setFilter("all");
              setSearchOpen(true);
              requestAnimationFrame(() => {
                document
                  .getElementById("market-search")
                  ?.scrollIntoView({ block: "start" });
                document
                  .querySelector<HTMLInputElement>("#market-search input")
                  ?.focus({ preventScroll: true });
              });
            }}
          >
            Explore suppliers
          </Button>
          <Button
            variant="text"
            aria-pressed={showStudy}
            onClick={() => {
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
        </nav>
      </header>
      <main
        id="market-main"
        className={`market-main ${search || showStudy ? "has-results" : "is-intro"} ${showStudy ? "is-study" : ""}`}
      >
        <div className="workspace-nav">
          <span>
            <Search size={16} />
            Explore suppliers
          </span>
          <span className="demo-badge">Demo con datos ficticios</span>
        </div>
        <div className="market-hero">
          <div className="hero-workspace">
            <div
              className={`market-intro ${search || showStudy ? "sr-only" : ""}`}
            >
              <h1 tabIndex={-1}>
                {search || showStudy ? (
                  showStudy ? (
                    "Las options, sobre la mesa."
                  ) : (
                    "Explora con criterio."
                  )
                ) : (
                  <>
                    Buen criterio.
                    <br />
                    Buenos insumos.
                  </>
                )}
              </h1>
              <p>
                Tu próxima compra empieza con una buena mirada al mercado.
                Explora precios, encuentra proveedores y reúne tus options.
              </p>
            </div>
            {(search || showStudy) && (
              <div className="search-strip">
                <span>
                  <Search size={18} aria-hidden="true" />
                  {search
                    ? `${search.term} · ${search.region}`
                    : "Explora el mercado"}
                </span>
                <Button
                  variant="text"
                  aria-expanded={searchOpen}
                  aria-controls="search-editor"
                  onClick={() => {
                    setSearchOpen(!searchOpen);
                    if (!searchOpen)
                      requestAnimationFrame(() =>
                        document
                          .querySelector<HTMLInputElement>(
                            "#market-search input",
                          )
                          ?.focus(),
                      );
                  }}
                >
                  {searchOpen ? "Close búsqueda" : "Cambiar búsqueda"}
                </Button>
              </div>
            )}
            <div
              id="search-editor"
              hidden={!!(search || showStudy) && !searchOpen}
            >
              <form
                id="market-search"
                className="market-search"
                onSubmit={explore}
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
                      aria-invalid={!!error && !term.trim()}
                      aria-describedby={
                        error && !term.trim()
                          ? "market-search-error"
                          : undefined
                      }
                    />
                  </div>
                </label>
                <label className="field">
                  <span>Delivery area</span>
                  <Select
                    aria-label="Delivery area"
                    value={region}
                    onValueChange={setRegion}
                    options={["Lima", "Arequipa", "Cusco"].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                </label>
                <Button type="submit" variant="primary">
                  <Search size={18} />
                  Explore example
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!webStatus?.searchEnabled || !term.trim()}
                  onClick={searchWeb}
                >
                  Search suppliers
                </Button>
                <p className="market-search-note">
                  <Info size={16} />
                  Ejemplos ficticios de arroz y abarrotes en Lima.{" "}
                  {webStatus?.searchEnabled
                    ? "La búsqueda web consulta fuentes externas."
                    : persistenceEnabled && !webStatus
                      ? "Comprobando disponibilidad de búsqueda web…"
                      : "Búsqueda web no configurada. Puedes seguir explorando los ejemplos."}
                </p>
              </form>
            </div>
            {!search && !showStudy && (
              <section
                className="market-start"
                aria-label="Ejemplo para empezar"
              >
                <span>¿Quieres probar primero?</span>
                <Button variant="text" onClick={startExample}>
                  Explore rice example <ArrowRight size={17} />
                </Button>
              </section>
            )}
          </div>
          {!search && !showStudy && <MarketHero />}
        </div>
        {error && !prepareOpen && (
          <p id="market-search-error" className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="market-workspace">
          <div className="market-content">
            {persistenceEnabled && (
              <div
                className="live-research-view"
                hidden={showStudy || resultsView !== "web"}
                aria-label="Supplier search results"
              >
                <LiveResearch
                  selections={webSelections}
                  onReview={addReview}
                  onOpenStudy={() => {
                    setShowStudy(true);
                    setFilter("all");
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
              <section id="market-results" aria-labelledby="results-title">
                <div className="section-heading">
                  <div>
                    <h2 id="results-title" tabIndex={-1}>
                      {showStudy ? "My market study" : sourceTitle}
                    </h2>
                    <p>
                      {showStudy
                        ? `${selected.length} ${selected.length === 1 ? "selected option" : "selected options"} in this view`
                        : `${results.length} resultados ilustrativos · No representan cobertura real del mercado`}
                    </p>
                  </div>
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
                {visible.length === 0 && !(showStudy && hasVisibleExternalSelection) ? (
                  <div className="empty-state">
                    <Search size={32} />
                    <h3>
                      {filteredEmpty
                        ? "El filtro no tiene coincidencias"
                        : showStudy
                          ? "Your study todavía está vacío"
                          : "No examples match this search"}
                    </h3>
                    <p>
                      {filteredEmpty
                        ? "Tus options siguen aquí. Cambia el filtro para volver a verlas."
                        : showStudy
                          ? "Add options to build your study. A purchase plan is optional."
                          : "This does not mean there are no suppliers. Try live search or open a sample study."}
                    </p>
                    {filteredEmpty ? (
                      <Button
                        variant="secondary"
                        onClick={() => setFilter("all")}
                      >
                        Ver todas las options
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
            aria-label="Resumen de tu estudio"
          >
            <div className="study-rail-heading">
              <Bookmark size={20} />
              <h2 id="study-summary-title" tabIndex={-1}>
                {search || showStudy ? "Your study" : "Tus estudios guardados"}
              </h2>
              {optionCount > 0 && (
                <span className="study-count" aria-hidden="true">
                  {optionCount}
                </span>
              )}
            </div>
            {optionCount > 0 && (
              <p className="study-total">
                {optionCount}{" "}
                {optionCount === 1 ? "option" : "options"} in your study
              </p>
            )}
            {(search || showStudy) && optionCount === 0 && (
              <div className="study-empty">
                <h3>Guarda lo que vale la pena.</h3>
                <p>
                  Añade precios, contactos o referencias. Puedes investigar sin
                  definir una compra.
                </p>
              </div>
            )}
            {selected.length > 0 && !showStudy && (
              <ul className="study-picks" aria-label="Opciones seleccionadas">
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
            </div>
            {optionCount > 0 && (
              <section
                className="study-next"
                aria-labelledby="study-next-title"
              >
                <h3 id="study-next-title">¿Quieres calcular una compra?</h3>
                <p>
                  Continúa con los precios elegidos. Puedes seguir investigando
                  sin comprar.
                </p>
                <div className="study-next-actions">
                  <Button
                    variant="secondary"
                    disabled={priced.length === 0}
                    onClick={() => {
                      setPrepareOpen(true);
                      setConfirmed(false);
                      setError("");
                    }}
                  >
                    Plan purchase <ArrowRight size={17} />
                  </Button>
                  {priced.length === 0 && (
                    <small>
                      Add a priced offer or request a quote to calculate a purchase.
                    </small>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
        {persistenceEnabled &&
          study.id &&
          catalog
            .filter((item) => item.kind === "distributor")
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
        <section
          className="workspace-extras"
          aria-labelledby="workspace-extras-title"
        >
          <div className="extras-heading">
            <FolderOpen size={20} />
            <div>
              <h2 id="workspace-extras-title">Trabaja con lo que ya tienes</h2>
              <p>
                Una lista o una cotización también pueden ser tu punto de
                partida.
              </p>
            </div>
          </div>
          <div className="extras-grid">
            <Disclosure
              title="Lista de insumos"
              description="Investiga los ingredientes de tu lista, uno a uno."
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
              title="Cotizaciones y documentos"
              description="Revisa condiciones de una oferta o introduce sus datos."
            >
              {persistenceEnabled && (
                <DocumentExtraction onPrepare={onPrepare} />
              )}
              <ExtractionReview onPrepare={onPrepare} />
              <aside className="market-context">
                <h3>Already have a quote?</h3>
                <p>
                  Enter the prices and terms from your quote. You can also review a sample document before comparing.
                </p>
                <Button variant="text" onClick={onManualExample}>
                  Enter a quote manually{" "}
                  <ArrowRight size={16} />
                </Button>
              </aside>
            </Disclosure>
          </div>
        </section>
        <p
          className="sr-only"
          role="status"
          aria-label="Selección del estudio"
          aria-live="polite"
        >
          {selectionMessage}
        </p>
        {optionCount > 0 && !summaryVisible && (
          <Button
            variant="primary"
            className="mobile-study-link"
            onClick={() => {
              document
                .getElementById("study-summary")
                ?.scrollIntoView({ block: "start" });
              document
                .getElementById("study-summary-title")
                ?.focus({ preventScroll: true });
            }}
          >
            <Bookmark size={18} />
            Ver resumen{" "}
            <span className="mobile-study-count">{optionCount}</span>
            <ArrowRight size={18} />
          </Button>
        )}
        <footer>
          <span>
            Prototipo con ejemplos. Guarda el estudio para recuperar su
            selección. Las comparaciones de ejemplo tienen guardado
            independiente.
          </span>
          <span>
            Fuentes y contactos ficticios. No se han enviado consultas.
            <a
              className="brand-guide-link"
              href="?view=brand"
              target="_blank"
              rel="noreferrer"
            >
              Conoce la marca Surtario
            </a>
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

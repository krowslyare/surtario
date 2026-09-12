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
    : "Tu estudio";

  function beginIngredientStudy(ingredient: string) {
    setCatalog(marketExamples);
    setSelectedIds([]);
    setStudy({ id: null, revision: 0, clientId: crypto.randomUUID() });
    setTerm(ingredient);
    setSearch({ term: ingredient, region });
    setShowStudy(false);
    setFilter("all");
    setError("");
    setNextIngredient(null);
  }

  function explore(event?: FormEvent) {
    event?.preventDefault();
    if (!term.trim()) {
      setError("Escribe un insumo o categoría para explorar.");
      return;
    }
    setError("");
    setSearch({ term: term.trim(), region });
    setSearchOpen(false);
    setShowStudy(false);
    setFilter("all");
  }
  function startExample() {
    setTerm("Arroz");
    setRegion("Lima");
    setSearch({ term: "Arroz", region: "Lima" });
    setSearchOpen(false);
    setFilter("all");
    setShowStudy(false);
    setError("");
  }
  function openStudy(saved: SavedStudy) {
    setCatalog(saved.results);
    setSelectedIds(saved.selectedIds);
    setTerm(saved.term);
    setRegion(saved.region);
    setSearch({ term: saved.term, region: saved.region });
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
    if (showStudy && selectedIds.includes(result.id)) {
      requestAnimationFrame(() =>
        document
          .getElementById("results-title")
          ?.focus({ preventScroll: true }),
      );
    }
    setSelectionMessage(
      `${result.supplier}: ${selectedIds.includes(result.id) ? "retirado del estudio" : "añadido al estudio"}. Los cambios todavía requieren guardar.`,
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
      `Hola, estoy investigando opciones de ${result.ingredient.toLowerCase()} para un restaurante en ${search?.region ?? result.region}. ¿Podrían compartir catálogo, presentaciones, precios con impuestos, pedido mínimo y cobertura de entrega? Por ahora es una consulta de mercado; aún no tengo una cantidad de compra definida. Gracias.`,
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
      setError(e instanceof Error ? e.message : "Revisa la selección.");
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
            Explorar mercado
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
            Mi estudio
            {selected.length > 0 && (
              <span className="selection-count">{selected.length}</span>
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
            Explorar mercado
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
                    "Las opciones, sobre la mesa."
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
                Explora precios, encuentra proveedores y reúne tus opciones.
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
                  {searchOpen ? "Cerrar búsqueda" : "Cambiar búsqueda"}
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
                  <span>Insumo o categoría</span>
                  <div className="search-input">
                    <Search size={20} />
                    <input
                      aria-label="Insumo o categoría"
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="Ej. arroz, abarrotes secos"
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
                  <span>Zona de interés</span>
                  <Select
                    aria-label="Zona de interés"
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
                  Explorar ejemplo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!webStatus?.searchEnabled || !term.trim()}
                  onClick={() =>
                    setWebRequest((current) => ({
                      id: (current?.id ?? 0) + 1,
                      ingredient: term.trim(),
                      region,
                    }))
                  }
                >
                  Buscar en la web
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
                  Explorar ejemplo de arroz <ArrowRight size={17} />
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
              <LiveResearch
                request={webRequest}
                onStatus={setWebStatus}
                onPrepare={onPrepare}
              />
            )}
            {(search || showStudy) && (
              <section id="market-results" aria-labelledby="results-title">
                <div className="section-heading">
                  <div>
                    <h2 id="results-title" tabIndex={-1}>
                      {showStudy ? "Mi estudio de mercado" : sourceTitle}
                    </h2>
                    <p>
                      {showStudy
                        ? `${selected.length} ${selected.length === 1 ? "opción seleccionada" : "opciones seleccionadas"} en esta vista`
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
                      Volver a resultados
                    </Button>
                  )}
                </div>
                <div className="market-toolbar">
                  <SegmentedControl
                    label="Tipos de resultado"
                    value={filter}
                    onValueChange={setFilter}
                    options={
                      [
                        { value: "all", label: "Todos" },
                        { value: "catalog", label: "Con precio" },
                        { value: "distributor", label: "Sin precio" },
                        { value: "reference", label: "Referencias" },
                      ] as const
                    }
                  />
                </div>
                {visible.length === 0 ? (
                  <div className="empty-state">
                    <Search size={32} />
                    <h3>
                      {filteredEmpty
                        ? "El filtro no tiene coincidencias"
                        : showStudy
                          ? "Tu estudio todavía está vacío"
                          : "No hay ejemplos para esta búsqueda"}
                    </h3>
                    <p>
                      {filteredEmpty
                        ? "Tus opciones siguen aquí. Cambia el filtro para volver a verlas."
                        : showStudy
                          ? "Selecciona resultados para construir tu estudio. No necesitas preparar una compra."
                          : "Esto no indica que no existan distribuidores. El prototipo solo contiene ejemplos de arroz y abarrotes en Lima."}
                    </p>
                    {filteredEmpty ? (
                      <Button
                        variant="secondary"
                        onClick={() => setFilter("all")}
                      >
                        Ver todas las opciones
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={startExample}>
                        Ver ejemplo de arroz
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
                {search || showStudy ? "Tu estudio" : "Tus estudios guardados"}
              </h2>
              {selected.length > 0 && (
                <span className="study-count" aria-hidden="true">
                  {selected.length}
                </span>
              )}
            </div>
            {selected.length > 0 && (
              <p className="study-total">
                {selected.length}{" "}
                {selected.length === 1 ? "opción" : "opciones"} en tu estudio
              </p>
            )}
            {(search || showStudy) && selected.length === 0 && (
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
                  Guardado no configurado. Puedes explorar ejemplos; esta
                  selección se pierde al recargar.
                </p>
              )}
            </div>
            {selected.length > 0 && (
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
                    Preparar compra <ArrowRight size={17} />
                  </Button>
                  {priced.length === 0 && (
                    <small>
                      Para calcular una compra, selecciona un precio o solicita
                      cotización.
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
                <h3>Consultar a {item.supplier}</h3>
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
                activeIngredient={search?.term ?? null}
                onExplore={(ingredient) => {
                  if (ingredient === search?.term) return;
                  if (selectedIds.length > 0 || study.id)
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
                <h3>¿Ya tienes una cotización?</h3>
                <p>
                  Puedes introducir precios y condiciones en la comparación
                  manual. La lectura automática de foto/PDF está disponible para
                  los ejemplos al configurar OpenAI. Los archivos propios
                  conservan la alternativa manual.
                </p>
                <Button variant="text" onClick={onManualExample}>
                  Abrir alternativa de comparación manual{" "}
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
        {selected.length > 0 && !summaryVisible && (
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
            <span className="mobile-study-count">{selected.length}</span>
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
          title="Investigar otro insumo"
          onClose={() => setNextIngredient(null)}
        >
          <p>
            Vas a iniciar un estudio de {nextIngredient}. La selección actual no
            se trasladará. Si no la guardaste, vuelve al estudio y guárdala
            antes de continuar.
          </p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setNextIngredient(null)}>
              Volver al estudio
            </Button>
            <Button
              variant="primary"
              onClick={() => beginIngredientStudy(nextIngredient)}
            >
              Iniciar otro estudio
            </Button>
          </div>
        </Dialog>
      )}
      {source && (
        <Dialog
          title={
            source.kind === "distributor"
              ? "Fuente y contacto del distribuidor"
              : "Origen del resultado"
          }
          onClose={() => setSource(null)}
        >
          <span className="demo-badge">Datos ficticios</span>
          <div className="source-document">
            <h3>{source.source.title}</h3>
            <p>Observación de ejemplo: {dateLabel(source.source.observedAt)}</p>
            <blockquote>{source.source.evidence}</blockquote>
            {source.kind === "distributor" && source.contact && (
              <div className="example-contact">
                <strong>Correo de ejemplo</strong>
                <code>{source.contact.value}</code>
                <small>
                  Dirección ficticia sin verificar. No se habilita envío a este
                  contacto.
                </small>
              </div>
            )}
          </div>
          <p className="muted">
            La versión conectada conservará la URL y el fragmento original. Este
            ejemplo no procede de una búsqueda real.
          </p>
        </Dialog>
      )}
      {quote && (
        <Dialog
          title="Preparar consulta al distribuidor"
          onClose={() => setQuote(null)}
        >
          <p className="muted">
            Borrador para {quote.supplier}. Puedes consultar catálogo sin
            definir cantidad. Este texto solo se copia; no envía correo.
          </p>
          {persistenceEnabled && (
            <p className="field-hint">
              Para correo de prueba, guarda el estudio y abre «Consultar a{" "}
              {quote.supplier}» en la página. Revisarás otro borrador y su
              destinatario antes de autorizar el envío.
            </p>
          )}
          <label className="field quote-field">
            <span>Mensaje editable</span>
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
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(quoteText);
                  setCopyState("Texto copiado. No se envió ningún mensaje.");
                } catch {
                  setCopyState(
                    "No se pudo copiar. Selecciona el texto y cópialo manualmente.",
                  );
                }
              }}
            >
              Copiar texto
            </Button>
          </div>
          <p role="status" className="field-hint">
            {copyState}
          </p>
        </Dialog>
      )}
      {prepareOpen && (
        <Dialog
          title="Del estudio a una posible compra"
          onClose={() => setPrepareOpen(false)}
        >
          <p>
            Usarás {priced.length}{" "}
            {priced.length === 1 ? "precio de catálogo" : "precios de catálogo"}
            . Todavía tendrás que indicar cantidad y confirmar condiciones.
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
              Los contactos sin precio y las referencias quedan en tu estudio;
              no se convierten en ofertas.
            </p>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              Revisé las fuentes y confirmé que estos productos tienen la misma
              especificación y calidad.
            </span>
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setPrepareOpen(false)}>
              Seguir investigando
            </Button>
            <Button variant="primary" disabled={!confirmed} onClick={prepare}>
              Indicar cantidad y condiciones
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

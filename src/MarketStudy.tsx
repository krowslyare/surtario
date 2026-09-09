import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ClipboardList,
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
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const kindLabel = (result: MarketResult) =>
  result.kind === "catalog"
    ? "Precio de catálogo"
    : result.kind === "distributor"
      ? "Distribuidor sin precio"
      : "Referencia general";

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
    setShowStudy(false);
    setFilter("all");
  }
  function startExample() {
    setTerm("Arroz");
    setRegion("Lima");
    setSearch({ term: "Arroz", region: "Lima" });
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
      <a href="#market-results" className="skip-link">
        Ir a los resultados
      </a>
      <header className="topbar market-topbar">
        <div className="brand">
          <span className="brand-icon">
            <ClipboardList size={22} />
          </span>
          <span>
            Compras <span className="brand-description">para restaurantes</span>
          </span>
        </div>
        <button
          className="button text-button"
          onClick={() => {
            setShowStudy(!showStudy);
            setFilter("all");
          }}
        >
          <Bookmark size={18} />
          Mi estudio
          {selected.length > 0 && (
            <span className="selection-count">{selected.length}</span>
          )}
        </button>
      </header>
      <main
        className={`market-main ${search || showStudy ? "has-results" : "is-intro"}`}
      >
        <div className="workspace-nav">
          <span>
            <Search size={16} />
            Explorar mercado
          </span>
          <span className="demo-badge">Prototipo de investigación</span>
        </div>
        <div className="market-intro">
          <h1>Investiga tus insumos.</h1>
          <p>
            Precios por unidad, presentaciones y proveedores. Guarda las
            opciones que quieras revisar.
          </p>
        </div>
        <form className="market-search" onSubmit={explore}>
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
              />
            </div>
          </label>
          <label className="field">
            <span>Zona de interés</span>
            <select
              aria-label="Zona de interés"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option>Lima</option>
              <option>Arequipa</option>
              <option>Cusco</option>
            </select>
          </label>
          <button type="submit" className="button primary">
            <Search size={18} />
            Explorar ejemplo
          </button>
          <button
            type="button"
            className="button secondary"
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
          </button>
          <p className="market-search-note">
            <Info size={16} />
            «Explorar ejemplo» filtra datos sintéticos de arroz y abarrotes en
            Lima. La búsqueda web se ejecuta por separado cuando está
            habilitada.
          </p>
        </form>
        {persistenceEnabled && (
          <LiveResearch
            request={webRequest}
            onStatus={setWebStatus}
            onPrepare={onPrepare}
          />
        )}
        <IngredientIntake
          activeIngredient={search?.term ?? null}
          onExplore={(ingredient) => {
            if (ingredient === search?.term) return;
            if (selectedIds.length > 0 || study.id)
              setNextIngredient(ingredient);
            else beginIngredientStudy(ingredient);
          }}
        />
        {error && !prepareOpen && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

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
            Guardado no configurado. Puedes explorar ejemplos; esta selección se
            pierde al recargar.
          </p>
        )}
        {!search && !showStudy ? (
          <section className="market-start" aria-labelledby="start-title">
            <div>
              <h2 id="start-title">Empieza con arroz en Lima</h2>
              <p>
                Un saco de 18 kg, una bolsa de 1 kg y un distribuidor sin precio
                publicado. Revisa qué puedes comparar y qué falta consultar.
              </p>
              <button className="button secondary" onClick={startExample}>
                Explorar ejemplo de arroz <ArrowRight size={17} />
              </button>
            </div>
            <dl className="example-preview">
              {marketExamples
                .filter(
                  (item): item is CatalogResult => item.kind === "catalog",
                )
                .map((item) => (
                  <div key={item.id}>
                    <dt>
                      Presentación de{" "}
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
                <dt>Otro distribuidor</dt>
                <dd>Por consultar</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section id="market-results" aria-labelledby="results-title">
            <div className="section-heading">
              <div>
                <h2 id="results-title">
                  {showStudy ? "Mi estudio de mercado" : sourceTitle}
                </h2>
                <p>
                  {showStudy
                    ? `${selected.length} ${selected.length === 1 ? "opción seleccionada" : "opciones seleccionadas"} en esta vista`
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
                  Volver a resultados
                </button>
              )}
            </div>
            <div className="market-toolbar" aria-label="Tipos de resultado">
              <SlidersHorizontal size={16} />
              {(
                [
                  ["all", "Todos"],
                  ["catalog", "Con precio"],
                  ["distributor", "Sin precio"],
                  ["reference", "Referencias"],
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
            {visible.length === 0 ? (
              <div className="empty-state">
                <Search size={32} />
                <h3>
                  {showStudy
                    ? "Todavía no tienes opciones de este tipo"
                    : "No hay ejemplos para esta búsqueda"}
                </h3>
                <p>
                  {showStudy
                    ? "Selecciona resultados para construir tu estudio. No necesitas preparar una compra."
                    : "Esto no indica que no existan distribuidores. El prototipo solo contiene ejemplos de arroz y abarrotes en Lima."}
                </p>
                <button className="button secondary" onClick={startExample}>
                  Ver ejemplo de arroz
                </button>
              </div>
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
                          ? `Zona de referencia: ${result.region}.`
                          : `${result.region} · Reparto por confirmar`}
                      </div>
                      <button
                        className="button text-button source-button"
                        onClick={() => setSource(result)}
                      >
                        <FileText size={15} />
                        Ver fuente de ejemplo{" "}
                        <span>{dateLabel(result.source.observedAt)}</span>
                      </button>
                    </div>
                    <div className="result-value">
                      {result.kind === "catalog" ? (
                        <>
                          <span>Precio por unidad · ejemplo</span>
                          <strong className="normalized-price">
                            {publishedUnitPrice(result) === null ? (
                              "Por confirmar"
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
                            {money(result.priceCents, result.currency)} por{" "}
                            {result.packageContent === null
                              ? "presentación por confirmar"
                              : `${numberLabel(result.packageContent)} ${result.packageUnit}`}
                          </p>
                          <small>
                            No confirma stock, impuestos ni entrega.
                          </small>
                        </>
                      ) : result.kind === "distributor" ? (
                        <>
                          <span>Precio no publicado</span>
                          <strong className="contact-heading">
                            Consultar catálogo
                          </strong>
                          <p>
                            {result.contact
                              ? "Contacto comercial ilustrativo disponible"
                              : "Sin contacto confirmado"}
                          </p>
                          <button
                            className="button text-button"
                            onClick={() => setSource(result)}
                          >
                            <Mail size={16} />
                            Ver contacto
                          </button>
                        </>
                      ) : (
                        <>
                          <span>Contexto del mercado</span>
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
                          ? "En mi estudio"
                          : "Añadir a mi estudio"}
                      </button>
                      {result.kind !== "reference" && (
                        <button
                          className="button text-button"
                          onClick={() => requestQuote(result)}
                        >
                          Preparar consulta <ArrowRight size={16} />
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
                    {selected.length === 1 ? "opción" : "opciones"} en tu
                    estudio
                  </h3>
                  <p>Preparar una compra es opcional.</p>
                </div>
                <div className="study-next-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setShowStudy(true);
                      setFilter("all");
                    }}
                  >
                    Revisar selección
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
                    Preparar compra <ArrowRight size={17} />
                  </button>
                  {priced.length === 0 && (
                    <small>
                      Para calcular una compra, selecciona un precio o solicita
                      cotización.
                    </small>
                  )}
                </div>
              </section>
            )}
          </section>
        )}
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
                />
              </div>
            ))}
        {persistenceEnabled && <DocumentExtraction onPrepare={onPrepare} />}
        <ExtractionReview onPrepare={onPrepare} />
        <aside className="market-context">
          <h3>¿Ya tienes una cotización?</h3>
          <p>
            Puedes introducir precios y condiciones en la comparación manual. La
            lectura automática de foto/PDF está disponible para los ejemplos al
            configurar OpenAI. Los archivos propios conservan la alternativa
            manual.
          </p>
          <button className="button text-button" onClick={onManualExample}>
            Abrir alternativa de comparación manual <ArrowRight size={16} />
          </button>
        </aside>
        <footer>
          <span>
            Prototipo con ejemplos. Guarda el estudio para recuperar su
            selección. Las comparaciones de ejemplo tienen guardado
            independiente.
          </span>
          <span>
            Fuentes y contactos ficticios. No se han enviado consultas.
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
            <button
              className="button secondary"
              onClick={() => setNextIngredient(null)}
            >
              Volver al estudio
            </button>
            <button
              className="button primary"
              onClick={() => beginIngredientStudy(nextIngredient)}
            >
              Iniciar otro estudio
            </button>
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
            <button className="button secondary" onClick={() => setQuote(null)}>
              Cerrar
            </button>
            <button
              className="button primary"
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
            </button>
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
            <button
              className="button secondary"
              onClick={() => setPrepareOpen(false)}
            >
              Seguir investigando
            </button>
            <button
              className="button primary"
              disabled={!confirmed}
              onClick={prepare}
            >
              Indicar cantidad y condiciones
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

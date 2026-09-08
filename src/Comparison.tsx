import { Dialog } from "./components/Dialog";
import { useRef, useState, type FormEvent } from "react";
import SavedComparisons, {
  type SavedComparison,
} from "./components/SavedComparisons";
import {
  ArrowRight,
  Check,
  CircleHelp,
  ClipboardList,
  FileText,
  Info,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  Trash2,
  Truck,
} from "lucide-react";
import { riceOffers, riceRequest } from "../fixtures/procurement";
import {
  evaluateOffer,
  type SupplierOffer,
  type ProcurementRequest,
  type BaseUnit,
} from "./domain/procurement";
import { money, numberLabel, parseCents, parseDecimal } from "./numbers";

import type { ComparisonSource as Source, PurchaseSeed } from "./domain/market";
const today = () => new Date().toISOString().slice(0, 10);
const initialSources = (): Record<string, Source> =>
  Object.fromEntries(
    riceOffers.map((offer) => [
      offer.id,
      {
        label: "Cotización de ejemplo",
        date: "2026-09-07",
        original: { ...offer },
        edited: false,
      },
    ]),
  );
const unitName = (unit: string) => (unit === "unit" ? "unid." : unit);
const displayDate = (date: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function OfferEditor({
  offer,
  request,
  onSave,
  onClose,
}: {
  offer?: SupplierOffer;
  request: ProcurementRequest;
  onSave: (offer: SupplierOffer) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const field = (
    name: string,
    label: string,
    value: string | number | null | undefined,
    hint?: string,
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        aria-label={label}
        aria-describedby={hint ? `hint-${name}` : undefined}
        defaultValue={value ?? ""}
        inputMode={
          ["price", "content", "minimum", "freight"].includes(name)
            ? "decimal"
            : undefined
        }
        maxLength={160}
      />
      {hint && <small id={`hint-${name}`}>{hint}</small>}
    </label>
  );
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const next: SupplierOffer = {
      id: offer?.id ?? crypto.randomUUID(),
      supplier: text("supplier"),
      ingredient: text("ingredient"),
      specification: text("specification"),
      packageContent: parseDecimal(text("content")),
      packageUnit: text("unit") as SupplierOffer["packageUnit"],
      priceCents: parseCents(text("price")),
      currency: text("currency") as SupplierOffer["currency"],
      minimumPackages: parseDecimal(text("minimum"), 0),
      freightCents: parseCents(text("freight")),
      taxStatus: text("tax") as SupplierOffer["taxStatus"],
      deliveryConfirmed: data.get("delivery") === "on",
    };
    if (!next.supplier || !next.ingredient || !next.specification) {
      setError(
        "Completa proveedor, insumo y especificación para identificar la oferta.",
      );
      return;
    }
    if (
      [
        next.packageContent,
        next.priceCents,
        next.minimumPackages,
        next.freightCents,
      ].some((value) => value !== null && !Number.isFinite(value))
    ) {
      setError(
        "Usa números sin separador de miles. Los importes admiten hasta 2 decimales y el mínimo debe ser entero.",
      );
      return;
    }
    if (
      (next.packageContent !== null && next.packageContent <= 0) ||
      (next.priceCents !== null && next.priceCents <= 0) ||
      (next.minimumPackages !== null && next.minimumPackages < 1)
    ) {
      setError(
        "Contenido, precio y mínimo deben ser mayores que cero. Si falta un dato, déjalo vacío.",
      );
      return;
    }
    onSave(next);
  }
  return (
    <Dialog
      title={offer ? "Editar oferta" : "Agregar oferta manual"}
      onClose={onClose}
      wide
    >
      <p className="muted">
        Copia las condiciones de la oferta. Si no conoces un dato, déjalo vacío:
        quedará pendiente.
      </p>
      <form onSubmit={save}>
        <div className="form-grid">
          {field("supplier", "Proveedor", offer?.supplier)}
          {field(
            "ingredient",
            "Insumo",
            offer?.ingredient ?? request.ingredient,
          )}
          <div className="full-width">
            {field(
              "specification",
              "Especificación / calidad",
              offer?.specification ?? request.specification,
            )}
          </div>
          {field(
            "content",
            "Contenido por presentación",
            offer?.packageContent,
            "Ej. 18 para un saco de 18 kg",
          )}
          <label className="field">
            <span>Unidad del contenido</span>
            <select
              aria-label="Unidad del contenido"
              name="unit"
              defaultValue={offer?.packageUnit ?? request.unit}
            >
              <option value="kg">Kilogramos (kg)</option>
              <option value="g">Gramos (g)</option>
              <option value="L">Litros (L)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="unit">Unidades</option>
            </select>
          </label>
          {field(
            "price",
            "Precio por presentación",
            offer?.priceCents == null ? null : offer.priceCents / 100,
            "Sin separadores de miles. Ej. 80,50",
          )}
          <label className="field">
            <span>Moneda</span>
            <select
              aria-label="Moneda"
              name="currency"
              defaultValue={offer?.currency ?? "PEN"}
            >
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          {field(
            "minimum",
            "Mínimo de presentaciones",
            offer ? offer.minimumPackages : 1,
            "Presentaciones completas, no kg",
          )}
          {field(
            "freight",
            "Entrega por pedido",
            offer?.freightCents == null ? null : offer.freightCents / 100,
            "0 si está incluida. Vacío si falta confirmar.",
          )}
          <label className="field full-width">
            <span>Impuestos del precio y la entrega</span>
            <select
              aria-label="Impuestos del precio y la entrega"
              name="tax"
              defaultValue={offer?.taxStatus ?? "unknown"}
            >
              <option value="unknown">Por confirmar</option>
              <option value="included">
                Importes finales, impuestos incluidos
              </option>
              <option value="excluded">Faltan impuestos por sumar</option>
            </select>
          </label>
          <label className="checkbox full-width">
            <input
              name="delivery"
              type="checkbox"
              defaultChecked={offer?.deliveryConfirmed ?? false}
            />
            <span>El proveedor puede entregar cuando lo necesito</span>
          </label>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            <Check size={18} />
            Guardar oferta
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function Comparison({
  seed,
  onBack,
  persistenceEnabled,
}: {
  seed?: PurchaseSeed;
  onBack?: () => void;
  persistenceEnabled: boolean;
}) {
  const [request, setRequest] = useState<ProcurementRequest>({
    ...(seed?.request ?? riceRequest),
  });
  const [quantity, setQuantity] = useState(
    seed ? "" : String(riceRequest.quantity),
  );
  const [offers, setOffers] = useState<SupplierOffer[]>(() =>
    (seed?.offers ?? riceOffers).map((offer) => ({ ...offer })),
  );
  const [sources, setSources] = useState(
    () => seed?.sources ?? initialSources(),
  );
  const [modal, setModal] = useState<"new" | "reset" | "help" | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState<SavedComparison["id"] | null>(null);
  const [savedRevision, setSavedRevision] = useState(0);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const currentClientId = useRef(clientId);
  const [baselineRequest, setBaselineRequest] = useState<ProcurementRequest>(
    () => ({ ...(seed?.request ?? riceRequest) }),
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectionFingerprint, setSelectionFingerprint] = useState<
    string | null
  >(null);
  const effectiveRequest = {
    ...request,
    quantity: parseDecimal(quantity) ?? NaN,
  };
  const validQuantity =
    Number.isFinite(effectiveRequest.quantity) && effectiveRequest.quantity > 0;
  const evaluations = offers.map((offer) =>
    evaluateOffer(effectiveRequest, offer),
  );
  const complete = evaluations
    .map((result, i) => ({ result, offer: offers[i] }))
    .filter(({ result }) => result.eligibleForComparison);
  const sameCurrency =
    complete.length === offers.length &&
    new Set(offers.map((offer) => offer.currency)).size === 1;
  const canCompare = validQuantity && complete.length >= 2 && sameCurrency;
  const totals = complete.map(({ result }) => result.totalCents!);
  const difference = canCompare
    ? Math.max(...totals) - Math.min(...totals)
    : null;
  const lowest = canCompare
    ? complete.filter(({ result }) => result.totalCents === Math.min(...totals))
    : [];
  const source = sourceId ? sources[sourceId] : null;
  const editingOffer = offers.find((offer) => offer.id === editing);
  const unit = unitName(request.unit);
  const hasWebSources = offers.some(
    (offer) => sources[offer.id]?.marketSource?.simulated === false,
  );
  const fingerprint = JSON.stringify({ request: effectiveRequest, offers });
  const activeSelection =
    selectionFingerprint === fingerprint ? selectedOfferId : null;
  const persistableScenario =
    offers.length > 0 &&
    request.ingredient === baselineRequest.ingredient &&
    request.specification === baselineRequest.specification &&
    request.unit === baselineRequest.unit &&
    offers.every((offer) => {
      const entry = sources[offer.id];
      return (
        entry !== undefined &&
        entry.extraction === undefined &&
        entry.label !== "Entrada manual" &&
        offer.supplier === entry.original.supplier &&
        offer.ingredient === entry.original.ingredient &&
        offer.specification === entry.original.specification
      );
    });
  const pendingQuantity = quantity.trim() === "";
  const persistable = persistableScenario && (pendingQuantity || validQuantity);
  const blockedReason = !persistableScenario
    ? "Esta demo solo guarda las ofertas originales del ejemplo de arroz o del catálogo. Las ofertas agregadas manualmente siguen disponibles en esta vista."
    : !pendingQuantity && !validQuantity
      ? "Corrige la cantidad antes de guardar. Déjala vacía si todavía está pendiente."
      : null;

  function chooseOffer(offerId: string) {
    const evaluation =
      evaluations[offers.findIndex((offer) => offer.id === offerId)];
    if (!evaluation?.eligibleForComparison) return;
    setSelectedOfferId(offerId);
    setSelectionFingerprint(fingerprint);
    setMessage(
      "Oferta elegida para esta comparación. Esto no registra una compra.",
    );
  }

  function openSaved(comparison: SavedComparison) {
    setRequest({ ...comparison.request });
    setQuantity(
      comparison.request.quantity > 0
        ? String(comparison.request.quantity)
        : "",
    );
    setOffers(comparison.offers.map((offer) => ({ ...offer })));
    setSources(comparison.sources);
    setBaselineRequest({ ...comparison.request });
    setSavedId(comparison.id);
    setSavedRevision(comparison.revision);
    setSelectedOfferId(comparison.selectedOfferId);
    setSelectionFingerprint(
      JSON.stringify({
        request: comparison.request,
        offers: comparison.offers,
      }),
    );
    setMessage("Comparación recuperada. Reemplazó el borrador de esta vista.");
    window.scrollTo(0, 0);
  }

  function reset() {
    setRequest({ ...(seed?.request ?? riceRequest) });
    setQuantity(seed ? "" : String(riceRequest.quantity));
    setOffers((seed?.offers ?? riceOffers).map((offer) => ({ ...offer })));
    setSources(seed?.sources ?? initialSources());
    setSavedId(null);
    setSavedRevision(0);
    const nextClientId = crypto.randomUUID();
    currentClientId.current = nextClientId;
    setClientId(nextClientId);
    setBaselineRequest({ ...(seed?.request ?? riceRequest) });
    setSelectedOfferId(null);
    setSelectionFingerprint(null);
    setModal(null);
    setMessage(seed ? "Selección inicial restaurada." : "Ejemplo restaurado.");
  }
  function saveOffer(offer: SupplierOffer) {
    setOffers((current) =>
      current.some((item) => item.id === offer.id)
        ? current.map((item) => (item.id === offer.id ? offer : item))
        : [...current, offer],
    );
    setSources((current) => ({
      ...current,
      [offer.id]: current[offer.id]
        ? { ...current[offer.id], edited: true }
        : {
            label: "Entrada manual",
            date: today(),
            original: { ...offer },
            edited: false,
          },
    }));
    setEditing(null);
    setModal(null);
    setMessage("Oferta guardada en esta vista.");
  }
  function missingExample(kind: "weight" | "freight") {
    setOffers((current) =>
      current.map((offer, i) =>
        i === 0
          ? {
              ...offer,
              ...(kind === "weight"
                ? { packageContent: null }
                : { freightCents: null }),
            }
          : offer,
      ),
    );
    if (offers[0])
      setSources((current) => ({
        ...current,
        [offers[0].id]: { ...current[offers[0].id], edited: true },
      }));
    setMessage(
      kind === "weight"
        ? "Se dejó el contenido de la primera oferta pendiente."
        : "Se dejó la entrega de la primera oferta pendiente.",
    );
  }

  return (
    <>
      <a href="#comparison" className="skip-link">
        Ir a la comparación
      </a>
      <header className="topbar">
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
          aria-label="Cómo comparar"
          onClick={() => setModal("help")}
        >
          <CircleHelp size={18} />
          <span>Cómo comparar</span>
        </button>
      </header>
      <main>
        {onBack && (
          <button className="button text-button" onClick={onBack}>
            Volver al estudio de mercado
          </button>
        )}
        <div className="workspace-nav">
          <span>
            <Scale size={16} /> Comparación de insumos
          </span>
          <span className="demo-badge">
            {hasWebSources
              ? "Fuentes web revisadas"
              : seed
                ? "Desde tu estudio de ejemplo"
                : "Ejemplo sintético"}
          </span>
        </div>
        <div className="page-title">
          <div>
            <h1>Compara antes de comprar</h1>
            <p>
              Añade cantidad y confirma condiciones para calcular el pedido.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setModal("reset")}
          >
            <RotateCcw size={16} />
            {seed ? "Restaurar selección" : "Restaurar ejemplo"}
          </button>
        </div>
        {persistenceEnabled ? (
          <SavedComparisons
            draft={{
              clientId,
              id: savedId,
              expectedRevision: savedRevision,
              request: { ...request, quantity: parseDecimal(quantity) ?? 0 },
              offers,
              sources,
              selectedOfferId: activeSelection,
              persistable,
              blockedReason,
            }}
            onOpen={openSaved}
            onSaved={(saved, submittedClientId) => {
              // Update only persistence metadata: edits made while the request was
              // in flight remain the visible draft.
              if (submittedClientId !== currentClientId.current) return false;
              setSavedId(saved.id);
              setSavedRevision(saved.revision);
              return true;
            }}
          />
        ) : (
          <p className="notice info">
            El guardado de comparaciones no está configurado. Puedes usar el
            ejemplo durante esta visita.
          </p>
        )}
        <section className="request-panel" aria-label="Tu necesidad de compra">
          <div className="request-title">
            <Package size={21} />
            <h2>¿Qué necesitas comprar?</h2>
          </div>
          <div className="request-fields">
            <label className="field ingredient">
              <span>Insumo</span>
              <input
                value={request.ingredient}
                onChange={(e) =>
                  setRequest({ ...request, ingredient: e.target.value })
                }
                maxLength={120}
              />
            </label>
            <label className="field specification">
              <span>Especificación / calidad</span>
              <input
                value={request.specification}
                onChange={(e) =>
                  setRequest({ ...request, specification: e.target.value })
                }
                maxLength={160}
              />
            </label>
            <label className="field quantity">
              <span>Cantidad necesaria</span>
              <input
                inputMode="decimal"
                value={quantity}
                aria-invalid={!validQuantity}
                aria-describedby={
                  !validQuantity ? "quantity-error" : "quantity-help"
                }
                onChange={(e) => setQuantity(e.target.value)}
                maxLength={16}
              />
            </label>
            <label className="field unit">
              <span>Unidad</span>
              <select
                value={request.unit}
                onChange={(e) =>
                  setRequest({ ...request, unit: e.target.value as BaseUnit })
                }
              >
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="unit">unid.</option>
              </select>
            </label>
          </div>
          {!validQuantity ? (
            <p className="field-error" id="quantity-error">
              Escribe una cantidad mayor que cero, con hasta 3 decimales y sin
              separador de miles.
            </p>
          ) : (
            <p className="field-hint" id="quantity-help">
              Calculamos presentaciones completas para cubrir tu necesidad.
              Puedes usar punto o coma decimal.
            </p>
          )}
        </section>

        <section
          id="comparison"
          tabIndex={-1}
          aria-labelledby="comparison-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="comparison-title">Tus ofertas, en la misma medida</h2>
              <p>
                {offers.length}{" "}
                {offers.length === 1
                  ? "oferta para revisar"
                  : "ofertas para revisar"}{" "}
                {hasWebSources
                  ? "· Datos revisados de páginas públicas; condiciones por confirmar"
                  : "· Precios de ejemplo, no cotizaciones reales"}
              </p>
            </div>
            <button
              className="button primary"
              disabled={offers.length >= 4}
              onClick={() => setModal("new")}
            >
              <Plus size={18} />
              Agregar oferta
            </button>
          </div>
          {offers.length === 0 ? (
            <div className="empty-state">
              <Package size={36} />
              <h3>Empieza con una oferta</h3>
              <p>
                Agrega los datos que tengas. Podrás completar lo que falte
                después.
              </p>
              <button
                className="button primary"
                onClick={() => setModal("new")}
              >
                <Plus size={18} />
                Agregar primera oferta
              </button>
            </div>
          ) : (
            <>
              <div
                className="comparison-summary"
                aria-live="polite"
                aria-atomic="true"
              >
                {canCompare ? (
                  <>
                    <span className="summary-icon">
                      <Scale size={22} />
                    </span>
                    <div>
                      <h3>
                        {difference === 0
                          ? "Las ofertas requieren el mismo desembolso"
                          : `${lowest.map(({ offer }) => offer.supplier).join(" y ")} requiere ${money(difference, offers[0].currency)} menos${offers.length > 2 ? " que la oferta de mayor desembolso" : ""}`}
                      </h3>
                      <p>
                        Para {numberLabel(effectiveRequest.quantity)} {unit}.
                        Incluye entrega e importes finales; revisa también
                        cuánto recibirías.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="summary-icon pending">
                      <Info size={22} />
                    </span>
                    <div>
                      <h3>
                        {offers.length === 1
                          ? "Una oferta es un buen comienzo"
                          : "Todavía no hay una comparación completa"}
                      </h3>
                      <p>
                        {offers.length === 1
                          ? "Agrega otra oferta del mismo insumo y calidad para comparar."
                          : "Revisa los datos pendientes, la especificación y la moneda de cada oferta."}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div
                className="mobile-totals"
                aria-label="Resumen de desembolsos"
              >
                {offers.map((offer, i) => (
                  <div key={offer.id}>
                    <span>{offer.supplier}</span>
                    <strong>
                      {money(evaluations[i].totalCents, offer.currency)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="offers-grid">
                {offers.map((offer, index) => {
                  const result = evaluations[index];
                  const issues = [
                    ...result.errors,
                    ...result.pending,
                    ...result.comparisonExclusions,
                  ];
                  const isComplete =
                    issues.length === 0 && result.totalCents !== null;
                  const sourceInfo = sources[offer.id];
                  return (
                    <article
                      className="offer"
                      key={offer.id}
                      aria-label={`Oferta de ${offer.supplier}`}
                    >
                      <div className="offer-heading">
                        <div className="supplier-avatar">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div>
                          <h3>{offer.supplier}</h3>
                          <p>
                            {offer.packageContent === null
                              ? "Contenido por confirmar"
                              : `${numberLabel(offer.packageContent)} ${unitName(offer.packageUnit ?? "")} por presentación`}
                          </p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Editar ${offer.supplier}`}
                          onClick={() => setEditing(offer.id)}
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                      <div className="offer-total">
                        <span>Desembolso del pedido</span>
                        <strong data-testid={`total-${index}`}>
                          {money(result.totalCents, offer.currency)}
                        </strong>
                        <span
                          className={`status ${isComplete ? "" : "warning"}`}
                        >
                          {isComplete ? (
                            <Check size={14} />
                          ) : (
                            <Info size={14} />
                          )}
                          {isComplete
                            ? "Condiciones completas"
                            : "Faltan datos o condiciones"}
                        </span>
                      </div>
                      <button
                        className={
                          activeSelection === offer.id
                            ? "button primary"
                            : "button secondary"
                        }
                        disabled={!result.eligibleForComparison}
                        aria-pressed={activeSelection === offer.id}
                        onClick={() => chooseOffer(offer.id)}
                      >
                        <Check size={16} />
                        {activeSelection === offer.id
                          ? "Oferta elegida"
                          : "Elegir oferta"}
                      </button>
                      <dl className="offer-details">
                        <div>
                          <dt>Recibirías</dt>
                          <dd>
                            {numberLabel(result.purchasedQuantity)}
                            {result.purchasedQuantity !== null
                              ? ` ${unit}`
                              : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Excedente sobre tu necesidad</dt>
                          <dd>
                            {numberLabel(result.excessQuantity)}
                            {result.excessQuantity !== null ? ` ${unit}` : ""}
                          </dd>
                        </div>
                        <div className="detail-separator">
                          <dt>
                            Precio por {unit}
                            <small>Sin entrega</small>
                          </dt>
                          <dd>
                            {money(result.unitPriceCents, offer.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Presentaciones a comprar</dt>
                          <dd>{numberLabel(result.packageCount)}</dd>
                        </div>
                        <div>
                          <dt>
                            Mercancía
                            <small>
                              {money(offer.priceCents, offer.currency)} por
                              presentación
                            </small>
                          </dt>
                          <dd>{money(result.subtotalCents, offer.currency)}</dd>
                        </div>
                        <div>
                          <dt>Entrega por pedido</dt>
                          <dd>
                            {offer.freightCents === 0
                              ? "Incluida"
                              : money(offer.freightCents, offer.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Mínimo del proveedor</dt>
                          <dd>
                            {offer.minimumPackages === null
                              ? "Pendiente"
                              : `${offer.minimumPackages} ${offer.minimumPackages === 1 ? "presentación" : "presentaciones"}`}
                          </dd>
                        </div>
                        <div>
                          <dt>Impuestos</dt>
                          <dd>
                            {offer.taxStatus === "included"
                              ? "Incluidos"
                              : offer.taxStatus === "excluded"
                                ? "Falta sumar"
                                : "Por confirmar"}
                          </dd>
                        </div>
                        <div>
                          <dt>Entrega cuando necesitas</dt>
                          <dd>
                            {offer.deliveryConfirmed
                              ? "Confirmada"
                              : "Por confirmar"}
                          </dd>
                        </div>
                      </dl>
                      {issues.length > 0 && (
                        <div className="offer-issues">
                          <strong>
                            <Info size={16} />
                            Revisa esta oferta
                          </strong>
                          <ul>
                            {issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                          <button
                            className="button text-button"
                            onClick={() => setEditing(offer.id)}
                          >
                            Completar datos <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                      <div className="offer-source">
                        <div>
                          <FileText size={16} />
                          <span>
                            {sourceInfo?.label ?? "Entrada manual"}
                            <small>
                              {sourceInfo ? displayDate(sourceInfo.date) : ""}
                              {sourceInfo?.edited
                                ? " · Editada manualmente"
                                : ""}
                            </small>
                          </span>
                        </div>
                        <button
                          className="button text-button"
                          onClick={() => setSourceId(offer.id)}
                        >
                          Ver origen
                        </button>
                      </div>
                      <button
                        className="remove-offer"
                        onClick={() => setDeleting(offer.id)}
                      >
                        <Trash2 size={14} />
                        Quitar oferta
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="comparison-footnote">
                <Info size={16} />
                El excedente es lo que recibirías de más, no una pérdida
                calculada. Esta comparación no realiza una compra.
              </p>
            </>
          )}
        </section>
        <section className="try-panel" aria-label="Explorar datos incompletos">
          <div>
            <h3>¿Y si falta un dato?</h3>
            <p>
              Prueba cómo cambia la comparación cuando una oferta llega
              incompleta.
            </p>
          </div>
          <div className="try-actions">
            <button
              className="button secondary"
              disabled={!offers.length}
              onClick={() => missingExample("weight")}
            >
              <Package size={16} />
              Falta el peso
            </button>
            <button
              className="button secondary"
              disabled={!offers.length}
              onClick={() => missingExample("freight")}
            >
              <Truck size={16} />
              Falta la entrega
            </button>
          </div>
        </section>
        <footer>
          <span>
            {hasWebSources
              ? "Revisión web temporal: estas correcciones no se guardan todavía."
              : "Datos de prueba · Guarda la comparación para recuperarla."}
          </span>
          <span>Sin recetas ni historial de compras.</span>
        </footer>
        <p role="status" className="sr-only">
          {message}
        </p>
      </main>
      {(modal === "new" || editingOffer) && (
        <OfferEditor
          offer={editingOffer}
          request={request}
          onSave={saveOffer}
          onClose={() => {
            setModal(null);
            setEditing(null);
          }}
        />
      )}
      {modal === "reset" && (
        <Dialog
          title={
            seed ? "¿Restaurar la selección inicial?" : "¿Restaurar el ejemplo?"
          }
          onClose={() => setModal(null)}
        >
          <p>
            {seed
              ? "Se recuperarán los precios seleccionados del estudio, sin cantidad ni condiciones confirmadas."
              : "Se reemplazarán las ofertas y la cantidad de esta vista por el ejemplo inicial de arroz."}
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Conservar cambios
            </button>
            <button className="button primary" onClick={reset}>
              {seed ? "Restaurar selección" : "Restaurar ejemplo"}
            </button>
          </div>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="Una comparación, tres preguntas"
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            <p>
              <strong>¿Cuánto pagarías hoy?</strong> El desembolso suma las
              presentaciones necesarias y la entrega. Si faltan impuestos o
              condiciones, queda pendiente.
            </p>
            <p>
              <strong>¿Cuánto recibirías?</strong> Respetamos las presentaciones
              completas y el mínimo del proveedor, aunque necesites menos.
            </p>
            <p>
              <strong>¿Son ofertas equivalentes?</strong> Compara el mismo
              insumo, calidad y moneda. El precio por unidad no basta para
              decidir una compra.
            </p>
          </div>
          <button className="button primary" onClick={() => setModal(null)}>
            Entendido
          </button>
        </Dialog>
      )}
      {source && (
        <Dialog title="Origen de la oferta" onClose={() => setSourceId(null)}>
          <div className="source-document">
            <div className="source-document-head">
              <FileText size={28} />
              <span>{source.label}</span>
            </div>
            <h3>{source.original.supplier}</h3>
            <p>{displayDate(source.date)}</p>
            {source.marketSource && (
              <blockquote>{source.marketSource.evidence}</blockquote>
            )}
            {source.extraction && (
              <p>
                El documento y la propuesta extraída se conservan arriba junto a
                tus correcciones. Los siguientes importes son los que
                confirmaste al entrar a la comparación.
              </p>
            )}
            <dl className="offer-details">
              <div>
                <dt>Insumo</dt>
                <dd>{source.original.ingredient}</dd>
              </div>
              <div>
                <dt>Especificación</dt>
                <dd>{source.original.specification}</dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Contenido al confirmar revisión"
                    : "Contenido original"}
                </dt>
                <dd>
                  {numberLabel(source.original.packageContent)}{" "}
                  {unitName(source.original.packageUnit ?? "")}
                </dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Precio al confirmar revisión"
                    : "Precio original"}
                </dt>
                <dd>
                  {money(source.original.priceCents, source.original.currency)}
                </dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Entrega al confirmar revisión"
                    : "Entrega original"}
                </dt>
                <dd>
                  {money(
                    source.original.freightCents,
                    source.original.currency,
                  )}
                </dd>
              </div>
            </dl>
          </div>
          {source.marketSource?.url && (
            <a
              href={source.marketSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button text-button"
            >
              Abrir fuente web original
            </a>
          )}
          <p className="muted">
            {source.edited
              ? "La comparación usa tus cambios manuales. Aquí conservamos los valores de entrada."
              : source.marketSource?.simulated === false
                ? "Valores revisados desde una página pública; no equivalen a una cotización confirmada por el proveedor."
                : "Registro de datos sintéticos para probar la comparación. No es un documento de un proveedor real."}
          </p>
        </Dialog>
      )}
      {deleting && (
        <Dialog title="¿Quitar esta oferta?" onClose={() => setDeleting(null)}>
          <p>
            Se quitará {offers.find((offer) => offer.id === deleting)?.supplier}{" "}
            de esta comparación.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              onClick={() => {
                setOffers((current) =>
                  current.filter((offer) => offer.id !== deleting),
                );
                setDeleting(null);
                setMessage("Oferta quitada.");
              }}
            >
              Quitar oferta
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

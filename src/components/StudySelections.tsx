import { useState } from "react";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { combineReviewedOffers } from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import type { StudyProspect, WebSelection } from "../domain/study";
import { money, numberLabel } from "../numbers";
import QuotationMail from "./QuotationMail";
import "../styles/study.css";

export default function StudySelections({
  selections,
  prospects,
  onRemove,
  onRemoveProspect,
  onPrepare,
  filter,
}: {
  selections: WebSelection[];
  prospects: StudyProspect[];
  onRemove: (sourceId: string) => void;
  onRemoveProspect: (id: string) => void;
  onPrepare: (seed: PurchaseSeed) => void;
  filter: "all" | "catalog" | "distributor" | "reference";
}) {
  const [confirmedFingerprint, setConfirmedFingerprint] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const fingerprint = JSON.stringify(selections);
  const confirmed = confirmedFingerprint === fingerprint;
  const visibleSelections = selections.filter(
    ({ seed }) =>
      filter === "all" ||
      (filter === "catalog" && seed.offers[0].priceCents !== null) ||
      (filter === "distributor" && seed.offers[0].priceCents === null),
  );
  const prospectsVisible = filter === "all" || filter === "distributor";
  return (
    <div className="study-selections">
      {visibleSelections.map(({ sourceId, seed }) => {
        const offer = seed.offers[0],
          source = seed.sources[sourceId].marketSource;
        return (
          <article
            className="study-selection"
            key={sourceId}
            aria-label={`Oferta en estudio: ${offer.supplier}`}
          >
            <div className="study-selection-heading">
              <div>
                <span className="eyebrow">
                  Oferta revisada ·{" "}
                  {source?.simulated ? "Ejemplo simulado" : "Fuente web"}
                </span>
                <h3>{offer.supplier}</h3>
              </div>
              <button
                className="button text-button"
                aria-label={`Quitar oferta de ${offer.supplier}`}
                onClick={() => onRemove(sourceId)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              {offer.ingredient} · {offer.specification}
            </p>
            <dl className="study-selection-facts">
              <div>
                <dt>Precio por presentación</dt>
                <dd>{money(offer.priceCents, offer.currency)}</dd>
              </div>
              <div>
                <dt>Contenido</dt>
                <dd>
                  {offer.packageContent === null
                    ? "Por confirmar"
                    : `${numberLabel(offer.packageContent)} ${offer.packageUnit}`}
                </dd>
              </div>
            </dl>
            <p className="field-hint">
              Mínimo, impuestos y entrega por confirmar. Seleccionar esta oferta
              no registra una compra.
            </p>
            {source?.url && (
              <a href={source.url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> {source.title}
              </a>
            )}
            {source && (
              <p className="field-hint">
                Observado el{" "}
                {new Date(source.observedAt).toLocaleDateString("es-PE")}
              </p>
            )}
          </article>
        );
      })}
      {visibleSelections.length > 0 && (
        <div className="study-comparison-action">
          {selections.length > 1 && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) =>
                  setConfirmedFingerprint(e.target.checked ? fingerprint : null)
                }
              />
              Confirmo que las ofertas web corresponden al mismo insumo,
              especificación, unidad base y moneda
            </label>
          )}
          <button
            className="button primary"
            disabled={selections.length > 1 && !confirmed}
            onClick={() => {
              try {
                onPrepare(
                  combineReviewedOffers(
                    selections.map((item) => item.seed),
                    selections.length === 1 || confirmed,
                  ),
                );
                setError("");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Revisa las ofertas seleccionadas.",
                );
              }
            }}
          >
            Comparar ofertas revisadas <ArrowRight size={16} />
          </button>
          <p className="field-hint">
            Opcional: indica después cuánto necesitas y revisa el desembolso.
            Los ejemplos de catálogo se comparan por separado.
          </p>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {prospectsVisible &&
        prospects.map((item) => (
          <article
            className="study-selection"
            key={item.id}
            aria-label={`Distribuidor en estudio: ${item.supplier}`}
          >
            <div className="study-selection-heading">
              <div>
                <span className="eyebrow">
                  Distribuidor · Precio por consultar
                  {item.simulated === true
                    ? " · Ejemplo simulado"
                    : item.simulated === false
                      ? " · Fuente web"
                      : " · Origen por verificar"}
                </span>
                <h3>{item.supplier}</h3>
              </div>
              <button
                className="button text-button"
                aria-label={`Quitar distribuidor ${item.supplier}`}
                onClick={() => onRemoveProspect(item.id)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              {item.ingredient} · {item.region}
            </p>
            <p>Contacto: {item.contact ?? "Pendiente"}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {item.sourceTitle}
            </a>
            <p className="field-hint">
              Fuente observada el{" "}
              {new Date(item.observedAt).toLocaleDateString("es-PE")}. Contacto
              revisado por ti; disponibilidad y cobertura por confirmar.
            </p>
            <QuotationMail
              comparisonId={null}
              prospectId={item.id}
              offers={[]}
              onEditOffer={() => {}}
              onPrepare={onPrepare}
            />
          </article>
        ))}
    </div>
  );
}

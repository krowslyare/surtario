import {
  ArrowRight,
  Bookmark,
  Check,
  FileText,
  Mail,
  MapPin,
} from "lucide-react";
import { publishedUnitPrice, type MarketResult } from "../domain/market";
import { money, numberLabel } from "../numbers";
import { Button } from "./ui/Button";

export const marketDateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

export const marketKindLabel = (result: MarketResult) =>
  result.kind === "catalog"
    ? "Precio de catálogo"
    : result.kind === "distributor"
      ? "Distribuidor sin precio"
      : "Referencia general";

export function MarketResultRow({
  result,
  selected,
  onToggle,
  onSource,
  onQuote,
}: {
  result: MarketResult;
  selected: boolean;
  onToggle: (result: MarketResult) => void;
  onSource: (result: MarketResult) => void;
  onQuote: (result: MarketResult) => void;
}) {
  return (
    <article
      className={`market-result ${result.kind} ${selected ? "is-selected" : ""}`}
      aria-label={`Resultado: ${result.supplier}`}
    >
      <div className="result-main">
        <h3>{result.supplier}</h3>
        <div className="result-meta">
          <span className={`result-kind ${result.kind}`}>
            {marketKindLabel(result)}
          </span>
          <span className="result-location">
            <MapPin size={13} aria-hidden="true" />
            {result.region}
          </span>
        </div>
        <p>{result.description}</p>
        <Button
          variant="text"
          className="source-button"
          onClick={() => onSource(result)}
        >
          <FileText size={14} aria-hidden="true" />
          Ver fuente de ejemplo{" "}
          <span>{marketDateLabel(result.source.observedAt)}</span>
        </Button>
      </div>
      <div className="result-value">
        {result.kind === "catalog" ? (
          <>
            <strong className="normalized-price">
              {publishedUnitPrice(result) === null ? (
                "Por confirmar"
              ) : (
                <>
                  {money(publishedUnitPrice(result), result.currency)}{" "}
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
            <small>Stock, impuestos y entrega por confirmar.</small>
          </>
        ) : result.kind === "distributor" ? (
          <>
            <strong className="contact-heading">Precio por consultar</strong>
            <p>
              {result.contact
                ? "Contacto de ejemplo disponible"
                : "Sin contacto confirmado"}
            </p>
            <Button variant="text" onClick={() => onSource(result)}>
              <Mail size={15} aria-hidden="true" />
              Ver contacto
            </Button>
          </>
        ) : (
          <>
            <strong className="contact-heading">Contexto del mercado</strong>
            <p>{result.note}</p>
          </>
        )}
      </div>
      <div className="result-actions">
        <Button
          variant="secondary"
          aria-pressed={selected}
          onClick={() => onToggle(result)}
        >
          {selected ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Bookmark size={16} aria-hidden="true" />
          )}
          {selected ? "En mi estudio" : "Añadir a mi estudio"}
        </Button>
        {result.kind !== "reference" && (
          <Button variant="text" onClick={() => onQuote(result)}>
            Preparar consulta <ArrowRight size={15} aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}

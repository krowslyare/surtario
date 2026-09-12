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
  new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

export const marketKindLabel = (result: MarketResult) =>
  result.kind === "catalog"
    ? "Catalog price"
    : result.kind === "distributor"
      ? "Supplier without a price"
      : "Market reference";

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
      aria-label={`Result: ${result.supplier}`}
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
          View example source{" "}
          <span>{marketDateLabel(result.source.observedAt)}</span>
        </Button>
      </div>
      <div className="result-value">
        {result.kind === "catalog" ? (
          <>
            <strong className="normalized-price">
              {publishedUnitPrice(result) === null ? (
                "To confirm"
              ) : (
                <>
                  {money(publishedUnitPrice(result), result.currency)}{" "}
                  <span>/ {result.packageUnit}</span>
                </>
              )}
            </strong>
            <p className="package-price">
              {money(result.priceCents, result.currency)} per{" "}
              {result.packageContent === null
                ? "pack size to confirm"
                : `${numberLabel(result.packageContent)} ${result.packageUnit}`}
            </p>
            <small>Stock, tax and delivery to confirm.</small>
          </>
        ) : result.kind === "distributor" ? (
          <>
            <strong className="contact-heading">Price on request</strong>
            <p>
              {result.contact
                ? "Sample contact available"
                : "Contact not confirmed"}
            </p>
            <Button variant="text" onClick={() => onSource(result)}>
              <Mail size={15} aria-hidden="true" />
              View contact
            </Button>
          </>
        ) : (
          <>
            <strong className="contact-heading">Market context</strong>
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
          {selected ? "In my study" : "Add to study"}
        </Button>
        {result.kind !== "reference" && (
          <Button variant="text" onClick={() => onQuote(result)}>
            Prepare inquiry <ArrowRight size={15} aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}

import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, Info, X } from "lucide-react";
import { combineReviewedOffers } from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import { MAX_COMPARISON_OFFERS, type StudyProspect, type WebSelection } from "../domain/study";
import { evaluateOffer } from "../domain/procurement";
import { money, numberLabel } from "../numbers";
import type { SavedComparison } from "./SavedComparisons";

import "../styles/study.css";

export default function StudySelections({
  selections,
  prospects,
  onRemove,
  onRemoveProspect,
  onPrepare,
  onReplyPrepare,
  deliveryComparison,
  onDeliveryApplied,
  onOpenComparison,
  filter,
  onInquiry,
}: {
  onInquiry: (prospect: StudyProspect) => void;
  selections: WebSelection[];
  prospects: StudyProspect[];
  onRemove: (sourceId: string) => void;
  onRemoveProspect: (id: string) => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onReplyPrepare: (seed: PurchaseSeed) => void;
  deliveryComparison?: SavedComparison;
  onDeliveryApplied?: (comparison: SavedComparison) => void;
  onOpenComparison?: (comparison: SavedComparison) => void;
  filter: "all" | "catalog" | "distributor" | "reference";
}) {
  const [confirmedFingerprint, setConfirmedFingerprint] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [comparisonIds, setComparisonIds] = useState<string[]>(() =>
    selections.slice(0, MAX_COMPARISON_OFFERS).map((item) => item.sourceId),
  );
  const selectionIdsFingerprint = selections.map((item) => item.sourceId).join("|");
  useEffect(() => {
    setComparisonIds((current) => {
      const valid = current.filter((id) =>
        selections.some((item) => item.sourceId === id),
      ).slice(0, MAX_COMPARISON_OFFERS);
      return valid.length
        ? valid
        : selections.slice(0, MAX_COMPARISON_OFFERS).map((item) => item.sourceId);
    });
  }, [selectionIdsFingerprint]);
  const comparisonSelections = selections.length <= MAX_COMPARISON_OFFERS
    ? selections
    : selections.filter((item) => comparisonIds.includes(item.sourceId));
  const fingerprint = JSON.stringify(comparisonSelections);
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
        const unitPrice = evaluateOffer(seed.request, offer).unitPriceCents;
        const pendingTerms = [
          offer.minimumPackages === null ? "Minimum order" : null,
          offer.taxStatus === "unknown" ? "tax" : null,
          offer.freightCents === null || !offer.deliveryConfirmed ? "delivery" : null,
        ].filter(Boolean);
        let sourceHost = "Original page";
        try { if (source?.url) sourceHost = new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* Keep the source label. */ }
        return (
          <article
            className="study-selection study-offer"
            key={sourceId}
            aria-label={`Offer in study: ${offer.supplier}`}
          >
            <div className="study-selection-heading">
              <div>
                <span className="study-selection-label">
                  Reviewed offer ·{" "}
                  {source?.simulated ? "Simulated example" : "Web source"}
                </span>
                <h3>{offer.supplier}</h3>
              </div>
              <button
                className="button text-button study-remove"
                aria-label={`Remove offer from ${offer.supplier}`}
                onClick={() => onRemove(sourceId)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="study-selection-product">
              {offer.ingredient} · {offer.specification}
            </p>
            <dl className="study-selection-facts">
              <div>
                <dt>Price per package</dt>
                <dd>{money(offer.priceCents, offer.currency)}</dd>
              </div>
              <div>
                <dt>Package size</dt>
                <dd>{offer.packageContent === null ? "Needs confirmation" : `${numberLabel(offer.packageContent)} ${offer.packageUnit}`}</dd>
              </div>
              <div>
                <dt>Price per {seed.request.unit}</dt>
                <dd>{money(unitPrice, offer.currency)}</dd>
                <small>From package price</small>
              </div>
            </dl>
            {pendingTerms.length > 0 && <p className="study-selection-pending">
              <Info size={15} aria-hidden="true" />
              <span>{pendingTerms.join(", ")} to confirm</span>
            </p>}
            <footer className="study-selection-footer">
              <div className="study-selection-source">
                {source?.url && <a href={source.url} target="_blank" rel="noreferrer" title={source.title} aria-label={`View source for ${offer.supplier}`}>
                  <ExternalLink size={14} aria-hidden="true" /> View source <span>· {sourceHost}</span>
                </a>}
                {source && <small>Observed {new Date(source.observedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small>}
              </div>
              <div className="study-selection-actions">
                {selections.length > MAX_COMPARISON_OFFERS && (
                  <label className="checkbox study-compare-pick">
                    <input
                      type="checkbox"
                      checked={comparisonIds.includes(sourceId)}
                      disabled={
                        !comparisonIds.includes(sourceId) &&
                        comparisonIds.length >= MAX_COMPARISON_OFFERS
                      }
                      onChange={(event) => {
                        setComparisonIds((current) =>
                          event.target.checked
                            ? [...current, sourceId].slice(0, MAX_COMPARISON_OFFERS)
                            : current.filter((id) => id !== sourceId),
                        );
                        setError("");
                      }}
                    />
                    Compare
                  </label>
                )}
                <button className="button secondary" onClick={() => onPrepare(seed)}>{deliveryComparison ? "Open case comparison" : "Calculate this offer"}<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </footer>
          </article>
        );
      })}
      {visibleSelections.length > 0 && selections.length > 1 && (
        <div className="study-comparison-action">
          {comparisonSelections.length > 1 && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) =>
                  setConfirmedFingerprint(e.target.checked ? fingerprint : null)
                }
              />
              I confirm the selected offers match the same ingredient,
              specification, base unit, and currency
            </label>
          )}
          <button
            className="button primary"
            disabled={comparisonSelections.length === 0 || (comparisonSelections.length > 1 && !confirmed)}
            onClick={() => {
              try {
                onPrepare(
                  combineReviewedOffers(
                    comparisonSelections.map((item) => item.seed),
                    comparisonSelections.length === 1 || confirmed,
                  ),
                );
                setError("");
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Review the selected offers.",
                );
              }
            }}
          >
            Compare {comparisonSelections.length} reviewed {comparisonSelections.length === 1 ? "offer" : "offers"} <ArrowRight size={16} />
          </button>
          <p className="field-hint">
            {selections.length > MAX_COMPARISON_OFFERS
              ? `Choose up to ${MAX_COMPARISON_OFFERS} offers above, then enter the amount you need and review the total cost.`
              : "Optional: enter the amount you need next and review the total cost."}
            {" "}Catalog examples are compared separately.
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
            aria-label={`Distributor in study: ${item.supplier}`}
          >
            <div className="study-selection-heading">
              <div>
                <span className="study-selection-label">
                  Distributor · Request pricing
                  {item.simulated === true
                    ? " · Simulated example"
                    : item.simulated === false
                      ? " · Web source"
                      : " · Source needs verification"}
                </span>
                <h3>{item.supplier}</h3>
              </div>
              <button
                className="button text-button study-remove"
                aria-label={`Remove distributor ${item.supplier}`}
                onClick={() => onRemoveProspect(item.id)}
              >
                <X size={18} />
              </button>
            </div>
            <p>
              {item.ingredient} · {item.region}
            </p>
            <p>Contact: {item.contact ?? "Pending"}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {item.sourceTitle}
            </a>
            <p className="field-hint">
              Source observed on{" "}
              {new Date(item.observedAt).toLocaleDateString("en-US")}. You
              reviewed the contact; availability and service area still need
              confirmation.
            </p>
            <button className="button secondary" onClick={() => onInquiry(item)}>Prepare inquiry<ArrowRight size={16} aria-hidden="true" /></button>
          </article>
        ))}
    </div>
  );
}

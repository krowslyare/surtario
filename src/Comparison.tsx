import { SourceEvidence } from "./components/SourceEvidence";
import type { Id } from "../convex/_generated/dataModel";
import {
  previewFreightDecision,
  type FreightDecisionPreview,
} from "./domain/missingResolution";
import MissingConditionInsight, {
  ResolvedCondition,
} from "./components/MissingConditionInsight";
import Brand from "./components/Brand";
import { Button } from "./components/ui/Button";
import { Select } from "./components/ui/Select";
import PurchasingAdvisor, {
  comparisonStateFingerprint,
  defaultAdvisorContext,
  stableValue,
  type AdvisorDecisionState,
} from "./components/PurchasingAdvisor";
import { mergeReplyOffer } from "./domain/replyReview";
import QuotationMail from "./components/QuotationMail";
import { Dialog } from "./components/Dialog";
import { useRef, useState, type FormEvent } from "react";
import SavedComparisons, {
  type SavedComparison,
  type SavedComparisonsHandle,
} from "./components/SavedComparisons";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
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
import { comparisonExamples } from "../fixtures/procurement";
import {
  compareProcurement,
  type SupplierOffer,
  type ProcurementRequest,
  type BaseUnit,
} from "./domain/procurement";
import { money, numberLabel, parseCents, parseDecimal } from "./numbers";

import type { ComparisonSource as Source, PurchaseSeed } from "./domain/market";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const initialSources = (offers: SupplierOffer[]): Record<string, Source> =>
  Object.fromEntries(
    offers.map((offer) => [
      offer.id,
      {
        label: "Sample quote",
        date: "2026-09-07",
        original: { ...offer },
        edited: false,
      },
    ]),
  );
const unitName = (unit: string) => (unit === "unit" ? "units" : unit);
const displayDate = (date: string) => {
  const value = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(value.getTime())) return "Date pending";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
};

function OfferEditor({
  offer,
  request,
  defaultCurrency,
  onSave,
  onClose,
}: {
  offer?: SupplierOffer;
  request: ProcurementRequest;
  defaultCurrency: SupplierOffer["currency"];
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
      packageUnit: (text("unit") || null) as SupplierOffer["packageUnit"],
      priceCents: parseCents(text("price")),
      currency: text("currency") as SupplierOffer["currency"],
      minimumPackages: parseDecimal(text("minimum"), 0),
      freightCents: parseCents(text("freight")),
      taxStatus: text("tax") as SupplierOffer["taxStatus"],
      deliveryConfirmed: data.get("delivery") === "on",
    };
    if (!next.supplier || !next.ingredient || !next.specification) {
      setError(
        "Enter the supplier, ingredient and specification to identify this offer.",
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
        "Use numbers without thousands separators. Amounts allow 2 decimals; minimum packs must be a whole number.",
      );
      return;
    }
    if (
      (next.packageContent !== null && next.packageContent <= 0) ||
      (next.priceCents !== null && next.priceCents <= 0) ||
      (next.minimumPackages !== null && next.minimumPackages < 1)
    ) {
      setError(
        "Pack size, price and minimum must be greater than zero. Leave unknown values blank.",
      );
      return;
    }
    onSave(next);
  }
  return (
    <Dialog
      title={offer ? "Edit offer" : "Add a quote manually"}
      onClose={onClose}
      wide
    >
      <p className="muted">
        Enter the quoted terms. Leave unknown values blank to keep them pending.
      </p>
      <form onSubmit={save}>
        <div className="form-grid">
          {field("supplier", "Supplier", offer?.supplier)}
          {field(
            "ingredient",
            "Ingredient",
            offer?.ingredient ?? request.ingredient,
          )}
          <div className="full-width">
            {field(
              "specification",
              "Specification / quality",
              offer?.specification ?? request.specification,
            )}
          </div>
          {field(
            "content",
            "Content per pack",
            offer?.packageContent,
            "e.g. 25 for a 25 lb bag",
          )}
          <label className="field">
            <span>Pack unit</span>
            <Select
              aria-label="Pack unit"
              name="unit"
              defaultValue={offer?.packageUnit ?? ""}
              options={[
                { value: "", label: "To confirm" },
                { value: "kg", label: "Kilograms (kg)" },
                { value: "lb", label: "Pounds (lb)" },
                { value: "oz", label: "Ounces (oz, weight)" },
                { value: "g", label: "Grams (g)" },
                { value: "L", label: "Liters (L)" },
                { value: "ml", label: "Milliliters (ml)" },
                { value: "unit", label: "Units" },
              ]}
            />
          </label>
          {field(
            "price",
            "Price per pack",
            offer?.priceCents == null ? null : offer.priceCents / 100,
            "No thousands separators. e.g. 80.50",
          )}
          <label className="field">
            <span>Currency</span>
            <Select
              aria-label="Currency"
              name="currency"
              defaultValue={offer?.currency ?? defaultCurrency}
              options={[
                { value: "PEN", label: "Peruvian soles (PEN)" },
                { value: "USD", label: "US dollars (USD)" },
              ]}
            />
          </label>
          {field(
            "minimum",
            "Minimum packs",
            offer?.minimumPackages ?? null,
            "Whole packs, not weight",
          )}
          {field(
            "freight",
            "Delivery per order",
            offer?.freightCents == null ? null : offer.freightCents / 100,
            "0 if included. Leave blank if unknown.",
          )}
          <label className="field full-width">
            <span>Tax on goods and delivery</span>
            <Select
              aria-label="Tax on goods and delivery"
              name="tax"
              defaultValue={offer?.taxStatus ?? "unknown"}
              options={[
                { value: "unknown", label: "To confirm" },
                { value: "included", label: "Final amounts, including tax" },
                { value: "excluded", label: "Tax still needs to be added" },
              ]}
            />
          </label>
          <label className="checkbox full-width">
            <input
              name="delivery"
              type="checkbox"
              defaultChecked={offer?.deliveryConfirmed ?? false}
            />
            <span>The supplier can deliver when I need it</span>
          </label>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            <Check size={18} />
            Save offer
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function Comparison({
  seed,
  onPrepare,
  onBack,
  persistenceEnabled,
}: {
  seed?: PurchaseSeed;
  onPrepare?: (seed: PurchaseSeed) => void;
  onBack?: () => void;
  persistenceEnabled: boolean;
}) {
  const samplePeru = new URLSearchParams(window.location.search).get("example") === "pe";
  const { request: exampleRequest, offers: exampleOffers } =
    comparisonExamples[samplePeru ? "pe" : "us"];
  const [request, setRequest] = useState<ProcurementRequest>({
    ...(seed?.request ?? exampleRequest),
  });
  const [quantity, setQuantity] = useState(
    seed?.resumeComparison
      ? String(seed.request.quantity || "")
      : seed
        ? ""
        : String(exampleRequest.quantity),
  );
  const [offers, setOffers] = useState<SupplierOffer[]>(() =>
    (seed?.offers ?? exampleOffers).map((offer) => ({ ...offer })),
  );
  const [sources, setSources] = useState(
    () => seed?.sources ?? initialSources(exampleOffers),
  );
  const [modal, setModal] = useState<"new" | "reset" | "help" | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savedId, setSavedId] = useState<SavedComparison["id"] | null>(
    (seed?.resumeComparison?.id as SavedComparison["id"]) ?? null,
  );
  const [savedRevision, setSavedRevision] = useState(
    seed?.resumeComparison?.revision ?? 0,
  );
  const [sourcingCaseId, setSourcingCaseId] = useState(seed?.sourcingCaseId);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(() =>
    seed?.resumeComparison?.unchanged ? comparisonStateFingerprint({ request: seed.request, offers: seed.offers, sources: seed.sources, selectedOfferId: seed.resumeComparison.selectedOfferId ?? null }) : null,
  );
  const savedComparisons = useRef<SavedComparisonsHandle>(null);
  const [savingAvailable, setSavingAvailable] = useState(false);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const currentClientId = useRef(clientId);
  const [baselineRequest, setBaselineRequest] = useState<ProcurementRequest>(
    () => ({ ...(seed?.request ?? exampleRequest) }),
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(seed?.resumeComparison?.selectedOfferId ?? null);
  const [selectionFingerprint, setSelectionFingerprint] = useState<
    string | null
  >(seed?.resumeComparison?.selectedOfferId ? JSON.stringify({ request: seed.request, offers: seed.offers }) : null);
  const [decisionState, setDecisionState] = useState<AdvisorDecisionState>({
    context: defaultAdvisorContext,
    invalid: false,
  });
  const [resolved, setResolved] = useState<{
    preview: FreightDecisionPreview;
    fingerprint: string;
    contextKey: string;
    clientId: string;
  } | null>(null);
  const effectiveRequest = {
    ...request,
    quantity: parseDecimal(quantity) ?? NaN,
  };
  const validQuantity =
    Number.isFinite(effectiveRequest.quantity) && effectiveRequest.quantity > 0;
  const { evaluations, groups } = compareProcurement(effectiveRequest, offers);
  const summaries = groups.map((group) => {
    const members = evaluations.filter((result) =>
      group.offerIds.includes(result.offerId),
    );
    return {
      currency: group.currency,
      difference:
        Math.max(...members.map((result) => result.totalCents!)) -
        group.lowestTotalCents,
      lowest: offers.filter((offer) =>
        group.lowestTotalOfferIds.includes(offer.id),
      ),
      count: members.length,
    };
  });
  const source = sourceId ? sources[sourceId] : null;
  const editingOffer = offers.find((offer) => offer.id === editing);
  const unit = unitName(request.unit);
  const hasReviewedSources = offers.some(
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
        (entry.extraction === undefined ||
          entry.webReview !== undefined ||
          entry.documentReview !== undefined ||
          entry.replyReview !== undefined) &&
        entry.label !== "Manual entry" &&
        offer.supplier === entry.original.supplier &&
        offer.ingredient === entry.original.ingredient &&
        offer.specification === entry.original.specification
      );
    });
  const pendingQuantity = quantity.trim() === "";
  const persistable = persistableScenario && (pendingQuantity || validQuantity);
  const blockedReason = !persistableScenario
    ? "Saving supports sample offers and quotes linked to reviewed sources. Manually added offers remain in this tab."
    : !pendingQuantity && !validQuantity
      ? "Correct the quantity before saving, or leave it blank if unknown."
      : null;
  const comparisonDraft = {
    sourcingCaseId,
    clientId,
    id: savedId,
    expectedRevision: savedRevision,
    request: {
      ...request,
      quantity: parseDecimal(quantity) ?? 0,
    },
    offers,
    sources,
    selectedOfferId: activeSelection,
    persistable,
    blockedReason,
  };
  const currentFingerprint = comparisonStateFingerprint({
    request: comparisonDraft.request,
    offers,
    sources,
    selectedOfferId: activeSelection,
  });
  const currentFingerprintRef = useRef(currentFingerprint);
  currentFingerprintRef.current = currentFingerprint;
  const comparisonCurrent =
    savedId !== null && savedFingerprint === currentFingerprint;

  function chooseOffer(offerId: string) {
    const evaluation =
      evaluations[offers.findIndex((offer) => offer.id === offerId)];
    if (!evaluation?.eligibleForComparison) return;
    setSelectedOfferId(offerId);
    setSelectionFingerprint(fingerprint);
    setMessage("Offer selected for this comparison. No purchase was recorded.");
  }

  function openSaved(comparison: SavedComparison) {
    setSourcingCaseId(undefined);
    const nextClientId = crypto.randomUUID();
    currentClientId.current = nextClientId;
    setClientId(nextClientId);
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
    setSavedFingerprint(
      comparisonStateFingerprint({
        request: comparison.request,
        offers: comparison.offers,
        sources: comparison.sources,
        selectedOfferId: comparison.selectedOfferId,
      }),
    );
    setSelectedOfferId(comparison.selectedOfferId);
    setSelectionFingerprint(
      JSON.stringify({
        request: comparison.request,
        offers: comparison.offers,
      }),
    );
    setMessage("Comparison opened. It replaced the draft in this view.");
    window.scrollTo(0, 0);
  }

  function reset() {
    setSourcingCaseId(seed?.sourcingCaseId);
    setRequest({ ...(seed?.request ?? exampleRequest) });
    setQuantity(
      seed?.resumeComparison
        ? String(seed.request.quantity)
        : seed
          ? ""
          : String(exampleRequest.quantity),
    );
    setOffers((seed?.offers ?? exampleOffers).map((offer) => ({ ...offer })));
    setSources(seed?.sources ?? initialSources(exampleOffers));
    setSavedId(
      (seed?.resumeComparison?.id as Id<"comparisons"> | undefined) ?? null,
    );
    setSavedRevision(
      seed?.resumeComparison
        ? savedId === seed.resumeComparison.id
          ? savedRevision
          : seed.resumeComparison.revision
        : 0,
    );
    setSavedFingerprint(null);
    const nextClientId = crypto.randomUUID();
    currentClientId.current = nextClientId;
    setClientId(nextClientId);
    setBaselineRequest({ ...(seed?.request ?? exampleRequest) });
    setSelectedOfferId(null);
    setSelectionFingerprint(null);
    setModal(null);
    setMessage(seed ? "Initial selection restored." : "Example restored.");
  }
  async function saveComparisonForAdvisor() {
    const startedWith = currentFingerprintRef.current;
    const result = await savedComparisons.current?.persist();
    if (
      !result ||
      result.submitted.clientId !== currentClientId.current ||
      currentFingerprintRef.current !== startedWith
    )
      return null;
    return { id: result.saved.id, revision: result.saved.revision };
  }
  function confirmFreightAnswer(offerId: string, cents: number) {
    if (decisionState.invalid) return;
    const preview = previewFreightDecision(
      effectiveRequest, offers, decisionState.context, offerId, cents,
    );
    saveOffer(preview.updatedOffer);
    setResolved({
      preview,
      fingerprint: JSON.stringify({
        request: effectiveRequest,
        offers: preview.updatedOffers,
      }),
      contextKey: stableValue(decisionState),
      clientId,
    });
    setMessage(
      "Delivery confirmed. The decision was recalculated. No purchase was placed.",
    );
    requestAnimationFrame(() =>
      document.getElementById("resolved-condition")?.focus(),
    );
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
            label: "Manual entry",
            date: today(),
            original: { ...offer },
            edited: false,
          },
    }));
    setEditing(null);
    setModal(null);
    setMessage("Offer updated in this view.");
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
        ? "The first offer now has an unknown pack size."
        : "The first offer now has unconfirmed delivery.",
    );
  }

  return (
    <>
      <a href="#comparison-main" className="skip-link">
        Skip to comparison
      </a>
      <header className="topbar">
        <Brand />
        <Button variant="text" aria-label="How to compare" onClick={() => setModal("help")}>
          <CircleHelp size={18} />
          <span>How to compare</span>
        </Button>
      </header>
      <main id="comparison-main" className="comparison-main" tabIndex={-1}>
        <div className="workspace-nav">
          <div className="workspace-nav-start">
            {onBack && (
              <Button variant="text" onClick={onBack}>
                <ArrowLeft size={16} />
                Back to market study
              </Button>
            )}
            <span className="demo-badge">
              {hasReviewedSources
                ? "Reviewed sources"
                : seed
                  ? "From your sample study"
                  : "Synthetic example"}
            </span>
          </div>
          <ol className="workflow-steps" aria-label="Progress">
            <li aria-current={validQuantity ? undefined : "step"}>
              1. Quantity
            </li>
            <li aria-current={!validQuantity || activeSelection ? undefined : "step"}>
              2. Terms
            </li>
            <li aria-current={activeSelection ? "step" : undefined}>3. Choice</li>
          </ol>
        </div>
        <div className="page-title">
          <div>
            <h1 tabIndex={-1}>Compare before you buy</h1>
            <p>
              Enter a quantity and confirm the terms to calculate the order.
            </p>
          </div>
        </div>
        <div className="comparison-setup">
          <section
            className="request-panel"
            aria-label="What you need"
          >
            <div className="request-title">
              <Package size={21} />
              <h2>What do you need to buy?</h2>
            </div>
            <div className="request-fields">
              <label className="field ingredient">
                <span>Ingredient</span>
                <input
                  value={request.ingredient}
                  onChange={(e) =>
                    setRequest({ ...request, ingredient: e.target.value })
                  }
                  maxLength={120}
                />
              </label>
              <label className="field specification">
                <span>Specification / quality</span>
                <input
                  value={request.specification}
                  onChange={(e) =>
                    setRequest({ ...request, specification: e.target.value })
                  }
                  maxLength={160}
                />
              </label>
              <label className="field quantity">
                <span>Required quantity</span>
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
                <span>Unit</span>
                <Select
                  aria-label="Unit"
                  value={request.unit}
                  onValueChange={(unit) =>
                    setRequest({ ...request, unit: unit as BaseUnit })
                  }
                  options={[
                    { value: "kg", label: "kg" },
                    { value: "lb", label: "lb" },
                    { value: "L", label: "L" },
                    { value: "unit", label: "units" },
                  ]}
                />
              </label>
            </div>
            {!validQuantity ? (
              <p className="field-error" id="quantity-error">
                Enter a quantity greater than zero, with up to 3 decimals and no thousands separator.
              </p>
            ) : (
              <p className="field-hint" id="quantity-help">
                We calculate whole packs to cover your needs. You can use a decimal point or comma.
              </p>
            )}
          </section>

          <aside
            className="comparison-save"
            aria-label="Save and open comparisons"
          >
            {persistenceEnabled ? (
              <SavedComparisons
                ref={savedComparisons}
                onAvailabilityChange={setSavingAvailable}
                draft={comparisonDraft}
                onOpen={openSaved}
                onSaved={(saved, submittedClientId, submitted) => {
                  // Update only persistence metadata: edits made while the request was
                  // in flight remain the visible draft.
                  if (submittedClientId !== currentClientId.current)
                    return false;
                  setSavedId(saved.id);
                  setSavedRevision(saved.revision);
                  setSavedFingerprint(
                    comparisonStateFingerprint({
                      request: submitted.request,
                      offers: submitted.offers,
                      sources: submitted.sources,
                      selectedOfferId: submitted.selectedOfferId,
                    }),
                  );
                  return true;
                }}
              />
            ) : (
              <p className="notice info">
                Saving is unavailable. You can use this example during your visit.
              </p>
            )}
            <button
              className="button text-button"
              onClick={() => setModal("reset")}
            >
              <RotateCcw size={16} />
              {seed ? "Restore selection" : "Restore example"}
            </button>
          </aside>
        </div>
        <section
          id="comparison"
          tabIndex={-1}
          aria-labelledby="comparison-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="comparison-title">Compare offers on equal terms</h2>
              <p>
                {offers.length}{" "}
                {offers.length === 1
                  ? "offer to review"
                  : "offers to review"}{" "}
                {hasReviewedSources
                  ? "· Reviewed source; terms to confirm"
                  : "· Sample prices, not live quotes"}
              </p>
            </div>
            <button
              className="button primary"
              disabled={offers.length >= 4}
              onClick={() => setModal("new")}
            >
              <Plus size={18} />
              Add offer
            </button>
          </div>
          {offers.length === 0 ? (
            <div className="empty-state">
              <Package size={36} />
              <h3>Start with an offer</h3>
              <p>
                Add what you know. You can fill in the remaining details later.
              </p>
              <button
                className="button primary"
                onClick={() => setModal("new")}
              >
                <Plus size={18} />
                Add first offer
              </button>
            </div>
          ) : (
            <>
              <div
                className="comparison-summary"
                aria-live="polite"
                aria-atomic="true"
              >
                {summaries.length > 0 ? (
                  <>
                    <span className="summary-icon">
                      <Scale size={22} />
                    </span>
                    {summaries.map(
                      ({ currency, difference, lowest, count }) => (
                        <div key={currency}>
                          <h3>
                            {difference === 0
                              ? "These offers have the same order total"
                              : `${lowest.map((offer) => offer.supplier).join(" and ")} requires ${money(difference, currency)} less${count > 2 ? " than the highest order total" : ""}`}
                          </h3>
                          <p>
                            For {numberLabel(effectiveRequest.quantity)} {unit}
                            . Includes delivery and final amounts. Also check the quantity received. Comparing {count} complete offers in {currency}.
                          </p>
                        </div>
                      ),
                    )}
                  </>
                ) : (
                  <>
                    <span className="summary-icon pending">
                      <Info size={22} />
                    </span>
                    <div>
                      <h3>
                        {offers.length === 1
                          ? "One offer is a good start"
                          : "No complete comparison yet"}
                      </h3>
                      <p>
                        {offers.length === 1
                          ? "Add another offer for the same ingredient and quality to compare."
                          : "Review missing details, specifications and currency for each offer."}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div
                className="mobile-totals"
                aria-label="Order totals"
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
                      className={`offer${activeSelection === offer.id ? " is-chosen" : ""}`}
                      key={offer.id}
                      aria-label={`Offer from ${offer.supplier}`}
                    >
                      <div className="offer-heading">
                        <div className="supplier-avatar">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div>
                          <h3>{offer.supplier}</h3>
                          <p>
                            {offer.packageContent === null
                              ? "Pack size to confirm"
                              : `${numberLabel(offer.packageContent)} ${unitName(offer.packageUnit ?? "")} per pack`}
                          </p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${offer.supplier}`}
                          onClick={() => setEditing(offer.id)}
                        >
                          <Pencil size={17} />
                        </button>
                      </div>
                      <div className="offer-total">
                        <span>Order total</span>
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
                            ? "Terms confirmed"
                            : "Details or terms are missing"}
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
                          ? "Selected offer"
                          : "Choose offer"}
                      </button>
                      <dl className="offer-details">
                        <div>
                          <dt>You would receive</dt>
                          <dd>
                            {numberLabel(result.purchasedQuantity)}
                            {result.purchasedQuantity !== null
                              ? ` ${unit}`
                              : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Quantity beyond your needs</dt>
                          <dd>
                            {numberLabel(result.excessQuantity)}
                            {result.excessQuantity !== null ? ` ${unit}` : ""}
                          </dd>
                        </div>
                        <div className="detail-separator">
                          <dt>
                            Price per {unit}
                            <small>Excluding delivery</small>
                          </dt>
                          <dd>
                            {money(result.unitPriceCents, offer.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Packs to order</dt>
                          <dd>{numberLabel(result.packageCount)}</dd>
                        </div>
                        <div>
                          <dt>
                            Goods
                            <small>
                              {money(offer.priceCents, offer.currency)} per pack
                            </small>
                          </dt>
                          <dd>{money(result.subtotalCents, offer.currency)}</dd>
                        </div>
                        <div>
                          <dt>Delivery per order</dt>
                          <dd>
                            {offer.freightCents === 0
                              ? "Included"
                              : money(offer.freightCents, offer.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Supplier minimum</dt>
                          <dd>
                            {offer.minimumPackages === null
                              ? "Pending"
                              : `${offer.minimumPackages} ${offer.minimumPackages === 1 ? "pack" : "packs"}`}
                          </dd>
                        </div>
                        <div>
                          <dt>Tax</dt>
                          <dd>
                            {offer.taxStatus === "included"
                              ? "Included"
                              : offer.taxStatus === "excluded"
                                ? "Not included"
                                : "To confirm"}
                          </dd>
                        </div>
                        <div>
                          <dt>Delivery when needed</dt>
                          <dd>
                            {offer.deliveryConfirmed
                              ? "Confirmed"
                              : "To confirm"}
                          </dd>
                        </div>
                      </dl>
                      {issues.length > 0 && (
                        <div className="offer-issues">
                          <strong>
                            <Info size={16} />
                            Review this offer
                          </strong>
                          <details>
                            <summary>{issues.length} conditions to review</summary>
                            <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
                          </details>
                          <button
                            className="button text-button"
                            onClick={() => setEditing(offer.id)}
                          >
                            Complete details <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                      <div className="offer-source">
                        <div>
                          <FileText size={16} />
                          <span>
                            {sourceInfo?.label ?? "Manual entry"}
                            <small>
                              {sourceInfo ? displayDate(sourceInfo.date) : ""}
                              {sourceInfo?.edited
                                ? " · Edited manually"
                                : ""}
                            </small>
                          </span>
                        </div>
                        <button
                          className="button text-button"
                          onClick={() => setSourceId(offer.id)}
                        >
                          View source
                        </button>
                      </div>
                      <button
                        className="remove-offer"
                        onClick={() => setDeleting(offer.id)}
                      >
                        <Trash2 size={14} />
                        Remove offer
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="comparison-footnote">
                <Info size={16} />
                Excess is the extra quantity you would receive, not a calculated loss. This comparison does not place an order.
              </p>
            </>
          )}
        </section>
        <MissingConditionInsight
          key={`${currentFingerprint}:${stableValue(decisionState)}`}
          request={effectiveRequest}
          offers={offers}
          decisionState={decisionState}
          onConfirm={confirmFreightAnswer}
          onEdit={setEditing}
        />
        {resolved && resolved.clientId === clientId && resolved.fingerprint === fingerprint && resolved.contextKey === stableValue(decisionState) && (
          <ResolvedCondition
            key={resolved.fingerprint}
            preview={resolved.preview}
            saved={comparisonCurrent}
            canSave={
              persistenceEnabled && savingAvailable && persistable && validQuantity
            }
            saveUnavailableReason={
              !persistenceEnabled
                ? "Saving is unavailable. You can use this example during your visit."
                : !savingAvailable
                  ? "Saving is unavailable. Allow site storage and check your connection; keep this view open."
                  : blockedReason
            }
            onSave={saveComparisonForAdvisor}
          />
        )}
        {persistenceEnabled && (
          <PurchasingAdvisor
            key={clientId}
            onDecisionContext={setDecisionState}
            comparisonId={savedId}
            revision={savedRevision}
            request={effectiveRequest}
            offers={offers}
            comparisonFingerprint={currentFingerprint}
            comparisonCurrent={comparisonCurrent}
            canSaveComparison={persistable && validQuantity}
            saveBlockedReason={
              !validQuantity
                ? "Enter a valid quantity to analyze this purchase."
                : blockedReason
            }
            onSaveComparison={saveComparisonForAdvisor}
          />
        )}

        <section className="try-panel" aria-label="Explore missing details">
          <div>
            <h2>What if a detail is missing?</h2>
            <p>
              See how the comparison changes when an offer is incomplete.
            </p>
          </div>
          <div className="try-actions">
            <button
              className="button secondary"
              disabled={!offers.length}
              onClick={() => missingExample("weight")}
            >
              <Package size={16} />
              Missing weight
            </button>
            <button
              className="button secondary"
              disabled={!offers.length}
              onClick={() => missingExample("freight")}
            >
              <Truck size={16} />
              Missing delivery
            </button>
          </div>
        </section>
        {persistenceEnabled && (
          <QuotationMail
            comparisonId={savedId}
            deliveryComparison={savedId ? { id: savedId, revision: savedRevision, request: effectiveRequest, offers, sources, selectedOfferId: activeSelection, updatedAt: 0 } : undefined}
            deliveryContext={decisionState.context}
            deliveryBlocked={!comparisonCurrent || decisionState.invalid}
            onDeliveryApplied={(comparison) => {
              if (currentClientId.current !== clientId || currentFingerprintRef.current !== currentFingerprint) {
                setMessage("The confirmed term was saved to the previous comparison. Your current draft is preserved.");
                return;
              }
              openSaved(comparison);
            }}
            offers={offers}
            onEditOffer={setEditing}
            onPrepare={onPrepare}
            comparisonLabel={`${request.ingredient} · ${request.specification} · ${request.unit}`}
            onAddReply={
              savedId
                ? (incoming) => {
                    const merged = mergeReplyOffer(
                      { request: effectiveRequest, offers, sources },
                      incoming,
                      true,
                    );
                    setOffers(merged.offers);
                    setSources(merged.sources);
                    setSelectedOfferId(null);
                    setSelectionFingerprint(null);
                    setMessage(
                      "Offer added. Save the comparison and choose again once its terms are complete.",
                    );
                  }
                : undefined
            }
          />
        )}
        <footer>
          <span>
            {hasReviewedSources
              ? "Save the comparison to keep these corrections and terms."
              : "Sample data · Save the comparison to return to it."}
          </span>
          <span>No recipes or purchase history required.</span>
        </footer>
        <p role="status" className="sr-only">
          {message}
        </p>
      </main>
      {(modal === "new" || editingOffer) && (
        <OfferEditor
          offer={editingOffer}
          defaultCurrency={offers[0]?.currency ?? "USD"}
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
            seed ? "Restore the initial selection?" : "Restore this example?"
          }
          onClose={() => setModal(null)}
        >
          <p>
            {seed
              ? "This restores your selected catalog prices without a quantity or confirmed terms."
              : "This replaces the offers and quantity in this view with the original rice example."}
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Keep changes
            </button>
            <button className="button primary" onClick={reset}>
              {seed ? "Restore selection" : "Restore example"}
            </button>
          </div>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="Three questions for every comparison"
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            <p>
              <strong>How much would you pay today?</strong> The order total includes whole packs and delivery. Missing tax or terms keep the total pending.
            </p>
            <p>
              <strong>How much would you receive?</strong> We respect whole packs and supplier minimums, even when you need less.
            </p>
            <p>
              <strong>Are these equivalent offers?</strong> Compare the same ingredient, quality and currency. Unit price alone does not determine the best purchase.
            </p>
          </div>
          <button className="button primary" onClick={() => setModal(null)}>
            Got it
          </button>
        </Dialog>
      )}
      {source && (
        <Dialog title="Offer source" onClose={() => setSourceId(null)}>
          <div className="source-document">
            <div className="source-document-head">
              <FileText size={28} />
              <span>{source.marketSource ? source.original.ingredient : source.label}</span>
            </div>
            <h3>{source.original.supplier}</h3>
            <p>{displayDate(source.date)}</p>
            <dl className="offer-details">
              <div>
                <dt>Ingredient</dt>
                <dd>{source.original.ingredient}</dd>
              </div>
              <div>
                <dt>Specification</dt>
                <dd>{source.original.specification}</dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Content when confirmed"
                    : "Original content"}
                </dt>
                <dd>
                  {numberLabel(source.original.packageContent)}{" "}
                  {unitName(source.original.packageUnit ?? "")}
                </dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Price when confirmed"
                    : "Original price"}
                </dt>
                <dd>
                  {money(source.original.priceCents, source.original.currency)}
                </dd>
              </div>
              <div>
                <dt>
                  {source.extraction
                    ? "Delivery when confirmed"
                    : "Original delivery"}
                </dt>
                <dd>
                  {money(
                    source.original.freightCents,
                    source.original.currency,
                  )}
                </dd>
              </div>
            </dl>
            <p className="field-hint">{source.marketSource?.simulated ? (source.extraction ? "Reviewed synthetic document" : "Synthetic example") : (source.extraction ? "Reviewed source" : "Source record")}</p>
            <SourceEvidence title={source.marketSource?.title ?? source.label} text={source.marketSource?.evidence} extraction={source.extraction} />
          </div>
          {source.marketSource?.url && (
            <a
              href={source.marketSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button text-button"
            >
              {source.documentReview
                ? "Open original document"
                : "Open original source"}
            </a>
          )}
          <p className="muted">
            {source.edited
              ? "The comparison uses your edits. The original values are preserved here."
              : source.marketSource?.simulated === false
                ? "Values reviewed against this source. Confirm missing terms before deciding."
                : "Sample data for exploring this comparison, not a real supplier document."}
          </p>
        </Dialog>
      )}
      {deleting && (
        <Dialog title="Remove this offer?" onClose={() => setDeleting(null)}>
          <p>
            Remove {offers.find((offer) => offer.id === deleting)?.supplier}{" "}
            from this comparison.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              onClick={() => {
                setOffers((current) =>
                  current.filter((offer) => offer.id !== deleting),
                );
                setDeleting(null);
                setMessage("Offer removed.");
              }}
            >
              Remove offer
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

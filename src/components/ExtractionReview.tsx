import { SourceEvidence } from "./SourceEvidence";
import { useEffect, useState, type ReactNode } from "react";
import { FileSearch, PencilLine } from "lucide-react";
import {
  draftValues,
  extractionFields,
  extractionToPurchase,
  type ExtractedOffer,
  type ExtractionField,
  type ExtractionSource,
  type ReviewedValues,
} from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
import { Dialog } from "./Dialog";
import Select from "./ui/Select";
import "../styles/extraction.css";

const fieldCopy: Record<
  ExtractionField,
  { label: string; kind: "text" | "select"; options?: [string, string][] }
> = {
  supplier: { label: "Supplier", kind: "text" },
  ingredient: { label: "Ingredient", kind: "text" },
  specification: { label: "Specification", kind: "text" },
  packageContent: { label: "Package size", kind: "text" },
  packageUnit: {
    label: "Package unit",
    kind: "select",
    options: [
      ["", "Pending"],
      ["kg", "kg"],
      ["g", "g"],
      ["lb", "lb"],
      ["oz", "oz"],
      ["L", "L"],
      ["ml", "ml"],
      ["unit", "unit"],
    ],
  },
  price: { label: "Price per package", kind: "text" },
  currency: {
    label: "Currency",
    kind: "select",
    options: [
      ["", "Pending"],
      ["PEN", "PEN · Peruvian soles"],
      ["USD", "USD · US dollars"],
    ],
  },
};

export default function ExtractionReview({
  source = extractionSource,
  proposal = extractionExample,
  triggerLabel = "Review sample quote",
  onPrepare,
  confirmLabel = "Continue to comparison",
  confirmationNote = "Continuing prepares a comparison. It does not record a purchase or save the document.",
  originalPreview,
  sourceTextLabel = "Original text",
}: {
  confirmationNote?: string;
  originalPreview?: ReactNode;
  sourceTextLabel?: string;
  source?: ExtractionSource;
  proposal?: ExtractedOffer;
  triggerLabel?: string;
  onPrepare: (seed: PurchaseSeed) => void;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ReviewedValues>(() =>
    draftValues(proposal),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const proposalKey = JSON.stringify(proposal);
  useEffect(() => {
    setValues(draftValues(proposal));
    setConfirmed(false);
    setError("");
  }, [source.id, proposalKey]);

  const setField = (field: ExtractionField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setConfirmed(false);
    setError("");
  };

  const requiredReady =
    values.supplier.trim() !== "" &&
    values.ingredient.trim() !== "" &&
    values.specification.trim() !== "" &&
    values.packageUnit !== "" &&
    values.currency !== "";

  function continueToComparison() {
    try {
      const seed = extractionToPurchase(source, proposal, values, confirmed);
      onPrepare(seed);
      setOpen(false);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Review the extracted data.",
      );
    }
  }

  return (
    <section className="extraction-entry" aria-label="Quote review">
      <button className="button secondary" onClick={() => setOpen(true)}>
        <FileSearch size={17} />
        {triggerLabel}
      </button>

      {open && (
        <Dialog title="Review quote data" wide onClose={() => setOpen(false)}>
          <div className="extraction-intro">
            <span className="extraction-simulation">
              {source.simulated ? "Synthetic example" : "Source for review"}
            </span>
            <p>
              {source.simulated
                ? "The source content is synthetic. Review the proposal and confirm the data before continuing."
                : "Compare each proposal with the source text before using it."}
            </p>
          </div>

          <div className="extraction-layout">
            <article className="extraction-source" aria-label={sourceTextLabel}>
              <div>
                <h3>{sourceTextLabel}</h3>
                <p>{source.title}</p>
              </div>
              {originalPreview}
              <SourceEvidence text={source.text} />
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  Open source page
                </a>
              )}
              <time dateTime={source.observedAt}>
                Observed on{" "}
                {new Intl.DateTimeFormat("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  ...(/^\d{4}-\d{2}-\d{2}$/.test(source.observedAt)
                    ? { timeZone: "UTC" }
                    : {}),
                }).format(new Date(source.observedAt))}
              </time>
            </article>

            <div className="extraction-review-fields">
              <div className="extraction-section-heading">
                <h3>Fields to review</h3>
                <p>Missing data remains pending.</p>
              </div>
              {extractionFields.map((field) => {
                const copy = fieldCopy[field];
                const original = proposal[field].value ?? "";
                const edited = values[field] !== original;
                return (
                  <div
                    className={`extraction-field${edited ? " is-edited" : ""}`}
                    key={field}
                  >
                    <label className="field">
                      <span>{copy.label}</span>
                      {copy.kind === "select" ? (
                        <Select
                          aria-label={copy.label}
                          options={
                            copy.options?.map(([value, label]) => ({
                              value,
                              label,
                            })) ?? []
                          }
                          value={values[field]}
                          onValueChange={(value) => setField(field, value)}
                        />
                      ) : (
                        <input
                          value={values[field]}
                          onChange={(event) =>
                            setField(field, event.target.value)
                          }
                          maxLength={
                            field === "price" || field === "packageContent"
                              ? 24
                              : 120
                          }
                          inputMode={
                            field === "price" || field === "packageContent"
                              ? "decimal"
                              : "text"
                          }
                          placeholder={
                            field === "price" || field === "packageContent"
                              ? "Pending"
                              : undefined
                          }
                        />
                      )}
                    </label>
                    <div className="extraction-evidence">
                      <details>
                        <summary>Source evidence</summary>
                        {edited && (
                          <p>
                            Original proposal:{" "}
                            <strong>{original || "Pending"}</strong>
                          </p>
                        )}
                        <p>
                          {proposal[field].evidence ??
                            "No published evidence for this field."}
                        </p>
                      </details>
                      {edited && (
                        <span className="extraction-edited">
                          <PencilLine size={13} /> Manually corrected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="extraction-pending">
            <strong>Additional terms pending</strong>
            <p>
              This extraction does not confirm minimum order, delivery cost, or
              tax status. Review them separately in the comparison.
            </p>
          </div>

          <label className="checkbox extraction-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setError("");
              }}
            />
            I reviewed the source and confirm the data, including my corrections
          </label>
          <p className="extraction-boundary">{confirmationNote}</p>

          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions extraction-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              Close
            </button>
            <button
              className="button primary"
              disabled={!confirmed || !requiredReady}
              onClick={continueToComparison}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

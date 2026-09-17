import {
  extractionFields,
  type ExtractedOffer,
  type ReviewedValues,
} from "../domain/extraction";
import "../styles/source-evidence.css";

const labels = {
  supplier: "Supplier",
  ingredient: "Ingredient",
  specification: "Specification",
  packageContent: "Package size",
  packageUnit: "Unit",
  price: "Price",
  currency: "Currency",
};

/** Keep the original record intact; disclose it after the customer-facing facts. */
export function SourceEvidence({
  text,
  title,
  extraction,
}: {
  text?: string;
  title?: string;
  extraction?: { proposed: ExtractedOffer; reviewed: ReviewedValues };
}) {
  const edits = extraction
    ? extractionFields.filter(
        (key) =>
          extraction.reviewed[key] !== (extraction.proposed[key].value ?? ""),
      ).length
    : 0;
  return (
    <div className="source-record">
      {extraction && (
        <details>
          <summary>
            Evidence and corrections
            {edits
              ? ` · ${edits} edited ${edits === 1 ? "field" : "fields"}`
              : ""}
          </summary>
          {title && <p className="field-hint">{title}</p>}
          <dl className="source-record-fields">
            {extractionFields.map((key) => (
              <div key={key}>
                <dt>{labels[key]}</dt>
                <dd>
                  <strong>{extraction.reviewed[key] || "Pending"}</strong>
                  {extraction.reviewed[key] !==
                    (extraction.proposed[key].value ?? "") && (
                    <p className="source-record-edit">
                      Original proposal:{" "}
                      {extraction.proposed[key].value || "Pending"}. Manually
                      corrected.
                    </p>
                  )}
                  {extraction.proposed[key].evidence ? (
                    <blockquote>{extraction.proposed[key].evidence}</blockquote>
                  ) : (
                    <p>No published evidence for this field.</p>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {text && (
        <details>
          <summary>Full captured text</summary>
          <p className="field-hint">
            Original capture, including site navigation and unrelated content.
          </p>
          <pre>{text}</pre>
        </details>
      )}
    </div>
  );
}

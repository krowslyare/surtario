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
  supplier: { label: "Proveedor", kind: "text" },
  ingredient: { label: "Insumo", kind: "text" },
  specification: { label: "Especificación", kind: "text" },
  packageContent: { label: "Contenido por presentación", kind: "text" },
  packageUnit: {
    label: "Unidad de la presentación",
    kind: "select",
    options: [
      ["", "Pendiente"],
      ["kg", "kg"],
      ["g", "g"],
      ["L", "L"],
      ["ml", "ml"],
      ["unit", "unidad"],
    ],
  },
  price: { label: "Precio por presentación", kind: "text" },
  currency: {
    label: "Moneda",
    kind: "select",
    options: [
      ["", "Pendiente"],
      ["PEN", "PEN · soles"],
      ["USD", "USD · dólares"],
    ],
  },
};

export default function ExtractionReview({
  source = extractionSource,
  proposal = extractionExample,
  triggerLabel = "Revisar ejemplo de cotización",
  onPrepare,
  confirmLabel = "Continuar a comparación",
  confirmationNote = "Continuar prepara una comparación. No registra una compra ni guarda el documento.",
  originalPreview,
  sourceTextLabel = "Texto original",
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
        cause instanceof Error ? cause.message : "Revisa los datos extraídos.",
      );
    }
  }

  return (
    <section className="extraction-entry" aria-label="Revisión de cotización">
      <button className="button secondary" onClick={() => setOpen(true)}>
        <FileSearch size={17} />
        {triggerLabel}
      </button>

      {open && (
        <Dialog
          title="Revisar datos de la cotización"
          wide
          onClose={() => setOpen(false)}
        >
          <div className="extraction-intro">
            <span className="extraction-simulation">
              {source.simulated ? "Ejemplo sintético" : "Fuente para revisión"}
            </span>
            <p>
              {source.simulated
                ? "El contenido de origen es ficticio. Revisa la propuesta y confirma los datos antes de continuar."
                : "Compara cada propuesta con el texto recuperado de la fuente antes de usarla."}
            </p>
          </div>

          <div className="extraction-layout">
            <article className="extraction-source" aria-label={sourceTextLabel}>
              <div>
                <h3>{sourceTextLabel}</h3>
                <p>{source.title}</p>
              </div>
              {originalPreview}
              <pre>{source.text}</pre>
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  Abrir página de origen
                </a>
              )}
              <time dateTime={source.observedAt}>
                Observado el{" "}
                {new Intl.DateTimeFormat("es-PE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(source.observedAt))}
              </time>
            </article>

            <div className="extraction-review-fields">
              <div className="extraction-section-heading">
                <h3>Campos para revisar</h3>
                <p>Los datos ausentes permanecen pendientes.</p>
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
                              ? "Pendiente"
                              : undefined
                          }
                        />
                      )}
                    </label>
                    <div className="extraction-evidence">
                      <span>
                        Original: <strong>{original || "Pendiente"}</strong>
                      </span>
                      <span>
                        Evidencia: {proposal[field].evidence ?? "No encontrada"}
                      </span>
                      {edited && (
                        <span className="extraction-edited">
                          <PencilLine size={13} /> Corregido manualmente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="extraction-pending">
            <strong>Condiciones adicionales pendientes</strong>
            <p>
              Esta extracción no confirma pedido mínimo, costo de entrega ni
              condición tributaria. Se revisarán por separado en la comparación.
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
            Revisé el origen y confirmo los datos, incluidas mis correcciones
          </label>
          <p className="extraction-boundary">{confirmationNote}</p>

          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions extraction-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              Cerrar
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

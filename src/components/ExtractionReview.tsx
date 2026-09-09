import { useState, type ChangeEvent } from "react";
import { FileSearch, PencilLine } from "lucide-react";
import {
  draftValues,
  extractionFields,
  extractionToPurchase,
  type ExtractionField,
  type ReviewedValues,
} from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import { extractionExample, extractionSource } from "../../fixtures/extraction";
import { Dialog } from "./Dialog";
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
  onPrepare,
}: {
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ReviewedValues>(() =>
    draftValues(extractionExample),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const setField =
    (field: ExtractionField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
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
      const seed = extractionToPurchase(
        extractionSource,
        extractionExample,
        values,
        confirmed,
      );
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
        Revisar ejemplo de cotización
      </button>

      {open && (
        <Dialog
          title="Revisar datos de la cotización"
          wide
          onClose={() => setOpen(false)}
        >
          <div className="extraction-intro">
            <span className="extraction-simulation">Ejemplo sintético</span>
            <p>
              Esta revisión simula un resultado ya extraído. No hace una llamada
              de IA ni sube un documento.
            </p>
          </div>

          <div className="extraction-layout">
            <article className="extraction-source" aria-label="Texto original">
              <div>
                <h3>Texto original</h3>
                <p>{extractionSource.title}</p>
              </div>
              <pre>{extractionSource.text}</pre>
              <time dateTime={extractionSource.observedAt}>
                Ejemplo fechado el 8 sep 2026
              </time>
            </article>

            <div className="extraction-review-fields">
              <div className="extraction-section-heading">
                <h3>Campos para revisar</h3>
                <p>Los datos ausentes permanecen pendientes.</p>
              </div>
              {extractionFields.map((field) => {
                const copy = fieldCopy[field];
                const original = extractionExample[field].value ?? "";
                const edited = values[field] !== original;
                return (
                  <div
                    className={`extraction-field${edited ? " is-edited" : ""}`}
                    key={field}
                  >
                    <label className="field">
                      <span>{copy.label}</span>
                      {copy.kind === "select" ? (
                        <select
                          value={values[field]}
                          onChange={setField(field)}
                        >
                          {copy.options?.map(([value, label]) => (
                            <option value={value} key={value || "pending"}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={values[field]}
                          onChange={setField(field)}
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
                        Evidencia:{" "}
                        {extractionExample[field].evidence ?? "No encontrada"}
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
              El documento no indica pedido mínimo, costo de entrega ni
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
          <p className="extraction-boundary">
            Continuar prepara una comparación. No registra una compra ni guarda
            el documento.
          </p>

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
              Continuar a comparación
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}

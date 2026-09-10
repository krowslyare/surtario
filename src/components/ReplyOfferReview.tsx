import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { draftValues, extractionFields } from "../domain/extraction";
import {
  canAutoApplyReplySuggestion,
  emptyReplyProposal,
  prepareReplyOffer,
} from "../domain/replyReview";
import type { ExtractedOffer, ReviewedValues } from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import { Dialog } from "./Dialog";
const labels = {
  supplier: "Proveedor",
  ingredient: "Insumo",
  specification: "Especificación",
  packageContent: "Contenido por presentación",
  packageUnit: "Unidad de la presentación",
  price: "Precio por presentación",
  currency: "Moneda",
};
export default function ReplyOfferReview({
  reply,
  onClose,
  onPrepare,
  onAdd,
  comparisonLabel,
  token,
  aiEnabled,
}: {
  reply: {
    requestId: Id<"quotationRequests">;
    messageId: string;
    text: string;
    receivedAt: string;
    simulated: boolean;
    extraction: typeof emptyReplyProposal | null;
    extractionStatus: "idle" | "running" | "complete" | "failed";
    extractionError: string | null;
    extractionAttempts: number;
    extractionAttempt: number | null;
  };
  token: string;
  aiEnabled: boolean;
  onClose: () => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onAdd?: (seed: PurchaseSeed) => void;
  comparisonLabel?: string;
}) {
  const initialAttempt =
    reply.extractionStatus === "complete" && reply.extraction
      ? (reply.extractionAttempt ?? undefined)
      : undefined;
  const initialProposal = initialAttempt
    ? reply.extraction!
    : emptyReplyProposal;
  const extractReply = useAction(api.quotationMail.extractReply);
  const [appliedProposal, setAppliedProposal] = useState(initialProposal);
  const [appliedAttempt, setAppliedAttempt] = useState<number | undefined>(
    initialAttempt,
  );
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    proposal: ExtractedOffer;
    attempt: number;
  } | null>(null);
  const [status, setStatus] = useState(reply.extractionStatus);
  const [attempts, setAttempts] = useState(reply.extractionAttempts);
  const [values, setValues] = useState(() => draftValues(initialProposal));
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const editGeneration = useRef(0);
  const [equivalent, setEquivalent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(reply.extractionError ?? "");
  function updateValue(key: keyof ReviewedValues, value: string) {
    const next = { ...valuesRef.current, [key]: value };
    valuesRef.current = next;
    editGeneration.current += 1;
    setValues(next);
    setConfirmed(false);
    setEquivalent(false);
  }
  function applySuggestion(suggestion: {
    proposal: ExtractedOffer;
    attempt: number;
  }) {
    const next = draftValues(suggestion.proposal);
    valuesRef.current = next;
    editGeneration.current += 1;
    setValues(next);
    setAppliedProposal(suggestion.proposal);
    setAppliedAttempt(suggestion.attempt);
    setPendingSuggestion(null);
    setConfirmed(false);
    setEquivalent(false);
  }
  async function suggest() {
    if (
      !aiEnabled ||
      extracting ||
      status === "running" ||
      status === "complete"
    )
      return;
    const startedEditGeneration = editGeneration.current;
    setExtracting(true);
    setStatus("running");
    setError("");
    try {
      const result = await extractReply({
        token,
        requestId: reply.requestId,
        messageId: reply.messageId,
      });
      setStatus(result.extractionStatus);
      setAttempts(result.extractionAttempts);
      setError(result.extractionError ?? "");
      if (result.extraction && result.extractionAttempt !== null) {
        const suggestion = {
          proposal: result.extraction,
          attempt: result.extractionAttempt,
        };
        if (
          canAutoApplyReplySuggestion(
            startedEditGeneration,
            editGeneration.current,
            valuesRef.current,
          )
        )
          applySuggestion(suggestion);
        else setPendingSuggestion(suggestion);
      }
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "No se confirmó la extracción. Conserva la revisión manual y no repitas si el estado sigue en curso.",
      );
    } finally {
      setExtracting(false);
    }
  }
  const displayedProposal =
    pendingSuggestion?.proposal ??
    (appliedAttempt !== undefined ? appliedProposal : null);
  return (
    <Dialog title="Preparar oferta desde respuesta" wide onClose={onClose}>
      <p>
        Revisa una sola oferta del correo. La IA solo propone campos con
        evidencia literal; tú confirmas o corriges cada dato. Si falta precio o
        contenido, déjalo pendiente. Revisión manual siempre disponible.
      </p>
      <pre className="quotation-text">{reply.text}</pre>
      {status !== "complete" && (
        <button
          className="button secondary"
          disabled={
            !aiEnabled || extracting || status === "running" || attempts >= 2
          }
          onClick={() => void suggest()}
        >
          {extracting || status === "running"
            ? "Extracción en curso…"
            : attempts > 0
              ? "Volver a intentar con IA"
              : "Sugerir campos con IA"}
        </button>
      )}
      {!aiEnabled && status !== "complete" && (
        <p className="notice info">
          Extracción de respuestas no configurada. Puedes completar todos los
          campos manualmente.
        </p>
      )}
      {status === "complete" && (
        <p className="notice info" role="status">
          {pendingSuggestion
            ? "La sugerencia está lista. Tus ediciones se conservaron; aplícala solo si quieres reemplazarlas."
            : "Sugerencia aplicada. Comprueba cada campo contra el correo antes de confirmar."}
        </p>
      )}
      {pendingSuggestion && (
        <button
          className="button secondary"
          onClick={() => applySuggestion(pendingSuggestion)}
        >
          Aplicar sugerencia de IA
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="extraction-review-fields">
        {extractionFields.map((key) => (
          <label className="field" key={key}>
            {labels[key]}
            {key === "currency" || key === "packageUnit" ? (
              <select
                aria-label={labels[key]}
                value={values[key]}
                onChange={(e) => {
                  updateValue(key, e.target.value);
                }}
              >
                <option value="">Pendiente</option>
                {(key === "currency"
                  ? ["PEN", "USD"]
                  : ["kg", "g", "L", "ml", "unit"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={labels[key]}
                maxLength={120}
                value={values[key]}
                onChange={(e) => {
                  updateValue(key, e.target.value);
                }}
              />
            )}
            {displayedProposal && (
              <small>
                Propuesta original de IA: «
                {displayedProposal[key].value ?? "Pendiente"}» · Evidencia
                original: «{displayedProposal[key].evidence ?? "Sin evidencia"}»
              </small>
            )}
            {displayedProposal &&
              values[key] !== (displayedProposal[key].value ?? "") && (
                <small>
                  Corrección manual actual: «{values[key] || "Pendiente"}»
                </small>
              )}
          </label>
        ))}
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Confirmo que estos datos corresponden a una oferta de esta respuesta
      </label>
      <p className="field-hint">
        La opción «Continuar con nueva oferta» abre una comparación nueva sin
        registrar compra. Después podrás completar entrega, impuestos y mínimo y
        guardar la comparación.
      </p>
      {onAdd && (
        <>
          <p>
            Comparación actual: {comparisonLabel}. Las demás ofertas y la
            cantidad se conservarán. Guarda la comparación después de añadir;
            tendrás que elegir de nuevo.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={equivalent}
              onChange={(e) => setEquivalent(e.target.checked)}
            />
            Confirmo equivalencia con el insumo y especificación de la
            comparación actual
          </label>
          <button
            className="button secondary"
            disabled={!confirmed || !equivalent}
            onClick={() => {
              try {
                onAdd(
                  prepareReplyOffer(
                    reply,
                    values,
                    confirmed,
                    appliedProposal,
                    appliedAttempt,
                  ),
                );
                onClose();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Revisa la equivalencia.",
                );
              }
            }}
          >
            Añadir a comparación actual
          </button>
        </>
      )}
      <button
        className="button primary"
        disabled={!confirmed}
        onClick={() => {
          try {
            onPrepare(
              prepareReplyOffer(
                reply,
                values,
                confirmed,
                appliedProposal,
                appliedAttempt,
              ),
            );
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Revisa los campos.",
            );
          }
        }}
      >
        Continuar con nueva oferta
      </button>
    </Dialog>
  );
}

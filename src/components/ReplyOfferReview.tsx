import { useState } from "react";
import { draftValues, extractionFields } from "../domain/extraction";
import { emptyReplyProposal, prepareReplyOffer } from "../domain/replyReview";
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
}: {
  reply: {
    requestId: string;
    messageId: string;
    text: string;
    receivedAt: string;
    simulated: boolean;
  };
  onClose: () => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onAdd?: (seed: PurchaseSeed) => void;
  comparisonLabel?: string;
}) {
  const [values, setValues] = useState(() => draftValues(emptyReplyProposal));
  const [equivalent, setEquivalent] = useState(false);
  const [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title="Preparar oferta desde respuesta" wide onClose={onClose}>
      <p>
        Revisión manual: transcribe una sola oferta del correo. No se extraen ni
        completan datos automáticamente. Si falta precio o contenido, déjalo
        pendiente.
      </p>
      <pre className="quotation-text">{reply.text}</pre>
      <div className="extraction-review-fields">
        {extractionFields.map((key) => (
          <label className="field" key={key}>
            {labels[key]}
            {key === "currency" || key === "packageUnit" ? (
              <select
                aria-label={labels[key]}
                value={values[key]}
                onChange={(e) => {
                  setValues({ ...values, [key]: e.target.value });
                  setConfirmed(false);
                  setEquivalent(false);
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
                maxLength={120}
                value={values[key]}
                onChange={(e) => {
                  setValues({ ...values, [key]: e.target.value });
                  setConfirmed(false);
                  setEquivalent(false);
                }}
              />
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
                onAdd(prepareReplyOffer(reply, values, confirmed));
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
      {error && <p role="alert">{error}</p>}
      <button
        className="button primary"
        disabled={!confirmed}
        onClick={() => {
          try {
            onPrepare(prepareReplyOffer(reply, values, confirmed));
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

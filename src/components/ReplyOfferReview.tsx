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
}: {
  reply: {
    requestId: string;
    messageId: string;
    text: string;
    receivedAt: string;
  };
  onClose: () => void;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [values, setValues] = useState(() => draftValues(emptyReplyProposal));
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
        Abre una comparación nueva. No reemplaza la anterior ni registra compra.
        Después podrás completar entrega, impuestos y mínimo y guardar la
        comparación.
      </p>
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

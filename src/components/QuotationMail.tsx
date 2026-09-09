import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { savedQuotationValidator } from "../../convex/quotationValidators";
import { Dialog } from "./Dialog";

type Quotation = Infer<typeof savedQuotationValidator>;
const labels = {
  draft: "Borrador",
  sending: "Envío en curso",
  sent: "Aceptado por AgentMail",
  uncertain: "Envío sin confirmar",
  failed: "Envío fallido",
};
function message(error: unknown) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "No se confirmó la operación. Conserva el borrador y revisa la conexión.";
}
export default function QuotationMail(props: {
  comparisonId: Id<"comparisons"> | null;
  studyId?: Id<"studies">;
  prospectId?: Id<"webProspects">;
  resultId?: string;
  offers: { id: string; supplier: string }[];
  onEditOffer: (id: string) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("procurement-demo-session-v1");
      if (stored && /^[a-f0-9]{64}$/.test(stored)) setToken(stored);
    } catch {
      /* Storage remains unavailable; no sending without a session. */
    }
  }, []);
  if (!token)
    return (
      <p className="field-hint">
        Guarda la comparación para preparar una solicitud de cotización.
      </p>
    );
  return (
    <Boundary>
      <Connected {...props} token={token} />
    </Boundary>
  );
}
function Connected({
  token,
  comparisonId,
  studyId,
  prospectId,
  resultId,
  offers,
  onEditOffer,
}: {
  token: string;
  comparisonId: Id<"comparisons"> | null;
  studyId?: Id<"studies">;
  prospectId?: Id<"webProspects">;
  resultId?: string;
  offers: { id: string; supplier: string }[];
  onEditOffer: (id: string) => void;
}) {
  const status = useQuery(api.quotationMail.status, {});
  const requests = useQuery(api.quotationMail.list, { token });
  const create = useMutation(api.quotationMail.create);
  const send = useAction(api.quotationMail.send);
  const [activeId, setActiveId] = useState<Quotation["id"] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [local, setLocal] = useState<Quotation | null>(null);
  const creation = useRef<{ comparisonId: string | null; clientId: string }>({
    comparisonId: null,
    clientId: crypto.randomUUID(),
  });
  const targetKey =
    prospectId ?? (studyId ? `${studyId}:${resultId}` : comparisonId);
  const matches = (item: Quotation) =>
    prospectId
      ? item.prospectId === prospectId
      : studyId
        ? item.studyId === studyId && item.resultId === resultId
        : item.comparisonId === comparisonId;
  const own = requests?.filter(matches);
  const persisted = own?.find((item) => item.id === activeId);
  const localActive = local?.id === activeId && matches(local) ? local : null;
  const active =
    localActive && (!persisted || localActive.revision > persisted.revision)
      ? localActive
      : (persisted ?? localActive);
  useEffect(() => {
    setActiveId(null);
    setLocal(null);
    setConfirmed(false);
    setError("");
  }, [targetKey]);
  async function prepare() {
    if (!targetKey || busy) return;
    if (creation.current.comparisonId !== targetKey)
      creation.current = {
        comparisonId: targetKey,
        clientId: crypto.randomUUID(),
      };
    setBusy(true);
    setError("");
    try {
      const draft = await create({
        token,
        ...(prospectId
          ? { prospectId }
          : studyId
            ? { studyId, resultId }
            : { comparisonId: comparisonId! }),
        clientId: creation.current.clientId,
      });
      setLocal(draft);
      setActiveId(draft.id);
      setConfirmed(false);
      creation.current = { comparisonId: null, clientId: crypto.randomUUID() };
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  async function sendReviewed() {
    if (!active || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await send({
        token,
        id: active.id,
        expectedRevision: active.revision,
        confirmed: true,
      });
      setLocal(updated);
      setConfirmed(false);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="saved-studies" aria-label="Cotizaciones por correo">
      <h2>Consultar condiciones por correo</h2>
      <p className="field-hint">
        {prospectId
          ? "Consulta basada en un candidato web guardado. El contacto anotado no es el destinatario: el envío solo usa el buzón de prueba configurado."
          : studyId
            ? "Consulta de catálogo basada en el estudio guardado. No exige cantidad ni precio. El destinatario será el buzón de prueba, no el contacto del distribuidor."
            : "La solicitud usa la versión guardada de esta comparación. Guarda primero los cambios que quieras incluir."}
      </p>
      {status === undefined && (
        <p className="field-hint">Comprobando disponibilidad del correo…</p>
      )}
      {status && !status.enabled && (
        <p className="notice info">
          Correo de prueba no habilitado. Puedes preparar y copiar el mensaje;
          no se enviará.
        </p>
      )}
      <button
        className="button secondary"
        disabled={!targetKey || busy}
        onClick={prepare}
      >
        Preparar solicitud de prueba
      </button>
      {!targetKey && (
        <p className="field-hint">Primero guarda la comparación.</p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {own?.map((item) => (
        <div className="saved-study-row" key={item.id}>
          <span>
            {item.subject} · {labels[item.state]}
          </span>
          <button
            className="button text-button"
            disabled={busy}
            onClick={() => {
              setActiveId(item.id);
              setConfirmed(false);
              setNotice("");
            }}
          >
            Ver solicitud
          </button>
        </div>
      ))}
      {active && (
        <Dialog
          title="Revisar solicitud de cotización"
          onClose={() => {
            setActiveId(null);
            setConfirmed(false);
          }}
        >
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <p>
            <strong>Destinatario de prueba:</strong>{" "}
            {active.recipient ??
              "Sin configurar; crea otra solicitud cuando esté configurado."}
          </p>
          <p>
            <strong>{active.subject}</strong>
          </p>
          <pre className="quotation-text">{active.text}</pre>
          <p role="status">
            {labels[active.state]}.{" "}
            {active.state === "sent"
              ? "La aceptación no confirma entrega ni respuesta."
              : "No se realiza ninguna compra."}
          </p>
          {active.failure && <p className="notice error">{active.failure}</p>}
          {(active.state === "sending" || active.state === "uncertain") && (
            <p>
              Si el envío quedó interrumpido, requiere revisión del operador. No
              crees otro para repetirlo sin comprobar el resultado.
            </p>
          )}
          {active.state === "draft" && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Revisé el destinatario y el texto y autorizo este envío de prueba
            </label>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(active.text);
                  setNotice("Texto copiado. No se envió ningún mensaje.");
                } catch {
                  setNotice("Selecciona el texto y cópialo manualmente.");
                }
              }}
            >
              Copiar para WhatsApp
            </button>
            <button
              className="button primary"
              disabled={
                !status?.enabled ||
                !active.recipient ||
                active.state !== "draft" ||
                !confirmed ||
                busy
              }
              onClick={sendReviewed}
            >
              Enviar solicitud de prueba
            </button>
          </div>
          {notice && <p role="status">{notice}</p>}
          <h3>Respuestas vinculadas</h3>
          {active.replies.length === 0 ? (
            <p>Todavía no hay respuestas vinculadas.</p>
          ) : (
            active.replies.map((reply) => (
              <div key={reply.messageId}>
                <pre className="quotation-text">{reply.text}</pre>
                <p>
                  Revisa la respuesta antes de modificar precios o condiciones.
                </p>
                {offers.map((offer) => (
                  <button
                    className="button text-button"
                    key={offer.id}
                    onClick={() => {
                      setActiveId(null);
                      onEditOffer(offer.id);
                    }}
                  >
                    Editar condiciones de {offer.supplier}
                  </button>
                ))}
              </div>
            ))
          )}
        </Dialog>
      )}
    </section>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="notice error">
        El correo no está disponible. La comparación sigue accesible.
      </p>
    ) : (
      this.props.children
    );
  }
}

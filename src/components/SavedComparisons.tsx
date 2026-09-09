import { Component, useEffect, useState, type ReactNode } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { savedComparisonValidator } from "../../convex/comparisonValidators";
import type { ComparisonSource } from "../domain/market";
import type { ProcurementRequest, SupplierOffer } from "../domain/procurement";

export type SavedComparison = Infer<typeof savedComparisonValidator>;
export type ComparisonDraft = {
  clientId: string;
  id: Id<"comparisons"> | null;
  expectedRevision: number;
  request: ProcurementRequest;
  offers: SupplierOffer[];
  sources: Record<string, ComparisonSource>;
  selectedOfferId: string | null;
  persistable: boolean;
  blockedReason: string | null;
};

const SESSION_KEY = "procurement-demo-session-v1";

export default function SavedComparisons(props: {
  draft: ComparisonDraft;
  onOpen: (comparison: SavedComparison) => void;
  onSaved: (comparison: SavedComparison, clientId: string) => boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      let stored = localStorage.getItem(SESSION_KEY);
      if (!stored || !/^[a-f0-9]{64}$/.test(stored)) {
        stored = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        localStorage.setItem(SESSION_KEY, stored);
      }
      setToken(stored);
    } catch {
      setStorageError(true);
    }
  }, []);
  if (!token)
    return (
      <p className="notice info">
        {storageError
          ? "El navegador no permite conservar esta sesión. Puedes comparar, pero guardar requiere habilitar el almacenamiento del sitio."
          : "Preparando la sesión de ejemplo…"}
      </p>
    );
  return (
    <StorageBoundary>
      <ConnectedComparisons {...props} token={token} />
    </StorageBoundary>
  );
}

function ConnectedComparisons({
  token,
  draft,
  onOpen,
  onSaved,
}: {
  token: string;
  draft: ComparisonDraft;
  onOpen: (comparison: SavedComparison) => void;
  onSaved: (comparison: SavedComparison, clientId: string) => boolean;
}) {
  const comparisons = useQuery(api.comparisons.list, { token });
  const save = useMutation(api.comparisons.save);
  const connection = useConvexConnectionState();
  const [online, setOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setMessage("");
    setError("");
  }, [draft.clientId]);
  const connected = online && connection.isWebSocketConnected;

  async function persist() {
    if (saving || !connected || !draft.persistable) return;
    setSaving(true);
    setError("");
    setMessage("");
    const submitted = draft;
    try {
      const saved = await save({
        token,
        clientId: submitted.clientId,
        id: submitted.id,
        expectedRevision: submitted.expectedRevision,
        request: submitted.request,
        offers: submitted.offers,
        selectedOfferId: submitted.selectedOfferId,
        ...(!submitted.id &&
        submitted.offers.length === 1 &&
        submitted.sources[submitted.offers[0].id]?.documentReview
          ? {
              documentReview: {
                ...submitted.sources[submitted.offers[0].id].documentReview!,
                runId: submitted.sources[submitted.offers[0].id].documentReview!
                  .runId as Id<"documentRuns">,
              },
            }
          : {}),
        ...(!submitted.id &&
        submitted.offers.some((offer) => submitted.sources[offer.id]?.webReview)
          ? {
              webReviews: submitted.offers.map((offer) => {
                const review = submitted.sources[offer.id].webReview!;
                return { ...review, runId: review.runId as Id<"researchRuns"> };
              }),
            }
          : {}),
      });
      const stillCurrent = onSaved(saved, submitted.clientId);
      setMessage(
        stillCurrent
          ? `Comparación guardada${saved.selectedOfferId ? " con una oferta elegida" : ""}. Los cambios posteriores requieren guardar de nuevo.`
          : "Se guardó la comparación anterior. El borrador restaurado todavía no está guardado.",
      );
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "No se confirmó el guardado. La comparación sigue aquí; comprueba la conexión y vuelve a intentar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="saved-studies" aria-label="Comparaciones guardadas">
      <div className="saved-study-actions">
        <button
          className="button secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          Comparaciones guardadas {comparisons ? `(${comparisons.length})` : ""}
        </button>
        <button
          className="button primary"
          onClick={persist}
          disabled={!draft.persistable || saving || !connected}
        >
          {saving
            ? "Guardando…"
            : draft.id
              ? "Guardar cambios de la comparación"
              : "Guardar comparación"}
        </button>
      </div>
      <p className="field-hint">
        Comparaciones guardadas para esta sesión. Hasta 10; borrar los datos del
        sitio pierde el acceso. Abrir una reemplaza el borrador actual.
      </p>
      {draft.blockedReason && (
        <p className="notice info">{draft.blockedReason}</p>
      )}
      {!connected && (
        <p role="status">
          Sin conexión al guardado. Puedes seguir comparando; todavía no se han
          confirmado cambios.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {expanded && (
        <div className="saved-study-list">
          {comparisons === undefined ? (
            <p role="status">Cargando comparaciones…</p>
          ) : comparisons.length === 0 ? (
            <p>No tienes comparaciones guardadas en esta sesión.</p>
          ) : (
            comparisons.map((comparison) => (
              <article key={comparison.id} className="saved-study-row">
                <div>
                  <strong>
                    {comparison.request.ingredient} ·{" "}
                    {comparison.request.quantity > 0
                      ? `${comparison.request.quantity} ${comparison.request.unit}`
                      : "cantidad pendiente"}
                  </strong>
                  <p>
                    {comparison.offers.length} ofertas · Revisión{" "}
                    {comparison.revision} ·{" "}
                    {comparison.selectedOfferId
                      ? "oferta elegida"
                      : "sin elección"}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    onOpen(comparison);
                    setExpanded(false);
                    setError("");
                    setMessage(
                      "Comparación recuperada. Reemplazó el borrador de esta vista.",
                    );
                  }}
                >
                  Abrir comparación
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Abrir otra comparación reemplaza esta vista. Guarda primero los
            cambios que quieras conservar.
          </p>
        </div>
      )}
    </section>
  );
}

class StorageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="notice error" role="alert">
          <p>
            No se pudieron cargar las comparaciones. El borrador actual sigue
            disponible; el guardado no está confirmado.
          </p>
          <button
            className="button secondary"
            onClick={() => this.setState({ failed: false })}
          >
            Reintentar guardado
          </button>
        </div>
      );
    return this.props.children;
  }
}

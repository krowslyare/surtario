import { Component, useEffect, useState, type ReactNode } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { savedIngredientListValidator } from "../../convex/ingredientListValidators";
import type { IntakeBatch } from "../intake/model";

export type SavedIngredientList = Infer<typeof savedIngredientListValidator>;

const SESSION_KEY = "procurement-demo-session-v1";

export default function SavedIngredientLists(props: {
  batch: IntakeBatch | null;
  clientId: string;
  savedId: Id<"ingredientLists"> | null;
  onSaved: (id: Id<"ingredientLists">, clientId: string) => boolean;
  onOpen: (list: SavedIngredientList) => void;
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
      <p className="field-hint">
        {storageError
          ? "El navegador no permite conservar esta sesión. La lista sigue disponible en esta pestaña."
          : "Preparando el guardado de listas…"}
      </p>
    );
  return (
    <ListStorageBoundary>
      <ConnectedIngredientLists {...props} token={token} />
    </ListStorageBoundary>
  );
}

function ConnectedIngredientLists({
  token,
  batch,
  clientId,
  savedId,
  onSaved,
  onOpen,
}: {
  token: string;
  batch: IntakeBatch | null;
  clientId: string;
  savedId: Id<"ingredientLists"> | null;
  onSaved: (id: Id<"ingredientLists">, clientId: string) => boolean;
  onOpen: (list: SavedIngredientList) => void;
}) {
  const lists = useQuery(api.ingredientLists.list, { token });
  const save = useMutation(api.ingredientLists.save);
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
  }, [clientId]);
  const connected = online && connection.isWebSocketConnected;
  const persistable =
    batch?.method === "manual" || batch?.method === "spreadsheet";

  async function persist() {
    const sourceKind =
      batch?.method === "manual" || batch?.method === "spreadsheet"
        ? batch.method
        : null;
    if (!batch || !sourceKind || savedId || saving || !connected) return;
    setSaving(true);
    setError("");
    setMessage("");
    const submittedClientId = clientId;
    try {
      const saved = await save({
        token,
        clientId: submittedClientId,
        ingredients: batch.rows.map((row) => row.ingredient),
        sourceKind,
      });
      const stillCurrent = onSaved(saved.id, submittedClientId);
      setMessage(
        stillCurrent
          ? `Lista guardada con ${saved.ingredients.length} insumos revisados.`
          : "Se guardó la lista anterior. La cola actual todavía no está guardada.",
      );
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "No se confirmó el guardado. La lista sigue disponible en esta pestaña.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="saved-ingredient-lists">
      <div className="saved-study-actions">
        <button
          className="button secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          Listas guardadas {lists ? `(${lists.length})` : ""}
        </button>
        <button
          className="button secondary"
          onClick={persist}
          disabled={!persistable || !!savedId || saving || !connected}
        >
          {saving ? "Guardando…" : savedId ? "Lista guardada" : "Guardar lista"}
        </button>
      </div>
      <p className="field-hint">
        Demo pública: guarda solo nombres sintéticos revisados. No se guardan el
        archivo, otras columnas, precios ni filas originales. Las
        transcripciones de foto o PDF permanecen en esta pestaña.
      </p>
      {!connected && (
        <p role="status">Sin conexión al guardado; la lista local no cambió.</p>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {expanded && (
        <div className="saved-study-list">
          {lists === undefined ? (
            <p role="status">Cargando listas…</p>
          ) : lists.length === 0 ? (
            <p>No tienes listas guardadas en esta sesión.</p>
          ) : (
            lists.map((list) => (
              <article key={list.id} className="saved-study-row">
                <div>
                  <strong>{list.ingredients.length} insumos revisados</strong>
                  <p>
                    {list.sourceLabel} ·{" "}
                    {new Date(list.updatedAt).toLocaleString("es-PE")}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    onOpen(list);
                    setExpanded(false);
                    setError("");
                    setMessage("Lista recuperada en la cola local.");
                  }}
                >
                  Abrir lista
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Abrir una lista reemplaza la cola local actual. No inicia compras ni
            crea ofertas.
          </p>
        </div>
      )}
    </div>
  );
}

class ListStorageBoundary extends Component<
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
        <p className="notice error" role="alert">
          No se pudieron cargar las listas guardadas. La cola local sigue
          disponible.
        </p>
      );
    return this.props.children;
  }
}

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
          ? "Your browser cannot keep this session. The list remains available in this tab."
          : "Preparing list storage…"}
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
  const persistable = !!batch;

  async function persist() {
    const sourceKind = batch?.method;
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
        ...(batch.method === "ai" || batch.method === "transcription" ? { rows: batch.rows.map(r => ({ id: r.id, ingredient: r.ingredient, ...(r.documentHash ? { documentHash: r.documentHash } : {}), original: r.original.join(" | ").slice(0, 2000), reference: r.reference ?? `Row ${r.line}`, needsReview: !!r.needsReview })) } : {}),
      });
      const stillCurrent = onSaved(saved.id, submittedClientId);
      setMessage(
        stillCurrent
          ? `List saved with ${saved.ingredients.length} reviewed ingredients.`
          : "The previous list was saved. The current queue is still unsaved.",
      );
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Saving was not confirmed. The list remains available in this tab.",
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
          Saved lists {lists ? `(${lists.length})` : ""}
        </button>
        {batch && <button
          className="button secondary"
          onClick={persist}
          disabled={!persistable || !!savedId || saving || !connected}
        >
          {saving ? "Saving…" : savedId ? "List saved" : "Save list"}
        </button>}
      </div>
      {batch && <p className="field-hint">
        Saved lists keep reviewed ingredient names. Document readings also keep the interpreted source text; original files stay in this tab.
      </p>}
      {!connected && (
        <p role="status">Saving is offline; the local list did not change.</p>
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
            <p role="status">Loading lists…</p>
          ) : lists.length === 0 ? (
            <p>You have no saved lists in this session.</p>
          ) : (
            lists.map((list) => (
              <article key={list.id} className="saved-study-row">
                <div>
                  <strong>
                    {list.ingredients.length} reviewed ingredients
                  </strong>
                  <p>
                    {list.sourceLabel} ·{" "}
                    {new Date(list.updatedAt).toLocaleString("en-US")}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    onOpen(list);
                    setExpanded(false);
                    setError("");
                    setMessage("List opened in the local queue.");
                  }}
                >
                  Open list
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Opening a list replaces the current local queue. It does not start a
            purchase or create offers.
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
          Saved lists could not be loaded. The local queue is still available.
        </p>
      );
    return this.props.children;
  }
}

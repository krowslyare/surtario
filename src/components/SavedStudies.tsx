import { Component, useEffect, useState, type ReactNode } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { savedStudyValidator } from "../../convex/studyValidators";
import { studyOptionCount } from "../domain/study";
import type { WebSelection, StudyProspect } from "../domain/study";
import type { Id } from "../../convex/_generated/dataModel";

export type SavedStudy = Infer<typeof savedStudyValidator>;
export type StudyDraft = {
  clientId: string;
  id: Id<"studies"> | null;
  expectedRevision: number;
  term: string;
  region: string;
  selectedIds: string[];
  webSelections?: WebSelection[];
  prospects?: StudyProspect[];
};
const SESSION_KEY = "procurement-demo-session-v1";

export default function SavedStudies(props: {
  draft: StudyDraft;
  onOpen: (study: SavedStudy) => void;
  onSaved: (study: SavedStudy) => void;
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
          ? "El navegador no permite conservar esta sesión. Puedes explorar, pero guardar requiere habilitar el almacenamiento del sitio."
          : "Preparando la sesión de ejemplo…"}
      </p>
    );
  return (
    <StorageBoundary>
      <ConnectedStudies {...props} token={token} />
    </StorageBoundary>
  );
}
function ConnectedStudies({
  token,
  draft,
  onOpen,
  onSaved,
}: {
  token: string;
  draft: StudyDraft;
  onOpen: (study: SavedStudy) => void;
  onSaved: (study: SavedStudy) => void;
}) {
  const studies = useQuery(api.studies.list, { token });
  const save = useMutation(api.studies.save);
  const connection = useConvexConnectionState();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const connected = online && connection.isWebSocketConnected;
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const count = studyOptionCount(draft);
  const eligible =
    count > 0 &&
    (Boolean(draft.webSelections?.length || draft.prospects?.length) ||
      (["arroz", "abarrotes", "abarrotes secos"].includes(
        draft.term.toLowerCase(),
      ) &&
        draft.region === "Lima"));
  async function persist() {
    if (saving || !connected) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { webSelections, prospects, ...base } = draft;
      const saved = await save({
        token,
        ...base,
        webReviews: (webSelections ?? []).map(({ seed, sourceId }) => {
          const review = seed.sources[sourceId].webReview!;
          return { ...review, runId: review.runId as Id<"researchRuns"> };
        }),
        prospectIds: (prospects ?? []).map((item) => item.id),
      });
      onSaved(saved);
      setMessage(
        `Estudio guardado con ${studyOptionCount(saved)} ${studyOptionCount(saved) === 1 ? "opción" : "opciones"}. Los cambios posteriores requieren guardar de nuevo.`,
      );
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "No se confirmó el guardado. Tu selección sigue aquí; comprueba la conexión y vuelve a intentar.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="saved-studies" aria-label="Estudios guardados">
      <div className="saved-study-actions">
        <button
          className="button secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          Guardados {studies ? `(${studies.length})` : ""}
        </button>
        <button
          className="button primary"
          onClick={persist}
          disabled={!eligible || saving || !connected}
        >
          {saving
            ? "Guardando…"
            : draft.id
              ? "Guardar cambios del estudio"
              : "Guardar estudio"}
        </button>
      </div>
      <p className="field-hint">
        Hasta 10 estudios en este navegador. Guarda antes de salir. Si borras
        los datos del sitio, pierdes el acceso.
      </p>
      {!connected && (
        <p role="status">
          Sin conexión al guardado. Puedes seguir explorando; todavía no se han
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
          {studies === undefined ? (
            <p role="status">Cargando estudios…</p>
          ) : studies.length === 0 ? (
            <p>No tienes estudios guardados en esta sesión.</p>
          ) : (
            studies.map((study) => (
              <article key={study.id} className="saved-study-row">
                <div>
                  <strong>
                    {study.term} en {study.region}
                  </strong>
                  <p>
                    {studyOptionCount(study)}{" "}
                    {studyOptionCount(study) === 1 ? "opción" : "opciones"} ·
                    Revisión {study.revision} ·{" "}
                    {new Date(study.updatedAt).toLocaleString("es-PE")}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    onOpen(study);
                    setExpanded(false);
                    setError("");
                    setMessage(
                      "Estudio recuperado. La selección abierta reemplazó el borrador de esta vista.",
                    );
                  }}
                >
                  Abrir estudio
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Abrir otro estudio reemplaza la selección de esta vista. Guarda
            primero los cambios que quieras conservar.
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
            No se pudieron cargar los estudios. La selección actual sigue
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

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
          ? "Your browser cannot keep this session. You can explore, but saving requires site storage."
          : "Preparing the demo session…"}
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
        `Study saved with ${studyOptionCount(saved)} ${studyOptionCount(saved) === 1 ? "option" : "options"}. Save again after making changes.`,
      );
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Saving was not confirmed. Your selection is still here; check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="saved-studies" aria-label="Saved studies">
      <div className="saved-study-actions">
        <button
          className="button secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          Saved {studies ? `(${studies.length})` : ""}
        </button>
        <button
          className="button primary"
          onClick={persist}
          disabled={!eligible || saving || !connected}
        >
          {saving ? "Saving…" : draft.id ? "Save study changes" : "Save study"}
        </button>
      </div>
      <p className="field-hint">
        Save up to 10 studies in this browser. Save before leaving. Clearing
        site data removes access.
      </p>
      {!connected && (
        <p role="status">
          Saving is offline. You can keep exploring; changes are not confirmed.
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
            <p role="status">Loading studies…</p>
          ) : studies.length === 0 ? (
            <p>You have no saved studies in this session.</p>
          ) : (
            studies.map((study) => (
              <article key={study.id} className="saved-study-row">
                <div>
                  <strong>
                    {study.term} in {study.region}
                  </strong>
                  <p>
                    {studyOptionCount(study)}{" "}
                    {studyOptionCount(study) === 1 ? "option" : "options"} ·
                    Revision {study.revision} ·{" "}
                    {new Date(study.updatedAt).toLocaleString("en-US")}
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
                      "Study opened. Its selection replaced the draft in this view.",
                    );
                  }}
                >
                  Open study
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Opening another study replaces the selection in this view. Save any
            changes you want to keep first.
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
            Saved studies could not be loaded. Your current selection is still
            available; saving is not confirmed.
          </p>
          <button
            className="button secondary"
            onClick={() => this.setState({ failed: false })}
          >
            Retry saving
          </button>
        </div>
      );
    return this.props.children;
  }
}

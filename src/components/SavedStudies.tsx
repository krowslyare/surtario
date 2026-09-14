import { Button } from "./ui/Button";
import { Disclosure } from "./ui/Disclosure";
import { Dialog } from "./Dialog";
import { Bookmark, FolderOpen } from "lucide-react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { savedStudyValidator } from "../../convex/studyValidators";
import type { Id } from "../../convex/_generated/dataModel";
import { studyOptionCount } from "../domain/study";
import type { StudyProspect, WebSelection } from "../domain/study";
import { findMarketExampleContext } from "../../fixtures/market";

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

function draftFingerprint(
  draft: Pick<
    StudyDraft,
    "term" | "region" | "selectedIds" | "webSelections" | "prospects"
  >,
) {
  return JSON.stringify([
    draft.term.trim(),
    draft.region,
    [...draft.selectedIds].sort(),
    (draft.webSelections ?? [])
      .map((item) => [item.sourceId, item.seed] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
    (draft.prospects ?? []).map((item) => item.id).sort(),
  ]);
}

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
  const [messageFingerprint, setMessageFingerprint] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const fingerprint = draftFingerprint(draft);
  const latestDraft = useRef({ clientId: draft.clientId, fingerprint });
  latestDraft.current = { clientId: draft.clientId, fingerprint };
  const saveSequence = useRef(0);
  const [savedDraft, setSavedDraft] = useState(() => ({
    clientId: draft.clientId,
    fingerprint: draft.id ? fingerprint : null,
  }));
  if (savedDraft.clientId !== draft.clientId) {
    saveSequence.current += 1;
    setSavedDraft({
      clientId: draft.clientId,
      fingerprint: draft.id ? fingerprint : null,
    });
    setSaving(false);
    setMessage("");
    setMessageFingerprint(null);
    setError("");
  }
  const count = studyOptionCount(draft);
  const eligible =
    count > 0 &&
    (Boolean(draft.webSelections?.length || draft.prospects?.length) ||
      Boolean(findMarketExampleContext(draft.term, draft.region)));
  async function persist() {
    if (saving || !connected) return;
    const submittedFingerprint = fingerprint;
    const submittedClientId = draft.clientId;
    const operation = ++saveSequence.current;
    const isCurrentDraft = () =>
      saveSequence.current === operation &&
      latestDraft.current.clientId === submittedClientId;
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
      if (!isCurrentDraft()) return;
      onSaved(saved);
      setSavedDraft((current) => ({
        ...current,
        fingerprint: submittedFingerprint,
      }));
      if (latestDraft.current.fingerprint === submittedFingerprint) {
        setMessage(
          `Study saved with ${studyOptionCount(saved)} ${studyOptionCount(saved) === 1 ? "option" : "options"}.`,
        );
        setMessageFingerprint(submittedFingerprint);
      }
    } catch (cause) {
      if (!isCurrentDraft()) return;
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Saving was not confirmed. Your selection is still here; check your connection and try again.",
      );
    } finally {
      if (isCurrentDraft()) setSaving(false);
    }
  }
  const dirty = savedDraft.fingerprint !== fingerprint;
  const status =
    count === 0
      ? "Select at least one option to save."
      : !eligible
        ? "Select an available example or a reviewed web source to save."
        : savedDraft.fingerprint === null
          ? "Not saved"
          : dirty
            ? "Unsaved changes"
            : "Saved";
  const visibleMessage =
    messageFingerprint === fingerprint && message ? message : status;
  return (
    <section className="saved-studies" aria-label="Saved studies">
      <div className="saved-study-actions">
        <Button
          variant="primary"
          onClick={persist}
          disabled={!eligible || !connected}
          busy={saving}
          busyLabel="Saving…"
        >
          <Bookmark size={16} aria-hidden="true" />
          {draft.id ? "Save study changes" : "Save study"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <FolderOpen size={16} aria-hidden="true" /> Saved{" "}
          {studies ? `(${studies.length})` : ""}
        </Button>
      </div>
      <p className="field-hint" role="status">
        {visibleMessage}
      </p>
      <Disclosure title="How saving works">
        <p className="field-hint">
          Up to 10 studies are saved in this browser session. Clearing site data
          removes access.
        </p>
      </Disclosure>
      {!connected && (
        <p role="status">
          Saving is offline. You can keep exploring; changes have not been
          confirmed.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {expanded && (
        <Dialog title="Saved studies" onClose={() => setExpanded(false)}>
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
                      {study.term} en {study.region}
                    </strong>
                    <p>
                      {studyOptionCount(study)}{" "}
                      {studyOptionCount(study) === 1 ? "option" : "options"} ·
                      Revision {study.revision} ·{" "}
                      {new Date(study.updatedAt).toLocaleString("en-US")}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      onOpen(study);
                      setExpanded(false);
                      setError("");
                      setMessage("");
                      setMessageFingerprint(
                        draftFingerprint({
                          term: study.term,
                          region: study.region,
                          selectedIds: study.selectedIds,
                          webSelections: study.webSelections,
                          prospects: study.prospects,
                        }),
                      );
                    }}
                  >
                    Open study
                  </Button>
                </article>
              ))
            )}
            <p className="field-hint">
              Opening another study replaces the selection in this view. Save
              any changes you want to keep first.
            </p>
          </div>
        </Dialog>
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
            Saved studies could not be loaded. Your current selection remains
            available; saving is not confirmed.
          </p>
          <Button
            variant="secondary"
            onClick={() => this.setState({ failed: false })}
          >
            Retry save
          </Button>
        </div>
      );
    return this.props.children;
  }
}

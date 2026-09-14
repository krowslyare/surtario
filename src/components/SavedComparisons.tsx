import {
  Component,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
export type SavedComparisonsHandle = {
  persist: () => Promise<{
    saved: SavedComparison;
    submitted: ComparisonDraft;
  } | null>;
};

const SESSION_KEY = "procurement-demo-session-v1";

export function newestComparison(
  queried: SavedComparison | undefined,
  confirmed: SavedComparison | undefined,
) {
  return !queried || (confirmed && confirmed.revision > queried.revision)
    ? confirmed
    : queried;
}

export function replyReviewsToAppend(
  draft: ComparisonDraft,
  persisted: SavedComparison | undefined,
) {
  if (!draft.id) return [];
  return draft.offers
    .filter(
      (offer) =>
        draft.sources[offer.id]?.replyReview && !persisted?.sources[offer.id],
    )
    .map((offer) => ({
      review: {
        ...draft.sources[offer.id].replyReview!,
        requestId: draft.sources[offer.id].replyReview!
          .requestId as Id<"quotationRequests">,
      },
      equivalent: true as const,
    }));
}

const SavedComparisons = forwardRef<
  SavedComparisonsHandle,
  {
    draft: ComparisonDraft;
    onAvailabilityChange?: (available: boolean) => void;
    onOpen: (comparison: SavedComparison) => void;
    onSaved: (
      comparison: SavedComparison,
      clientId: string,
      submitted: ComparisonDraft,
    ) => boolean;
  }
>(function SavedComparisons(props, ref) {
  const [token, setToken] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const connectedRef = useRef<SavedComparisonsHandle>(null);
  useImperativeHandle(
    ref,
    () => ({
      persist: () => connectedRef.current?.persist() ?? Promise.resolve(null),
    }),
    [],
  );
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
          ? "Your browser cannot keep this session. You can compare, but saving requires site storage."
          : "Preparing the demo session…"}
      </p>
    );
  return (
    <StorageBoundary>
      <ConnectedComparisons {...props} token={token} ref={connectedRef} />
    </StorageBoundary>
  );
});

export default SavedComparisons;

const ConnectedComparisons = forwardRef<
  SavedComparisonsHandle,
  {
    token: string;
    draft: ComparisonDraft;
    onAvailabilityChange?: (available: boolean) => void;
    onOpen: (comparison: SavedComparison) => void;
    onSaved: (
      comparison: SavedComparison,
      clientId: string,
      submitted: ComparisonDraft,
    ) => boolean;
  }
>(function ConnectedComparisons(
  { token, draft, onOpen, onSaved, onAvailabilityChange },
  ref,
) {
  const comparisons = useQuery(api.comparisons.list, { token });
  const save = useMutation(api.comparisons.save);
  const connection = useConvexConnectionState();
  const [online, setOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const confirmed = useRef(new Map<string, SavedComparison>());
  const savingRef = useRef(false);
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
  const available = connected && comparisons !== undefined && !saving;
  useEffect(() => {
    onAvailabilityChange?.(available);
    return () => onAvailabilityChange?.(false);
  }, [available, onAvailabilityChange]);

  const persist = useCallback(async () => {
    if (savingRef.current || !connected || !draft.persistable) return null;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    const submitted = draft;
    const queried = comparisons?.find((item) => item.id === submitted.id);
    const persisted = submitted.id
      ? newestComparison(queried, confirmed.current.get(submitted.id))
      : undefined;
    const newReplies = replyReviewsToAppend(submitted, persisted);
    try {
      const saved = await save({
        token,
        clientId: submitted.clientId,
        id: submitted.id,
        expectedRevision: submitted.expectedRevision,
        request: submitted.request,
        offers: submitted.offers,
        selectedOfferId: newReplies.length ? null : submitted.selectedOfferId,
        ...(newReplies.length ? { appendReplies: newReplies } : {}),
        ...(!submitted.id &&
        submitted.offers.length === 1 &&
        submitted.sources[submitted.offers[0].id]?.replyReview
          ? {
              replyReview: {
                ...submitted.sources[submitted.offers[0].id].replyReview!,
                requestId: submitted.sources[submitted.offers[0].id]
                  .replyReview!.requestId as Id<"quotationRequests">,
              },
            }
          : {}),
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
      confirmed.current.set(saved.id, saved);
      const stillCurrent = onSaved(saved, submitted.clientId, submitted);
      setMessage(
        stillCurrent
          ? `Comparison saved${saved.selectedOfferId ? " with a selected offer" : ""}. Save again after making changes.`
          : "The previous comparison was saved. The restored draft is still unsaved.",
      );
      return { saved, submitted };
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Saving was not confirmed. The comparison is still here; check your connection and try again.",
      );
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [comparisons, connected, draft, onSaved, save, token]);
  useImperativeHandle(ref, () => ({ persist }), [persist]);

  return (
    <section className="saved-studies" aria-label="Saved comparisons">
      <div className="saved-study-actions">
        <button
          className="button secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          Saved comparisons {comparisons ? `(${comparisons.length})` : ""}
        </button>
        <button
          className="button primary"
          onClick={persist}
          disabled={!draft.persistable || saving || !connected}
        >
          {saving
            ? "Saving…"
            : draft.id
              ? "Save comparison changes"
              : "Save comparison"}
        </button>
      </div>
      <p className="field-hint">
        Up to 10 comparisons are saved for this session. Clearing site data
        removes access. Opening one replaces the current draft.
      </p>
      {draft.blockedReason && (
        <p className="notice info">{draft.blockedReason}</p>
      )}
      {!connected && (
        <p role="status">
          Offline while saving. You can keep comparing; changes have not been
          confirmed.
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
            <p role="status">Loading comparisons…</p>
          ) : comparisons.length === 0 ? (
            <p>You have no saved comparisons in this session.</p>
          ) : (
            comparisons.map((comparison) => (
              <article key={comparison.id} className="saved-study-row">
                <div>
                  <strong>
                    {comparison.request.ingredient} ·{" "}
                    {comparison.request.quantity > 0
                      ? `${comparison.request.quantity} ${comparison.request.unit}`
                      : "quantity pending"}
                  </strong>
                  <p>
                    {comparison.offers.length} offers · Revision{" "}
                    {comparison.revision} ·{" "}
                    {comparison.selectedOfferId
                      ? "selected offer"
                      : "no selection"}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={saving}
                  onClick={() => {
                    confirmed.current.set(comparison.id, comparison);
                    onOpen(comparison);
                    setExpanded(false);
                    setError("");
                    setMessage(
                      "Comparison opened. It replaced the draft in this view.",
                    );
                  }}
                >
                  Open comparison
                </button>
              </article>
            ))
          )}
          <p className="field-hint">
            Opening another comparison replaces this view. Save any changes you
            want to keep first.
          </p>
        </div>
      )}
    </section>
  );
});

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
            Saved comparisons could not be loaded. The current draft is still
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

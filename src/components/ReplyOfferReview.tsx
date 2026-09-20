import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { draftValues, extractionFields } from "../domain/extraction";
import {
  emptyReplyProposal,
  prepareReplyOffer,
  reconcileReplyExtraction,
  type ReplyExtractionSnapshot,
} from "../domain/replyReview";
import type { ExtractedOffer, ReviewedValues } from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import { MessageBody } from "./MessageBody";
import "../styles/mail.css";
import { Dialog } from "./Dialog";
const labels = {
  supplier: "Supplier",
  ingredient: "Ingredient",
  specification: "Specification",
  packageContent: "Package size",
  packageUnit: "Package unit",
  price: "Price per package",
  currency: "Currency",
};
export default function ReplyOfferReview({
  reply,
  onClose,
  onComplete,
  onPrepare,
  onAdd,
  comparisonLabel,
  token,
  aiEnabled,
}: {
  reply: {
    requestId: Id<"quotationRequests">;
    messageId: string;
    text: string;
    receivedAt: string;
    simulated: boolean;
    extraction: typeof emptyReplyProposal | null;
    extractionStatus: "idle" | "running" | "complete" | "failed";
    extractionError: string | null;
    extractionAttempts: number;
    extractionAttempt: number | null;
  };
  token: string;
  aiEnabled: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onPrepare: (seed: PurchaseSeed) => void;
  onAdd?: (seed: PurchaseSeed) => void;
  comparisonLabel?: string;
}) {
  const initialAttempt =
    reply.extractionStatus === "complete" && reply.extraction
      ? (reply.extractionAttempt ?? undefined)
      : undefined;
  const initialProposal = initialAttempt
    ? reply.extraction!
    : emptyReplyProposal;
  const extractReply = useAction(api.quotationMail.extractReply);
  const [appliedProposal, setAppliedProposal] = useState(initialProposal);
  const [appliedAttempt, setAppliedAttempt] = useState<number | undefined>(
    initialAttempt,
  );
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    proposal: ExtractedOffer;
    attempt: number;
  } | null>(null);
  const [status, setStatus] = useState(reply.extractionStatus);
  const [attempts, setAttempts] = useState(reply.extractionAttempts);
  const [values, setValues] = useState(() => draftValues(initialProposal));
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const editGeneration = useRef(0);
  const latestExtraction = useRef<ReplyExtractionSnapshot>({
    extraction: reply.extraction,
    extractionStatus: reply.extractionStatus,
    extractionError: reply.extractionError,
    extractionAttempts: reply.extractionAttempts,
    extractionAttempt: reply.extractionAttempt,
  });
  const [equivalent, setEquivalent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(reply.extractionError ?? "");
  function updateValue(key: keyof ReviewedValues, value: string) {
    const next = { ...valuesRef.current, [key]: value };
    valuesRef.current = next;
    editGeneration.current += 1;
    setValues(next);
    setConfirmed(false);
    setEquivalent(false);
  }
  function applySuggestion(suggestion: {
    proposal: ExtractedOffer;
    attempt: number;
  }) {
    const next = draftValues(suggestion.proposal);
    valuesRef.current = next;
    editGeneration.current += 1;
    setValues(next);
    setAppliedProposal(suggestion.proposal);
    setAppliedAttempt(suggestion.attempt);
    setPendingSuggestion(null);
    setConfirmed(false);
    setEquivalent(false);
  }
  function acceptExtraction(incoming: ReplyExtractionSnapshot) {
    const update = reconcileReplyExtraction(
      latestExtraction.current,
      incoming,
      editGeneration.current,
      valuesRef.current,
    );
    if (update.kind === "ignore") return;
    latestExtraction.current = update.snapshot;
    setStatus(update.snapshot.extractionStatus);
    setAttempts(update.snapshot.extractionAttempts);
    setError(update.snapshot.extractionError ?? "");
    if (update.kind === "apply") applySuggestion(update.suggestion);
    if (update.kind === "pending") setPendingSuggestion(update.suggestion);
  }
  useEffect(() => {
    acceptExtraction({
      extraction: reply.extraction,
      extractionStatus: reply.extractionStatus,
      extractionError: reply.extractionError,
      extractionAttempts: reply.extractionAttempts,
      extractionAttempt: reply.extractionAttempt,
    });
  }, [
    reply.extraction,
    reply.extractionAttempt,
    reply.extractionAttempts,
    reply.extractionError,
    reply.extractionStatus,
  ]);
  async function suggest() {
    if (
      !aiEnabled ||
      extracting ||
      status === "running" ||
      status === "complete"
    )
      return;
    setExtracting(true);
    setStatus("running");
    latestExtraction.current = {
      extraction: null,
      extractionStatus: "running",
      extractionError: null,
      extractionAttempts: attempts + 1,
      extractionAttempt: null,
    };
    setError("");
    try {
      const result = await extractReply({
        token,
        requestId: reply.requestId,
        messageId: reply.messageId,
      });
      acceptExtraction(result);
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "Extraction was not confirmed. Keep the manual review and do not retry while the request is still running.",
      );
    } finally {
      setExtracting(false);
    }
  }
  const displayedProposal =
    pendingSuggestion?.proposal ??
    (appliedAttempt !== undefined ? appliedProposal : null);
  return (
    <Dialog title="Prepare offer from reply" wide className="mail-dialog" onClose={onClose}>
      <p>Enter the terms you can verify in this reply. Leave missing details blank.</p>
      <MessageBody text={reply.text} />
      {(aiEnabled || extracting || status === "running") && status !== "complete" && (
        <button
          className="button secondary"
          disabled={
            !aiEnabled || extracting || status === "running" || attempts >= 2
          }
          onClick={() => void suggest()}
        >
          {extracting || status === "running"
            ? "Extracting…"
            : attempts > 0
              ? "Try AI again"
              : "Suggest fields with AI"}
        </button>
      )}
      {!aiEnabled && !extracting && status !== "running" && status !== "complete" && (
        <p className="notice info">
          Enter the offer manually. AI suggestions are unavailable.
        </p>
      )}
      {status === "complete" && (
        <p className="notice info" role="status">
          {pendingSuggestion
            ? "The suggestion is ready. Your edits were preserved; apply it only if you want to replace them."
            : "Suggestion applied. Check each field against the email before confirming."}
        </p>
      )}
      {pendingSuggestion && (
        <button
          className="button secondary"
          onClick={() => applySuggestion(pendingSuggestion)}
        >
          Apply AI suggestion
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="extraction-review-fields">
        {extractionFields.map((key) => (
          <label className="field" key={key}>
            {labels[key]}
            {key === "currency" || key === "packageUnit" ? (
              <select
                aria-label={labels[key]}
                value={values[key]}
                onChange={(e) => {
                  updateValue(key, e.target.value);
                }}
              >
                <option value="">Pending</option>
                {(key === "currency"
                  ? ["PEN", "USD"]
                  : ["kg", "g", "lb", "oz", "L", "ml", "unit"]
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={labels[key]}
                maxLength={120}
                value={values[key]}
                onChange={(e) => {
                  updateValue(key, e.target.value);
                }}
              />
            )}
            {displayedProposal && (
              <small>
                Original AI suggestion: “
                {displayedProposal[key].value ?? "Pending"}” · Original
                evidence: “{displayedProposal[key].evidence ?? "No evidence"}”
              </small>
            )}
            {displayedProposal &&
              values[key] !== (displayedProposal[key].value ?? "") && (
                <small>
                  Current manual correction: “{values[key] || "Pending"}”
                </small>
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
        I confirm these details represent an offer in this reply
      </label>
      <p className="field-hint">
        Next, confirm quantity, delivery and tax. This does not place an order.
      </p>
      {onAdd && (
        <>
          <p>
            Current comparison: {comparisonLabel}. The other offers and quantity
            will remain. Save the comparison after adding this offer; you will
            need to select an offer again.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={equivalent}
              onChange={(e) => setEquivalent(e.target.checked)}
            />
            I confirm it matches the ingredient and specification in the current
            comparison
          </label>
          <button
            className="button secondary"
            disabled={!confirmed || !equivalent}
            onClick={() => {
              try {
                onAdd(
                  prepareReplyOffer(
                    reply,
                    values,
                    confirmed,
                    appliedProposal,
                    appliedAttempt,
                  ),
                );
                (onComplete ?? onClose)();
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Review the match.",
                );
              }
            }}
          >
            Add to current comparison
          </button>
        </>
      )}
      <button
        className="button primary"
        disabled={!confirmed}
        onClick={() => {
          try {
            onPrepare(
              prepareReplyOffer(
                reply,
                values,
                confirmed,
                appliedProposal,
                appliedAttempt,
              ),
            );
            (onComplete ?? onClose)();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Review the fields.",
            );
          }
        }}
      >
        Continue with new offer
      </button>
    </Dialog>
  );
}

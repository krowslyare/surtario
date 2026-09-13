import { useState } from "react";
import { ArrowRight, Check, Copy, MessageSquare } from "lucide-react";
import {
  resolveMissingConditions,
  previewFreightDecision,
  type FreightDecisionPreview,
} from "../domain/missingResolution";
import type { ProcurementRequest, SupplierOffer } from "../domain/procurement";
import type { AdvisorDecisionState } from "./PurchasingAdvisor";
import { money, parseCents } from "../numbers";
import { Button } from "./ui/Button";
import { Dialog } from "./Dialog";

function DecisionTransition({
  preview,
  hypothetical = false,
}: {
  preview: FreightDecisionPreview;
  hypothetical?: boolean;
}) {
  return (
    <div
      className="decision-transition"
      aria-label={hypothetical ? "Possible decision change" : "Decision change"}
    >
      <div>
        <h3>Before the answer</h3>
        <p>{preview.before.recommendation}</p>
      </div>
      <ArrowRight aria-hidden="true" size={22} />
      <div>
        <h3>{hypothetical ? "If confirmed" : "With the confirmed answer"}</h3>
        <p>{preview.after.recommendation}</p>
      </div>
    </div>
  );
}

export function ResolvedCondition({
  preview,
  saved,
  canSave,
  saveUnavailableReason,
  onSave,
}: {
  preview: FreightDecisionPreview;
  saved: boolean;
  canSave: boolean;
  saveUnavailableReason: string | null;
  onSave: () => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <section
      className="resolved-condition"
      aria-label="Answer and decision"
      tabIndex={-1}
      id="resolved-condition"
    >
      <div className="missing-insight-heading">
        <Check size={22} aria-hidden="true" />
        <h2>
          {preview.decisionChanged
            ? "Your answer changed the next step"
            : "Answer confirmed. Recommendation unchanged."}
        </h2>
      </div>
      <p className="field-hint">{preview.finding.supplier}</p>
      <ol className="resolution-chain">
        <li>
          <span>Finding</span>
          <strong>Delivery cost was missing</strong>
        </li>
        <li>
          <span>Question</span>
          <strong>Confirm final delivery cost</strong>
        </li>
        <li>
          <span>Your confirmed answer</span>
          <strong>
            {money(preview.freightCents, preview.finding.currency)}
          </strong>
        </li>
      </ol>
      <DecisionTransition preview={preview} />
      <p>
        <strong>
          Updated order: {money(preview.totalCents, preview.finding.currency)}.
        </strong>{" "}
        {preview.differenceCents === 0
          ? "Matches the previous complete benchmark."
          : `${money(Math.abs(preview.differenceCents), preview.finding.currency)} ${preview.differenceCents < 0 ? "below" : "above"} the previous complete benchmark.`}
      </p>
      <p className="field-hint">{preview.after.warning}</p>
      <details>
        <summary>Review the question behind this change</summary>
        <p>{preview.finding.questionDraft}</p>
        <p className="field-hint">
          Confirmed by you in this view. The original source remains unchanged.
        </p>
      </details>
      <div className="resolution-actions">
        <Button
          variant="primary"
          disabled={saved || saving || !canSave}
          onClick={async () => {
            setSaving(true);
            setError("");
            try {
              if (!(await onSave()))
                setError(
                  "Saving was not confirmed. Keep this view open and retry when saving is available.",
                );
            } catch {
              setError(
                "Saving was not confirmed. Keep this view open and retry when saving is available.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saved
            ? "Confirmed terms saved"
            : saving
              ? "Saving…"
              : "Save updated comparison"}
        </Button>
        <p className="field-hint">
          {saved
            ? "The delivery amount is saved with this comparison."
            : "The delivery amount is updated in this view."}{" "}
          Confirming an answer does not select an offer or place an order.
        </p>
      </div>
      {!canSave && !saved && !saving && (
        <p className="field-hint">{saveUnavailableReason}</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default function MissingConditionInsight({
  request,
  offers,
  decisionState,
  onConfirm,
  onEdit,
}: {
  request: ProcurementRequest;
  offers: SupplierOffer[];
  decisionState: AdvisorDecisionState;
  onConfirm: (id: string, freightCents: number) => void;
  onEdit: (id: string) => void;
}) {
  const resolutions = resolveMissingConditions(request, offers);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [freight, setFreight] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");
  // The parent keys this component by the comparison and decision context.
  const question = resolutions.find((item) => item.offerId === questionId);
  let preview: FreightDecisionPreview | null = null;
  let amountError = "";
  if (question && freight.trim()) {
    const cents = parseCents(freight);
    if (cents === null || !Number.isSafeInteger(cents) || cents < 0) {
      amountError = "Enter a non-negative amount with at most two decimals.";
    } else {
      try {
        preview = previewFreightDecision(
          request,
          offers,
          decisionState.context,
          question.offerId,
          cents,
        );
      } catch {
        amountError =
          "Enter a valid final delivery amount within the supported range.";
      }
    }
  }
  if (!resolutions.length) return null;
  return (
    <section className="missing-insight" aria-label="Resolve missing terms">
      <div className="missing-insight-heading">
        <MessageSquare size={22} aria-hidden="true" />
        <h2>One question could change your decision</h2>
      </div>
      {resolutions.map((item) => (
        <div key={item.offerId} className="missing-insight-row">
          <div>
            <h3>{item.supplier}</h3>
            <p>
              {item.outcome === "can-match" ? (
                <>
                  Delivery must be{" "}
                  <strong>
                    {money(item.maxFreightCents, item.currency)} or less
                  </strong>{" "}
                  to match the lowest complete order total.
                </>
              ) : (
                <>
                  Its goods already cost{" "}
                  <strong>
                    {money(-item.maxFreightCents, item.currency)} more
                  </strong>{" "}
                  than the lowest complete order. Free delivery alone would not
                  close the gap.
                </>
              )}
            </p>
            <p className="field-hint">
              A calculated boundary, not a shipping quote. The offer stays
              pending until its terms are confirmed.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setQuestionId(item.offerId);
              setFreight("");
              setConfirmed(false);
              setCopyStatus("");
              setError("");
            }}
          >
            Prepare supplier question{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      ))}
      {question && (
        <Dialog
          title="Resolve the delivery cost"
          onClose={() => setQuestionId(null)}
        >
          <p className="resolution-question">{question.questionDraft}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(question.questionDraft);
                setCopyStatus("Question copied. No message was sent.");
              } catch {
                setCopyStatus(
                  "Copy is unavailable. Select and copy the question above.",
                );
              }
            }}
          >
            <Copy size={16} aria-hidden="true" />
            Copy question
          </Button>
          <p role="status" className="field-hint">
            {copyStatus}
          </p>
          <label className="field">
            <span>Try a delivery amount ({question.currency})</span>
            <input
              inputMode="decimal"
              value={freight}
              onChange={(event) => {
                setFreight(event.target.value);
                setConfirmed(false);
                setError("");
              }}
              placeholder="Hypothetical amount"
            />
          </label>
          {amountError && <p role="alert">{amountError}</p>}
          {preview && (
            <div className="freight-preview">
              <p role="status">
                <strong>
                  Hypothetical order:{" "}
                  {money(preview.totalCents, question.currency)}
                </strong>
                <br />
                {preview.differenceCents === 0
                  ? "Matches the lowest complete order."
                  : `${money(Math.abs(preview.differenceCents), question.currency)} ${preview.differenceCents < 0 ? "below" : "above"} the lowest complete order.`}{" "}
                No offer has been changed.
              </p>
              {!decisionState.invalid && (
                <>
                  <DecisionTransition preview={preview} hypothetical />
                  <p className="field-hint">
                    Uses your current advisor priority and constraints.{" "}
                    {preview.after.warning}
                  </p>
                </>
              )}
            </div>
          )}
          {decisionState.invalid && (
            <p role="alert">
              Correct the decision context in the advisor before confirming this
              answer.
            </p>
          )}
          <label className="confirmation resolution-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            The supplier confirmed this final delivery amount, including tax.
          </label>
          <div className="dialog-actions">
            <Button
              variant="primary"
              disabled={!preview || !confirmed || decisionState.invalid}
              onClick={() => {
                if (!preview || !confirmed || decisionState.invalid) return;
                try {
                  onConfirm(question.offerId, preview.freightCents);
                } catch {
                  setError(
                    "The comparison changed. Close this question and review the current terms.",
                  );
                }
              }}
            >
              Confirm answer and update decision
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const id = question.offerId;
                setQuestionId(null);
                onEdit(id);
              }}
            >
              Edit other offer terms
            </Button>
          </div>
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </section>
  );
}

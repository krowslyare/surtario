import { useEffect, useId, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SavedComparison } from "./SavedComparisons";
import type { AdvisorContext } from "../domain/advisor";
import { analyzePurchase } from "../domain/advisor";
import { parseCents } from "../numbers";
import { Dialog } from "./Dialog";
import { Button } from "./ui/Button";

export type DeliveryReply = {
  requestId: Id<"quotationRequests">;
  messageId: string;
  text: string;
  receivedAt: string;
};
export default function ReplyDeliveryReview({
  token,
  reply,
  comparison,
  context,
  onClose,
  onApplied,
}: {
  token: string;
  reply: DeliveryReply;
  comparison: SavedComparison;
  context: AdvisorContext;
  onClose: () => void;
  onApplied?: (comparison: SavedComparison) => void;
}) {
  const offerFieldId = useId();
  const amountFieldId = useId();
  const quoteFieldId = useId();
  const confirm = useMutation(api.quotationMail.confirmReplyDelivery);
  const [offerId, setOfferId] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ before: string; after: string } | null>(
    null,
  );
  const offer = comparison.offers.find((item) => item.id === offerId);
  const cents = parseCents(amount);
  const valid = Boolean(
    offer &&
    offer.freightCents === null &&
    cents !== null &&
    cents >= 0 &&
    quote.trim() &&
    reply.text.includes(quote.trim()),
  );
  const before = analyzePurchase(
    comparison.request,
    comparison.offers,
    context,
  );
  const after = valid
    ? analyzePurchase(
        comparison.request,
        comparison.offers.map((item) =>
          item.id === offerId ? { ...item, freightCents: cents! } : item,
        ),
        context,
      )
    : null;
  useEffect(() => {
    setApproved(false);
  }, [offerId, amount, quote, comparison.revision, context]);
  return (
    <Dialog
      title={done ? "Delivery saved" : "Confirm delivery from this reply"}
      onClose={onClose}
    >
      {done ? (
        <>
          <p>
            The delivery cost and its reply evidence are saved in this
            comparison.
          </p>
          <h3>Before</h3>
          <p>{done.before}</p>
          <h3>Now</h3>
          <p role="status">{done.after}</p>
          <Button onClick={onClose}>Done</Button>
        </>
      ) : (
        <>
          <p>
            Received {new Date(reply.receivedAt).toLocaleString()}.
          </p>
          <p className="field-hint">
            Buying priority:{" "}
            {context.priority === "cash"
              ? "Preserve cash"
              : context.priority === "unit_price"
                ? "Lowest unit price"
                : "Balanced"}
            . The preview uses your comparison preferences.
          </p>
          <pre className="quotation-text">{reply.text}</pre>
          <div className="field">
            <label htmlFor={offerFieldId}>Offer to update</label>
            <select
              id={offerFieldId}
              value={offerId}
              onChange={(event) => setOfferId(event.target.value)}
            >
              <option value="">Choose an offer</option>
              {comparison.offers
                .filter((item) => item.freightCents === null)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.supplier} · {item.currency}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={amountFieldId}>
              Delivery per order ({offer?.currency ?? "select an offer"})
            </label>
            <input
              id={amountFieldId}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor={quoteFieldId}>
              Exact phrase confirming delivery
            </label>
            <textarea
              id={quoteFieldId}
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
            />
          </div>
          {quote.trim() && !reply.text.includes(quote.trim()) && (
            <p className="field-error">
              Copy the exact phrase from the reply above.
            </p>
          )}
          {after && (
            <>
              <h3>Before</h3>
              <p>{before.recommendation}</p>
              <h3>With this delivery cost</h3>
              <p>{after.recommendation}</p>
              <p>{after.impact}</p>
            </>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
            />
            I confirm this reply gives the delivery cost per order for this
            offer, in its currency and tax basis.
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            busy={busy}
            disabled={!valid || !approved || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await confirm({
                  token,
                  requestId: reply.requestId,
                  messageId: reply.messageId,
                  comparisonId: comparison.id,
                  expectedRevision: comparison.revision,
                  offerId,
                  freightCents: cents!,
                  evidenceQuote: quote.trim(),
                  context,
                  confirmed: true,
                });
                setDone({
                  before: result.confirmation.before.recommendation,
                  after: result.confirmation.after.recommendation,
                });
                onApplied?.(result.comparison);
              } catch (cause) {
                setError(
                  cause instanceof ConvexError && typeof cause.data === "string"
                    ? cause.data
                    : "The change was not confirmed. Reopen the comparison and review the reply again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm delivery and save
          </Button>
        </>
      )}
    </Dialog>
  );
}

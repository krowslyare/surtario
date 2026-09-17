import { MessageBody } from "./MessageBody";
import "../styles/mail.css";
import { useEffect, useId, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SavedComparison } from "./SavedComparisons";
import type { AdvisorContext } from "../domain/advisor";
import { analyzePurchase } from "../domain/advisor";
import { money, parseCents } from "../numbers";
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
  term = "delivery",
  targetOfferId,
}: {
  term?: "delivery" | "minimum";
  targetOfferId?: string;
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
  const [offerId, setOfferId] = useState(targetOfferId ?? "");
  const minimum = term === "minimum";
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ before: string; after: string } | null>(
    null,
  );
  const offer = comparison.offers.find((item) => item.id === offerId);
  const cents = minimum ? (/^\d+$/.test(amount) ? Number(amount) : null) : parseCents(amount);
  const valid = Boolean(
    offer &&
    (minimum || offer.freightCents === null) &&
    cents !== null &&
    cents >= (minimum ? 1 : 0) &&
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
          item.id === offerId ? { ...item, ...(minimum ? { minimumPackages: cents! } : { freightCents: cents! }) } : item,
        ),
        context,
      )
    : null;
  useEffect(() => {
    setApproved(false);
  }, [offerId, amount, quote, comparison.revision, context]);
  return (
    <Dialog
      title={done ? (minimum ? "Minimum saved" : "Delivery saved") : (minimum ? "Confirm minimum from this reply" : "Confirm delivery from this reply")}
      className="mail-dialog delivery-dialog"
      onClose={onClose}
    >
      {done ? (
        <>
          <p>
            The confirmed term and its reply evidence are saved in this
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
          <p>Match the quoted term to its offer, then check the updated result. Confirm only this term; review any other changes separately.</p>
          <details className="mail-details" open>
            <summary>Supplier reply</summary>
            <MessageBody text={reply.text} />
          </details>
          <div className="mail-form-grid">
          <div className="field">
            <label htmlFor={offerFieldId}>Offer to update</label>
            <select
              id={offerFieldId}
              value={offerId}
              onChange={(event) => setOfferId(event.target.value)}
            >
              <option value="">Choose an offer</option>
              {comparison.offers
                .filter((item) => (!targetOfferId || item.id === targetOfferId) && (minimum || item.freightCents === null))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.supplier} · {item.currency}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={amountFieldId}>
              {minimum ? "Minimum packs" : `Delivery per order (${offer?.currency ?? "select an offer"})`}
            </label>
            <input
              id={amountFieldId}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          </div>
          <div className="field">
            <label htmlFor={quoteFieldId}>
              {minimum ? "Exact phrase confirming minimum" : "Exact phrase confirming delivery"}
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
            <section className="delivery-result" aria-label="Delivery preview">
              <h3>{minimum ? "With this minimum" : "With this delivery cost"}</h3>
              <dl className="delivery-totals">
                <div><dt>{minimum ? "Minimum packs" : "Delivery per order"}</dt><dd>{minimum ? cents : money(cents, offer?.currency)}</dd></div>
                <div><dt>Updated order total</dt><dd>{money(after.alternatives.find(item => item.offerId === offerId)?.totalCents ?? null, offer?.currency)}</dd></div>
              </dl>
              <details className="mail-details"><summary>Compare with before</summary><p>{before.recommendation}</p></details>
            </section>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={approved}
              onChange={(event) => setApproved(event.target.checked)}
            />
            {minimum ? "I confirm this reply gives the minimum number of packs for this offer. Other terms remain unchanged in this confirmation." : "I confirm this reply gives the delivery cost per order for this offer, in its currency and tax basis."}
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
                  ...(minimum ? { minimumPackages: cents! } : { freightCents: cents! }),
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
            {minimum ? "Confirm minimum and save" : "Confirm delivery and save"}
          </Button>
        </>
      )}
    </Dialog>
  );
}

import ReplyOfferReview from "./ReplyOfferReview";
import type { PurchaseSeed } from "../domain/market";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { savedQuotationValidator } from "../../convex/quotationValidators";
import { Dialog } from "./Dialog";

type Quotation = Infer<typeof savedQuotationValidator>;
const labels = {
  draft: "Draft",
  sending: "Sending",
  sent: "Accepted by AgentMail",
  uncertain: "Send unconfirmed",
  failed: "Send failed",
};
function message(error: unknown) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "The operation was not confirmed. Keep the draft and check your connection.";
}
export default function QuotationMail(props: {
  comparisonId: Id<"comparisons"> | null;
  studyId?: Id<"studies">;
  prospectId?: Id<"webProspects">;
  resultId?: string;
  initialRequestId?: Id<"quotationRequests">;
  offers: { id: string; supplier: string }[];
  onEditOffer: (id: string) => void;
  onPrepare?: (seed: PurchaseSeed) => void;
  onAddReply?: (seed: PurchaseSeed) => void;
  comparisonLabel?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("procurement-demo-session-v1");
      if (stored && /^[a-f0-9]{64}$/.test(stored)) setToken(stored);
    } catch {
      /* Storage remains unavailable; no sending without a session. */
    }
  }, []);
  if (!token)
    return (
      <p className="field-hint">
        Save the comparison to prepare a quote request.
      </p>
    );
  return (
    <Boundary>
      <Connected {...props} token={token} />
    </Boundary>
  );
}
function Connected({
  token,
  comparisonId,
  studyId,
  prospectId,
  resultId,
  offers,
  onEditOffer,
  onPrepare,
  onAddReply,
  comparisonLabel,
  initialRequestId,
}: {
  token: string;
  comparisonId: Id<"comparisons"> | null;
  studyId?: Id<"studies">;
  prospectId?: Id<"webProspects">;
  resultId?: string;
  initialRequestId?: Id<"quotationRequests">;
  offers: { id: string; supplier: string }[];
  onEditOffer: (id: string) => void;
  onPrepare?: (seed: PurchaseSeed) => void;
  onAddReply?: (seed: PurchaseSeed) => void;
  comparisonLabel?: string;
}) {
  const status = useQuery(api.quotationMail.status, {});
  const requests = useQuery(api.quotationMail.list, { token });
  const create = useMutation(api.quotationMail.create);
  const send = useAction(api.quotationMail.send);
  const suggest = useAction(api.quotationMail.suggestInquiry);
  const revise = useMutation(api.quotationMail.reviseDraft);
  const [editDraft, setEditDraft] = useState<{
    id: string;
    revision: number;
    subject: string;
    text: string;
  } | null>(null);
  const [reviewReply, setReviewReply] = useState<{
    requestId: Id<"quotationRequests">;
    messageId: string;
    text: string;
    receivedAt: string;
    simulated: boolean;
    extraction: Quotation["replies"][number]["extraction"];
    extractionStatus: Quotation["replies"][number]["extractionStatus"];
    extractionError: string | null;
    extractionAttempts: number;
    extractionAttempt: number | null;
  } | null>(null);
  const [activeId, setActiveId] = useState<Quotation["id"] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [local, setLocal] = useState<Quotation | null>(null);
  const creation = useRef<{ comparisonId: string | null; clientId: string }>({
    comparisonId: null,
    clientId: crypto.randomUUID(),
  });
  const targetKey =
    prospectId ?? (studyId ? `${studyId}:${resultId}` : comparisonId);
  const matches = (item: Quotation) =>
    prospectId
      ? item.prospectId === prospectId
      : studyId
        ? item.studyId === studyId && item.resultId === resultId
        : item.comparisonId === comparisonId;
  const own = requests?.filter(
    (item) =>
      matches(item) && (!initialRequestId || item.id === initialRequestId),
  );
  const requestedAvailable = Boolean(
    own?.some((item) => item.id === initialRequestId),
  );

  const persisted = own?.find((item) => item.id === activeId);
  const localActive = local?.id === activeId && matches(local) ? local : null;
  const active =
    localActive && (!persisted || localActive.revision > persisted.revision)
      ? localActive
      : (persisted ?? localActive);
  const liveReviewReply = reviewReply
    ? requests
        ?.find((request) => request.id === reviewReply.requestId)
        ?.replies.find((reply) => reply.messageId === reviewReply.messageId)
    : undefined;
  useEffect(() => {
    setActiveId(null);
    setReviewReply(null);
    setLocal(null);
    setConfirmed(false);
    setError("");
  }, [targetKey]);
  useEffect(() => {
    setConfirmed(false);
    setEditDraft(null);
  }, [active?.id, active?.revision, active?.recipient, active?.text]);
  useEffect(() => {
    if (initialRequestId && requestedAvailable) setActiveId(initialRequestId);
  }, [initialRequestId, requestedAvailable]);
  async function prepare() {
    if (!targetKey || busy) return;
    if (creation.current.comparisonId !== targetKey)
      creation.current = {
        comparisonId: targetKey,
        clientId: crypto.randomUUID(),
      };
    setBusy(true);
    setError("");
    try {
      const draft = await create({
        token,
        ...(prospectId
          ? { prospectId }
          : studyId
            ? { studyId, resultId }
            : { comparisonId: comparisonId! }),
        clientId: creation.current.clientId,
      });
      setLocal(draft);
      setActiveId(draft.id);
      setConfirmed(false);
      creation.current = { comparisonId: null, clientId: crypto.randomUUID() };
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  async function sendReviewed() {
    if (!active || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await send({
        token,
        id: active.id,
        expectedRevision: active.revision,
        confirmed: true,
      });
      setLocal(updated);
      setConfirmed(false);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="saved-studies" aria-label="Email quote requests">
      <h2>Request terms by email</h2>
      <p className="field-hint">
        {prospectId
          ? "Request based on a saved web candidate. The noted contact is not the recipient: sending uses only the configured test inbox."
          : studyId
            ? "Catalog request based on the saved study. It does not require a quantity or price. The recipient is the test inbox, not the distributor contact."
            : "The request uses the saved version of this comparison. Save any changes you want to include first."}
      </p>
      {status === undefined && (
        <p className="field-hint">Checking email availability…</p>
      )}
      {status && !status.enabled && (
        <p className="notice info">
          Test email is unavailable. You can prepare and copy the message; will
          not be sent.
        </p>
      )}
      {!initialRequestId && (
        <button
          className="button secondary"
          disabled={!targetKey || busy}
          onClick={prepare}
        >
          Prepare test request
        </button>
      )}
      {!targetKey && <p className="field-hint">Save the comparison first.</p>}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {own?.map((item) => (
        <div className="saved-study-row" key={item.id}>
          <span>
            {item.subject} · {labels[item.state]}
          </span>
          <button
            className="button text-button"
            disabled={busy}
            onClick={() => {
              setActiveId(item.id);
              setConfirmed(false);
              setNotice("");
            }}
          >
            View request
          </button>
        </div>
      ))}
      {active && (
        <Dialog
          title="Review quote request"
          onClose={() => {
            setActiveId(null);
            setConfirmed(false);
          }}
        >
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <p>
            <strong>Test recipient:</strong>{" "}
            {active.recipient ??
              "Not configured; create another request after it is configured."}
          </p>
          <p>
            <strong>{active.subject}</strong>
          </p>
          <pre className="quotation-text">{active.text}</pre>
          {active.state === "draft" && (
            <div className="inquiry-drafting">
              <p className="field-hint">
                Ask about the missing terms that matter. The saved message above
                is the version you approve for sending.
              </p>
              {status?.draftEnabled && active.aiDraftStatus === "idle" && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setConfirmed(false);
                    setError("");
                    try {
                      setLocal(
                        await suggest({
                          token,
                          id: active.id,
                          expectedRevision: active.revision,
                        }),
                      );
                    } catch (cause) {
                      setError(message(cause));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Suggest supplier question
                </button>
              )}
              {active.aiDraftStatus === "running" && (
                <p role="status">
                  Preparing a question. You can return to this saved request
                  later.
                </p>
              )}
              {active.aiDraftStatus === "failed" && (
                <p className="notice info">
                  The AI suggestion could not be confirmed. You can edit the
                  original message.
                </p>
              )}
              {active.aiDraftStatus === "complete" && active.aiDraftText && (
                <details>
                  <summary>Review AI suggestion</summary>
                  <strong>{active.aiDraftSubject}</strong>
                  <pre className="quotation-text">{active.aiDraftText}</pre>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setConfirmed(false);
                      setEditDraft({
                        id: active.id,
                        revision: active.revision,
                        subject: active.aiDraftSubject ?? active.subject,
                        text: active.aiDraftText!,
                      });
                    }}
                  >
                    Edit this suggestion
                  </button>
                </details>
              )}
              {!editDraft && (
                <button
                  className="button text-button"
                  disabled={busy || active.aiDraftStatus === "running"}
                  onClick={() => {
                    setConfirmed(false);
                    setEditDraft({
                      id: active.id,
                      revision: active.revision,
                      subject: active.subject,
                      text: active.text,
                    });
                  }}
                >
                  Edit saved message
                </button>
              )}
              {editDraft?.id === active.id && (
                <div>
                  <label className="field">
                    <span>Message subject</span>
                    <input
                      value={editDraft.subject}
                      maxLength={120}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          subject: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Message text</span>
                    <textarea
                      value={editDraft.text}
                      rows={7}
                      maxLength={4000}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, text: event.target.value })
                      }
                    />
                  </label>
                  <div className="dialog-actions">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setEditDraft(null)}
                    >
                      Discard message edits
                    </button>
                    <button
                      className="button primary"
                      disabled={
                        busy ||
                        !editDraft.subject.trim() ||
                        editDraft.text.trim().length < 10
                      }
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        setConfirmed(false);
                        try {
                          setLocal(
                            await revise({
                              token,
                              id: active.id,
                              expectedRevision: editDraft.revision,
                              subject: editDraft.subject,
                              text: editDraft.text,
                            }),
                          );
                          setEditDraft(null);
                          setNotice(
                            "Message saved. Review this version before approving the send.",
                          );
                        } catch (cause) {
                          setError(message(cause));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Save message revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <p role="status">
            {labels[active.state]}.{" "}
            {active.state === "sent"
              ? "Acceptance does not confirm delivery or a reply."
              : "No purchase is made."}
          </p>
          {active.failure && <p className="notice error">{active.failure}</p>}
          {(active.state === "sending" || active.state === "uncertain") && (
            <p>
              If sending was interrupted, an operator must review it. It will
              not create another one to repeat it without checking the result.
            </p>
          )}
          {active.state === "draft" && (
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={
                  Boolean(editDraft) ||
                  active.aiDraftStatus === "running" ||
                  busy
                }
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I reviewed the recipient and message and authorize this test send
            </label>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(active.text);
                  setNotice("Text copied. No message was sent.");
                } catch {
                  setNotice("Select the text and copy it manually.");
                }
              }}
            >
              Copy for WhatsApp
            </button>
            <button
              className="button primary"
              disabled={
                !status?.enabled ||
                !active.recipient ||
                active.state !== "draft" ||
                !confirmed ||
                Boolean(editDraft) ||
                active.aiDraftStatus === "running" ||
                busy
              }
              onClick={sendReviewed}
            >
              Send test request
            </button>
          </div>
          {notice && <p role="status">{notice}</p>}
          <h3>Request history</h3>
          <ul>
            <li>Prepared {new Date(active.createdAt).toLocaleString()}.</li>
            {active.approvedAt !== null && (
              <li>
                Approved revision {active.approvedRevision} for the recipient
                and message above on{" "}
                {new Date(active.approvedAt).toLocaleString()}.
              </li>
            )}
            {active.state !== "draft" && (
              <li>
                {labels[active.state]} ·{" "}
                {new Date(active.updatedAt).toLocaleString()}.
              </li>
            )}
          </ul>
          <h3>Linked replies</h3>
          {active.replies.length === 0 ? (
            <p>
              No replies are linked yet. You can continue researching and return
              to this saved request later.
            </p>
          ) : (
            active.replies.map((reply) => (
              <div key={reply.messageId}>
                <p>Received {reply.receivedAt}</p>
                <pre className="quotation-text">{reply.text}</pre>
                <p>Review the reply before changing prices or terms.</p>
                {onPrepare && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setReviewReply({
                        requestId: active.id,
                        messageId: reply.messageId,
                        text: reply.text,
                        receivedAt: reply.receivedAt,
                        simulated: active.simulated,
                        extraction: reply.extraction,
                        extractionStatus: reply.extractionStatus,
                        extractionError: reply.extractionError,
                        extractionAttempts: reply.extractionAttempts,
                        extractionAttempt: reply.extractionAttempt,
                      });
                      setActiveId(null);
                      setConfirmed(false);
                    }}
                  >
                    Review as new offer
                  </button>
                )}
                {offers.map((offer) => (
                  <button
                    className="button text-button"
                    key={offer.id}
                    onClick={() => {
                      setActiveId(null);
                      onEditOffer(offer.id);
                    }}
                  >
                    Edit terms for {offer.supplier}
                  </button>
                ))}
              </div>
            ))
          )}
        </Dialog>
      )}
      {reviewReply && onPrepare && (
        <ReplyOfferReview
          reply={{
            ...reviewReply,
            ...(liveReviewReply
              ? {
                  extraction: liveReviewReply.extraction,
                  extractionStatus: liveReviewReply.extractionStatus,
                  extractionError: liveReviewReply.extractionError,
                  extractionAttempts: liveReviewReply.extractionAttempts,
                  extractionAttempt: liveReviewReply.extractionAttempt,
                }
              : {}),
          }}
          token={token}
          aiEnabled={status?.extractionEnabled ?? false}
          onClose={() => setReviewReply(null)}
          onPrepare={onPrepare}
          onAdd={onAddReply}
          comparisonLabel={comparisonLabel}
        />
      )}
    </section>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="notice error">
        Email is unavailable. The comparison remains accessible.
      </p>
    ) : (
      this.props.children
    );
  }
}

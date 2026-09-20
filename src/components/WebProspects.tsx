import type { StudyProspect } from "../domain/study";
import type { PurchaseSeed } from "../domain/market";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Bookmark, Check, ExternalLink } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Dialog } from "./Dialog";
import QuotationMail from "./QuotationMail";

export function SaveWebProspect({
  token,
  runId,
  sourceIndex,
  title,
  url,
  onSaved,
  savedActionLabel,
  onContinue,
  simulated,
  primaryInquiry = false,
}: {
  token: string;
  runId: Id<"researchRuns">;
  sourceIndex: number;
  title: string;
  url: string;
  onSaved?: (prospect: StudyProspect) => void;
  savedActionLabel?: string;
  onContinue?: (prospect: StudyProspect, intent: "inquiry" | "research") => void;
  simulated?: boolean;
  primaryInquiry?: boolean;
}) {
  const save = useMutation(api.prospects.save);
  const prospects = useQuery(api.prospects.list, { token });
  const [intent, setIntent] = useState<"inquiry" | "research" | null>(null);
  const [open, setOpen] = useState(false),
    [supplier, setSupplier] = useState(title.slice(0, 120)),
    [contact, setContact] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [lastSaved, setSaved] = useState<StudyProspect | null>(null);
  const saved = prospects?.find(item => item.runId === runId && item.sourceIndex === sourceIndex)
    ?? (lastSaved?.runId === runId && lastSaved.sourceIndex === sourceIndex ? lastSaved : null);
  const loading = prospects === undefined;
  return (
    <>
      {onContinue && primaryInquiry && <button className="button primary" disabled={loading} onClick={() => { if (saved) onContinue(saved, "inquiry"); else { setIntent("inquiry"); setOpen(true); } }}>Prepare inquiry</button>}
      {!onContinue && <button className="button secondary" disabled={loading} onClick={() => { setIntent(null); setOpen(true); }}>
        {saved ? "View saved candidate" : "Save potential distributor"}
      </button>}
      {onContinue && <details className="source-more-options">
        <summary>More options</summary>
        <div className="source-more-actions">
          <button className="button text-button" disabled={loading} onClick={() => { setIntent(null); setOpen(true); }}>
            {saved ? "View saved candidate" : "Save potential distributor"}
          </button>
          {onContinue && <>
            {!primaryInquiry && <button className="button text-button" disabled={loading} onClick={() => { if (saved) onContinue(saved, "inquiry"); else { setIntent("inquiry"); setOpen(true); } }}>Prepare inquiry</button>}
            {simulated === false && <button className="button text-button" disabled={loading} onClick={() => { if (saved) onContinue(saved, "research"); else { setIntent("research"); setOpen(true); } }}>Research missing details</button>}
          </>}
        </div>
      </details>}
      {open && (
        <Dialog
          title="Review potential distributor"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>{title}</p>
          <a href={url} target="_blank" rel="noreferrer">
            Review source page
          </a>
          <p>
            Confirm that the page is relevant to this ingredient. It does not
            confirm inventory, delivery, or price.
          </p>
          <label className="field">
            Potential distributor name
            <input
              value={saved?.supplier ?? supplier}
              maxLength={120}
              disabled={busy || Boolean(saved)}
              onChange={(e) => {
                setSupplier(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <label className="field">
            Contact found (optional)
            <input
              value={saved ? saved.contact ?? "" : contact}
              maxLength={300}
              disabled={busy || Boolean(saved)}
              onChange={(e) => {
                setContact(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <p className="field-hint">
            Add an email, phone number, or contact page only if it appears in
            the source. It remains data you reviewed; it does not authorize messages.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(saved) || confirmed}
              disabled={busy || Boolean(saved)}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I reviewed the source and want to save this candidate
          </label>
          {error && <p role="alert">{error}</p>}
          {saved ? (
            <>
              <p role="status">{savedActionLabel
                ? "This candidate is saved. Keep it in this follow-up, then save your findings to retain the link."
                : onContinue ? "Candidate saved. Use Prepare inquiry to continue with its saved context." : "Candidate saved. Open it from your study to prepare an inquiry."}</p>
              {savedActionLabel && onSaved && <button className="button primary" onClick={() => { onSaved(saved); setOpen(false); }}>{savedActionLabel}</button>}
            </>
          ) : (
            <button
              className="button primary"
              disabled={busy || !confirmed || !supplier.trim()}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await save({
                    token,
                    runId,
                    sourceIndex,
                    supplier,
                    contact,
                    confirmed: true,
                  });
                  setSaved(result);
                  if (intent && onContinue) onContinue(result, intent);
                  else onSaved?.(result);
                  if (onSaved || onContinue) setOpen(false);
                } catch (cause) {
                  setError(
                    cause instanceof ConvexError &&
                      typeof cause.data === "string"
                      ? cause.data
                      : "Saving was not confirmed. Try again with the same details.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : intent === "inquiry" ? "Save and prepare inquiry" : intent === "research" ? "Save and continue research" : "Save candidate"}
            </button>
          )}
        </Dialog>
      )}
    </>
  );
}
export function WebProspectLibrary({
  token,
  onPrepare,
  onSelect,
  selectedIds,
  onContinue,
}: {
  token: string;
  onPrepare: (seed: PurchaseSeed) => void;
  onSelect?: (prospect: StudyProspect) => void;
  selectedIds?: string[];
  onContinue?: (prospect: StudyProspect, intent: "inquiry" | "research") => void;
}) {
  const prospects = useQuery(api.prospects.list, { token });
  if (!prospects?.length) return null;
  return (
    <section className="web-prospect-library" aria-label="Saved web distributors">
      <header className="web-prospect-library-heading">
        <h2>Saved web distributors</h2>
        <p>Price, availability and delivery area still need confirmation.</p>
      </header>
      {prospects.map((item) => (
        <article className="web-prospect-card" key={item.id} aria-label={`Saved distributor: ${item.supplier}`}>
          <div className="web-prospect-copy">
            <h3>{item.supplier}</h3>
            <p className="web-prospect-context">{item.ingredient} · {item.region}</p>
            <div className="web-prospect-contact">
              <span>Contact</span>
              <p>{item.contact ?? "Pending confirmation"}</p>
              <small>{item.contact ? "Not independently verified." : "Review the source page for contact details."}</small>
            </div>
          </div>
          {(onContinue || onSelect) && (
            <div className="web-prospect-actions">
              {onContinue && (
                <button className="button primary" onClick={() => onContinue(item, "inquiry")}>
                  Prepare inquiry
                </button>
              )}
              {onSelect && (
                <button
                  className="button secondary"
                  aria-pressed={selectedIds?.includes(item.id) ?? false}
                  disabled={selectedIds?.includes(item.id) || (selectedIds?.length ?? 0) >= 3}
                  onClick={() => onSelect(item)}
                >
                  {selectedIds?.includes(item.id) ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
                  {selectedIds?.includes(item.id) ? "In my study" : "Add to my study"}
                </button>
              )}
              {onContinue && item.simulated === false && (
                <button className="button text-button" onClick={() => onContinue(item, "research")}>
                  Research missing details
                </button>
              )}
            </div>
          )}
          <footer className="web-prospect-source">
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" />
              <span>{item.sourceTitle}</span>
            </a>
            <span className="web-prospect-observed">
              Observed {new Date(item.observedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </footer>
          {!onSelect && (
            <div className="web-prospect-mail">
              <QuotationMail
                comparisonId={null}
                prospectId={item.id}
                offers={[]}
                onEditOffer={() => {}}
                onPrepare={onPrepare}
              />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

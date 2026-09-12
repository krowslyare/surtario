import type { StudyProspect } from "../domain/study";
import type { PurchaseSeed } from "../domain/market";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
}: {
  token: string;
  runId: Id<"researchRuns">;
  sourceIndex: number;
  title: string;
  url: string;
  onSaved?: (prospect: StudyProspect) => void;
}) {
  const save = useMutation(api.prospects.save);
  const [open, setOpen] = useState(false),
    [supplier, setSupplier] = useState(""),
    [contact, setContact] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <>
      <button className="button text-button" onClick={() => setOpen(true)}>
        {saved ? "View saved candidate" : "Save potential distributor"}
      </button>
      {open && (
        <Dialog
          title="Review potential distributor"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>{title}</p>
          <a href={url} target="_blank" rel="noreferrer">
            Review page de source
          </a>
          <p>
            Confirm that the page is relevant to this ingredient. It does not
            confirm inventory, delivery, or price.
          </p>
          <label className="field">
            Potential distributor name
            <input
              value={supplier}
              maxLength={120}
              disabled={busy || saved}
              onChange={(e) => {
                setSupplier(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <label className="field">
            Contacto encontrado (opcional)
            <input
              value={contact}
              maxLength={300}
              disabled={busy || saved}
              onChange={(e) => {
                setContact(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <p className="field-hint">
            Add an email, phone number, or contact page only if it appears in
            the source. Queda como dato revisado por ti; no autoriza mensajes.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || saved}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I reviewed the source and want to save this candidate
          </label>
          {error && <p role="alert">{error}</p>}
          {saved ? (
            <p role="status">
              Candidate saved. Its inquiry is under “Saved web savings».
            </p>
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
                  setSaved(true);
                  onSaved?.(result);
                  if (onSaved) setOpen(false);
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
              {busy ? "Saving…" : "Save candidate"}
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
}: {
  token: string;
  onPrepare: (seed: PurchaseSeed) => void;
  onSelect?: (prospect: StudyProspect) => void;
  selectedIds?: string[];
}) {
  const prospects = useQuery(api.prospects.list, { token });
  if (!prospects?.length) return null;
  return (
    <section className="saved-studies" aria-label="Saved web distributors">
      <h2>Saved web distributors</h2>
      <p>
        Candidate reviewed by you. Price, availability, and service area need
        consultar.
      </p>
      {prospects.map((item) => (
        <article key={item.id}>
          <h3>{item.supplier}</h3>
          <p>
            {item.ingredient} · {item.region}
          </p>
          <p>
            Contacto anotado:{" "}
            {item.contact ?? "Pending; review the source page"}
          </p>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            {item.sourceTitle}
          </a>
          <p className="field-hint">
            Source observed on{" "}
            {new Date(item.observedAt).toLocaleDateString("es-PE")}. Contacto
            not independently verified.
          </p>
          {onSelect ? (
            <button
              className="button secondary"
              aria-pressed={selectedIds?.includes(item.id)}
              disabled={
                selectedIds?.includes(item.id) ||
                (selectedIds?.length ?? 0) >= 3
              }
              onClick={() => onSelect(item)}
            >
              {selectedIds?.includes(item.id)
                ? "In my study"
                : "Add to my study"}
            </button>
          ) : (
            <QuotationMail
              comparisonId={null}
              prospectId={item.id}
              offers={[]}
              onEditOffer={() => {}}
              onPrepare={onPrepare}
            />
          )}
        </article>
      ))}
    </section>
  );
}

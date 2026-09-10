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
        {saved ? "Ver candidato guardado" : "Guardar posible distribuidor"}
      </button>
      {open && (
        <Dialog
          title="Revisar posible distribuidor"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>{title}</p>
          <a href={url} target="_blank" rel="noreferrer">
            Revisar página de origen
          </a>
          <p>
            Confirma que la página es pertinente para investigar este insumo. No
            confirma stock, reparto ni precio.
          </p>
          <label className="field">
            Nombre del posible distribuidor
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
            Anota un correo, teléfono o página de contacto si aparece en la
            fuente. Queda como dato revisado por ti; no autoriza mensajes.
          </p>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || saved}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Revisé la fuente y quiero conservar este candidato
          </label>
          {error && <p role="alert">{error}</p>}
          {saved ? (
            <p role="status">
              Candidato guardado. Su consulta está en «Distribuidores web
              guardados».
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
                      : "No se confirmó el guardado. Reintenta con los mismos datos.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Guardando…" : "Guardar candidato"}
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
    <section
      className="saved-studies"
      aria-label="Distribuidores web guardados"
    >
      <h2>Distribuidores web guardados</h2>
      <p>
        Candidatos revisados por ti. Precio, disponibilidad y cobertura por
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
            {item.contact ?? "Pendiente; revisa la página de origen"}
          </p>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            {item.sourceTitle}
          </a>
          <p className="field-hint">
            Fuente observada el{" "}
            {new Date(item.observedAt).toLocaleDateString("es-PE")}. Contacto
            sin verificación independiente.
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
                ? "En mi estudio"
                : "Añadir a mi estudio"}
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

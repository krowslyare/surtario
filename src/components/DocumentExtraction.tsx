import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { documentRun } from "../../convex/documentValidators";
import type { PurchaseSeed } from "../domain/market";
import ExtractionReview from "./ExtractionReview";
import { Dialog } from "./Dialog";

type Run = Infer<typeof documentRun>;
const fileUrl = (kind: Run["kind"]) =>
  `/examples/cotizacion-demo.${kind === "pdf" ? "pdf" : "png"}`;
export default function DocumentExtraction({
  onPrepare,
}: {
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      let value = localStorage.getItem("procurement-demo-session-v1");
      if (!value || !/^[a-f0-9]{64}$/.test(value)) {
        value = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        localStorage.setItem("procurement-demo-session-v1", value);
      }
      setToken(value);
    } catch {
      /* No session: no paid action. */
    }
  }, []);
  return token ? (
    <Boundary>
      <Connected token={token} onPrepare={onPrepare} />
    </Boundary>
  ) : (
    <p>
      La lectura de documentos necesita almacenamiento de sesión disponible.
    </p>
  );
}
function Connected({
  token,
  onPrepare,
}: {
  token: string;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const enabled = useQuery(api.documents.status, {});
  const runs = useQuery(api.documents.list, { token });
  const extract = useAction(api.documents.extract);
  const [kind, setKind] = useState<Run["kind"]>("image");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [local, setLocal] = useState<Run | null>(null);
  const [preview, setPreview] = useState<Run["kind"] | null>(null);
  const attempt = useRef<{ kind: Run["kind"]; clientId: string } | null>(null);
  async function read() {
    if (busy || !enabled) return;
    if (!attempt.current || attempt.current.kind !== kind)
      attempt.current = { kind, clientId: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      setLocal(await extract({ token, ...attempt.current }));
      attempt.current = null;
    } catch (cause) {
      setError(
        cause instanceof ConvexError && typeof cause.data === "string"
          ? cause.data
          : "No se confirmó el resultado. Repite la consulta para recuperar la misma solicitud; no se repetirá la lectura.",
      );
    } finally {
      setBusy(false);
    }
  }
  const visible = [...(runs ?? [])];
  if (local) {
    const index = visible.findIndex((run) => run.id === local.id);
    if (index < 0) visible.unshift(local);
    else if (visible[index].status === "running" && local.status !== "running")
      visible[index] = local;
  }
  return (
    <section className="ingredient-intake" aria-label="Lectura de foto y PDF">
      <h2>Lee una cotización desde foto o PDF</h2>
      <p>
        Prueba con documentos sintéticos. Revisa los datos contra el archivo
        antes de compararlos.
      </p>
      <label className="field">
        Archivo de ejemplo
        <select
          value={kind}
          disabled={busy}
          onChange={(e) => setKind(e.target.value as Run["kind"])}
        >
          <option value="image">Imagen de cotización · PNG</option>
          <option value="pdf">Cotización PDF · 1 página</option>
        </select>
      </label>
      <div className="intake-actions">
        <button className="button secondary" onClick={() => setPreview(kind)}>
          Ver archivo de ejemplo
        </button>
        <a className="button text-button" href={fileUrl(kind)} download>
          Descargar ejemplo
        </a>
        <button
          className="button primary"
          disabled={!enabled || busy}
          onClick={read}
        >
          {busy ? "Leyendo documento…" : "Leer con OpenAI"}
        </button>
      </div>
      {enabled === false && (
        <p className="notice info">
          Lectura automática sin configurar. Puedes revisar el ejemplo y usar la
          transcripción manual desde «Añadir lista o archivo».
        </p>
      )}
      <p className="field-hint">
        Los archivos propios permanecen en tu pestaña. La demo solo envía estos
        ejemplos al modelo. Una extracción no registra compras.
      </p>
      {error && <p role="alert">{error}</p>}
      {visible.map((run) => (
        <div className="intake-batch" key={run.id}>
          <h3>
            {run.kind === "pdf" ? "PDF" : "Imagen"} ·{" "}
            {new Date(run.createdAt).toLocaleString("es-PE")}
          </h3>
          <button
            className="button text-button"
            onClick={() => setPreview(run.kind)}
          >
            Ver original
          </button>
          {run.status === "running" && (
            <p role="status">
              Lectura en curso o pendiente de confirmación. No se reintenta
              automáticamente.
            </p>
          )}
          {run.error && <p role="alert">{run.error}</p>}
          <DocumentReview run={run} onPrepare={onPrepare} />
        </div>
      ))}
      {preview && (
        <Dialog
          title="Archivo original de ejemplo"
          wide
          onClose={() => setPreview(null)}
        >
          {preview === "image" ? (
            <img
              src={fileUrl(preview)}
              alt="Cotización sintética: arroz blanco extra, saco de 18 kg, PEN 80"
              style={{ width: "100%" }}
            />
          ) : (
            <object
              data={fileUrl(preview)}
              type="application/pdf"
              width="100%"
              height="460"
            >
              <a href={fileUrl(preview)} target="_blank" rel="noreferrer">
                Abrir PDF de ejemplo
              </a>
            </object>
          )}
        </Dialog>
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
      <p role="alert">
        La lectura de documentos no está disponible. Puedes seguir con la
        entrada manual.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function DocumentReview({
  run,
  onPrepare,
}: {
  run: Run;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  return (
    run.result && (
      <>
        <p>
          Tipo propuesto:{" "}
          {
            {
              quotation: "cotización",
              purchase: "compra realizada",
              list: "lista de insumos",
              unknown: "sin identificar",
            }[run.result.documentType]
          }
          .
        </p>
        <details>
          <summary>Ver transcripción propuesta por el modelo</summary>
          <pre className="quotation-text">{run.result.transcript}</pre>
        </details>
        <p className="field-hint">
          Las citas se contrastan con la transcripción del modelo. Comprueba
          también el archivo original, especialmente cifras y unidades.
        </p>
        {run.result.documentType === "quotation" ? (
          <ExtractionReview
            source={{
              id: run.id,
              title: `Transcripción automática · cotización sintética · ${run.kind}`,
              text: run.result.transcript,
              observedAt: new Date(run.createdAt).toISOString().slice(0, 10),
              simulated: false,
              url: fileUrl(run.kind),
            }}
            sourceTextLabel="Transcripción propuesta · contrastar con archivo"
            originalPreview={
              <img
                src="/examples/cotizacion-demo.png"
                alt="Original sintético: saco de arroz de 18 kg, PEN 80"
                style={{ width: "100%" }}
              />
            }
            proposal={run.result.offer}
            triggerLabel="Revisar datos leídos"
            onPrepare={onPrepare}
          />
        ) : (
          <p>
            Este resultado no se convierte en una oferta. Usa la entrada manual
            para investigar sus insumos.
          </p>
        )}
      </>
    )
  );
}

import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { ConvexError, type Infer } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { documentRun } from "../../convex/documentValidators";
import type { PurchaseSeed } from "../domain/market";
import ExtractionReview from "./ExtractionReview";
import { Dialog } from "./Dialog";
import Select from "./ui/Select";
import { Disclosure } from "./ui/Disclosure";

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
    <p>Document reading requires session storage.</p>
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
          : "The result was not confirmed. Repeat the request to recover the same operation; the document will not be read again.",
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
      <h2>Read a quote from a photo or PDF</h2>
      <p>
        Use synthetic documents. Check the extracted data against the original
        file before comparing them.
      </p>
      <label className="field">
        Sample file
        <Select
          aria-label="Sample file"
          value={kind}
          disabled={busy}
          onValueChange={(value) => setKind(value as Run["kind"])}
          options={[
            { value: "image", label: "Quote image · PNG" },
            { value: "pdf", label: "Quote PDF · 1 page" },
          ]}
        />
      </label>
      <div className="intake-actions">
        <button className="button secondary" onClick={() => setPreview(kind)}>
          View sample file
        </button>
        <a className="button text-button" href={fileUrl(kind)} download>
          Download sample
        </a>
        <button
          className="button primary"
          disabled={!enabled || busy}
          onClick={read}
        >
          {busy ? "Reading document…" : "Read with OpenAI"}
        </button>
      </div>
      {enabled === false && (
        <p className="notice info">
          Automatic reading is not configured. You can review the sample and use
          manual transcription from “Add list or file.”
        </p>
      )}
      <p className="field-hint">
        Your own files remain in this tab. The demo sends only these samples to
        the model. Extraction does not record a purchase.
      </p>
      {error && <p role="alert">{error}</p>}
      {visible.map((run) => (
        <div className="intake-batch" key={run.id}>
          <h3>
            {run.kind === "pdf" ? "PDF" : "Imagen"} ·{" "}
            {new Date(run.createdAt).toLocaleString("en-US")}
          </h3>
          <button
            className="button text-button"
            onClick={() => setPreview(run.kind)}
          >
            View original
          </button>
          {run.status === "running" && (
            <p role="status">
              Reading is in progress or awaiting confirmation. It will not retry
              automatically.
            </p>
          )}
          {run.error && <p role="alert">{run.error}</p>}
          <DocumentReview run={run} onPrepare={onPrepare} />
        </div>
      ))}
      {preview && (
        <Dialog
          title="Original sample file"
          wide
          onClose={() => setPreview(null)}
        >
          {preview === "image" ? (
            <img
              src={fileUrl(preview)}
              alt="Synthetic quote: extra white rice, 18 kg bag, PEN 80"
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
                Open sample PDF
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
        Document reading is unavailable. You can continue with entrada manual.
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
              quotation: "quote",
              purchase: "completed purchase",
              list: "ingredient list",
              unknown: "unidentified",
            }[run.result.documentType]
          }
          .
        </p>
        <Disclosure title="View proposed transcript">
          <pre className="quotation-text">{run.result.transcript}</pre>
        </Disclosure>
        <p className="field-hint">
          Citations are checked against the model transcript. Also check the
          original file, especially numbers and units.
        </p>
        {run.result.documentType === "quotation" ? (
          <ExtractionReview
            source={{
              id: run.id,
              title: `Automatic transcript · synthetic quote · ${run.kind}`,
              text: run.result.transcript,
              observedAt: new Date(run.createdAt).toISOString().slice(0, 10),
              simulated: true,
              url: fileUrl(run.kind),
            }}
            sourceTextLabel="Proposed transcript · check against file"
            originalPreview={
              <img
                src="/examples/cotizacion-demo.png"
                alt="Synthetic original: 18 kg bag of rice, PEN 80"
                style={{ width: "100%" }}
              />
            }
            proposal={run.result.offer}
            triggerLabel="Review extracted data"
            onPrepare={(seed) => {
              seed.sources[run.id].documentReview = {
                runId: run.id,
                values: seed.sources[run.id].extraction!.reviewed,
                confirmed: true,
              };
              onPrepare(seed);
            }}
          />
        ) : (
          <p>
            This result does not become an offer. Use manual entry to research
            ingredients.
          </p>
        )}
      </>
    )
  );
}

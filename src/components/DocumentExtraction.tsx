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

const isSamplePeru = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("example") === "pe";

const fileUrl = (kind: Run["kind"]) => {
  switch (kind) {
    case "pdf":
      return "/examples/cotizacion-demo.pdf";
    case "image":
      return "/examples/cotizacion-demo.png";
    case "pdf_us":
      return "/examples/quote-demo-us.pdf";
    case "image_us":
    default:
      return "/examples/quote-demo-us.png";
  }
};

const altText = (kind: Run["kind"]) => {
  if (kind === "image_us" || kind === "pdf_us") {
    return "Synthetic quote: Cascade Pantry Supply, long-grain white rice, 25 lb bag, USD 20.00";
  }
  return "Synthetic quote: extra white rice, 18 kg bag, PEN 80";
};

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
  const peru = isSamplePeru();
  const [kind, setKind] = useState<Run["kind"]>(peru ? "image" : "image_us");
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
    <section className="ingredient-intake document-extraction" aria-label="Photo and PDF extraction">
      <header className="document-extraction-header">
        <h3>Read a quote from a photo or PDF</h3>
        <p>
          Use synthetic documents. Check the extracted data against the original
          file before comparing them.
        </p>
      </header>
      <label className="field">
        Sample file
        <Select
          aria-label="Sample file"
          value={kind}
          disabled={busy}
          onValueChange={(value) => setKind(value as Run["kind"])}
          options={
            peru
              ? [
                  { value: "image", label: "Quote image · PNG" },
                  { value: "pdf", label: "Quote PDF · 1 page" },
                  { value: "image_us", label: "Quote image (US · English) · PNG" },
                  { value: "pdf_us", label: "Quote PDF (US · English) · 1 page" },
                ]
              : [
                  { value: "image_us", label: "Quote image (US · Portland) · PNG" },
                  { value: "pdf_us", label: "Quote PDF (US · Portland) · 1 page" },
                  { value: "image", label: "Quote image (PE · Lima) · PNG" },
                  { value: "pdf", label: "Quote PDF (PE · Lima) · 1 page" },
                ]
          }
        />
      </label>
      <div className="intake-actions">
        <button
          className="button primary"
          disabled={!enabled || busy}
          onClick={read}
        >
          {busy ? "Reading quote…" : "Read quote with AI"}
        </button>
        <button className="button secondary" onClick={() => setPreview(kind)}>
          View sample file
        </button>
        <a className="button text-button" href={fileUrl(kind)} download>
          Download sample
        </a>
      </div>
      {enabled === false && (
        <p className="notice info">
          AI reading is not configured in this demo. You can view the sample file or use “Enter quote manually” above.
        </p>
      )}
      <p className="field-hint">
        Public demo: files stay in this tab and only synthetic samples are processed. Extraction never records a purchase.
      </p>
      {error && <p role="alert">{error}</p>}
      {visible.map((run) => (
        <div className="intake-batch" key={run.id}>
          <h3>
            {run.kind === "pdf" || run.kind === "pdf_us" ? "PDF" : "Image"} ·{" "}
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
          {preview === "image" || preview === "image_us" ? (
            <img
              src={fileUrl(preview)}
              alt={altText(preview)}
              style={{
                width: "100%",
                borderRadius: "var(--radius-card)",
                boxShadow: "var(--shadow-card)",
              }}
            />
          ) : (
            <object
              data={fileUrl(preview)}
              type="application/pdf"
              width="100%"
              height="520"
              style={{
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--color-border)",
              }}
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
        Document reading is unavailable. You can continue with manual entry.
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
                src={fileUrl(run.kind)}
                alt={altText(run.kind)}
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "var(--shadow-card)",
                }}
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

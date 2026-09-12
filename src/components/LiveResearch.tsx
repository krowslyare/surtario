import { SaveWebProspect, WebProspectLibrary } from "./WebProspects";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ExternalLink, FileSearch, History, Search } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import {
  combineReviewedOffers,
  type ExtractedOffer,
  type ExtractionSource,
} from "../domain/extraction";
import type { PurchaseSeed } from "../domain/market";
import ExtractionReview from "./ExtractionReview";

const SESSION_KEY = "procurement-demo-session-v1";

export type ResearchStatus = {
  searchEnabled: boolean;
  extractionEnabled: boolean;
};

export type ResearchSource = {
  url: string;
  title: string;
  description: string;
  markdown: string | null;
  contentTruncated: boolean;
  extraction: ExtractedOffer | null;
  extractionStatus: "idle" | "running" | "complete" | "failed";
  extractionError: string | null;
};

export type SavedResearch = {
  id: string;
  ingredient: string;
  region: string;
  observedAt: string;
  status: "running" | "complete" | "failed";
  error: string | null;
  sources: ResearchSource[];
  discarded: number;
  warning: boolean;
};

export type WebSearchRequest = {
  id: number;
  ingredient: string;
  region: string;
};

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function observedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha pendiente"
    : new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function ResearchWorkspace({
  status,
  runs,
  request,
  onStatus,
  onSearch,
  onExtract,
  onPrepare,
  renderProspect,
}: {
  renderProspect?: (run: SavedResearch, sourceIndex: number) => ReactNode;
  status: ResearchStatus | undefined;
  runs: SavedResearch[] | undefined;
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onSearch: (ingredient: string, region: string) => Promise<SavedResearch>;
  onExtract: (runId: string, sourceIndex: number) => Promise<ExtractedOffer>;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localRun, setLocalRun] = useState<SavedResearch | null>(null);
  const [searching, setSearching] = useState(false);
  const [extracting, setExtracting] = useState<string[]>([]);
  const [localExtractions, setLocalExtractions] = useState<
    Record<string, ExtractedOffer>
  >({});
  const [reviewed, setReviewed] = useState<
    { sourceId: string; seed: PurchaseSeed }[]
  >([]);
  const [equivalent, setEquivalent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onStatus(status), [onStatus, status]);

  useEffect(() => {
    if (!request) return;
    let current = true;
    setSearching(true);
    setError("");
    void onSearch(request.ingredient, request.region)
      .then((run) => {
        if (!current) return;
        setLocalRun(run);
        setActiveId(run.id);
        setReviewed([]);
        setEquivalent(false);
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo completar la búsqueda. Vuelve a intentarlo.",
          );
      })
      .finally(() => current && setSearching(false));
    return () => {
      current = false;
    };
  }, [request?.id]);

  const active = useMemo(() => {
    const persisted = runs?.find((run) => run.id === activeId);
    if (
      localRun?.id === activeId &&
      localRun.status !== "running" &&
      persisted?.status === "running"
    )
      return localRun;
    return persisted ?? (localRun?.id === activeId ? localRun : null);
  }, [activeId, localRun, runs]);

  async function extract(run: SavedResearch, sourceIndex: number) {
    const sourceId = `${run.id}:${sourceIndex}`;
    setExtracting((current) => [...current, sourceId]);
    setError("");
    try {
      const proposal = await onExtract(run.id, sourceIndex);
      setLocalExtractions((current) => ({ ...current, [sourceId]: proposal }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo extraer esta fuente. Puedes intentar de nuevo.",
      );
    } finally {
      setExtracting((current) => current.filter((id) => id !== sourceId));
    }
  }

  function saveReview(sourceId: string, seed: PurchaseSeed) {
    setReviewed((current) => {
      const existing = current.findIndex((item) => item.sourceId === sourceId);
      if (existing >= 0)
        return current.map((item, index) =>
          index === existing ? { sourceId, seed } : item,
        );
      return current.length < 3 ? [...current, { sourceId, seed }] : current;
    });
    setEquivalent(false);
  }

  function compareReviewed() {
    try {
      onPrepare(
        combineReviewedOffers(
          reviewed.map((item) => item.seed),
          reviewed.length === 1 || equivalent,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Revisa las ofertas seleccionadas.",
      );
    }
  }

  if (!status)
    return <p className="notice info">Comprobando la búsqueda web…</p>;

  // MarketStudy explains availability next to the search controls.
  if (!status.searchEnabled && runs?.length === 0 && !localRun) return null;

  return (
    <section className="live-research" aria-labelledby="live-research-title">
      <div className="live-research-heading">
        <div>
          <h2 id="live-research-title">Investigación web</h2>
          <p>
            Las páginas encontradas son fuentes candidatas. Revisa el contenido
            antes de tratarlas como ofertas de proveedores.
          </p>
        </div>
        {searching && <span role="status">Buscando fuentes…</span>}
      </div>

      {!status.searchEnabled && (
        <p className="notice info">
          Búsqueda web no configurada. Puedes seguir explorando los ejemplos.
        </p>
      )}

      {runs && runs.length > 0 && (
        <div
          className="research-history"
          aria-label="Investigaciones guardadas"
        >
          <p className="field-hint">
            Abrir otra investigación reemplaza la selección revisada de esta
            vista. Hasta 10 búsquedas por navegador; borrar datos del sitio
            pierde acceso.
          </p>
          <span>
            <History size={16} /> Investigaciones guardadas
          </span>
          <div>
            {runs.map((run) => (
              <button
                type="button"
                className="button text-button"
                key={run.id}
                aria-pressed={activeId === run.id}
                disabled={searching}
                onClick={() => {
                  if (activeId === run.id) return;
                  setActiveId(run.id);
                  setLocalRun(null);
                  setReviewed([]);
                  setEquivalent(false);
                  setError("");
                }}
              >
                {run.ingredient} · {run.region} ·{" "}
                {observedLabel(run.observedAt)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      {active && (
        <div className="research-run">
          <div className="research-run-meta">
            <strong>
              {active.ingredient} en {active.region}
            </strong>
            <span>Observado el {observedLabel(active.observedAt)}</span>
            {active.status === "running" && (
              <span role="status">
                Búsqueda en curso. Si quedó interrumpida, no se repetirá
                automáticamente.
              </span>
            )}
          </div>
          {active.warning && (
            <p className="notice info">
              La búsqueda devolvió contenido parcial; revisa las fuentes.
            </p>
          )}
          {active.error && <p className="notice error">{active.error}</p>}
          {active.discarded > 0 && (
            <p className="field-hint">
              {active.discarded}{" "}
              {active.discarded === 1
                ? "resultado se descartó"
                : "resultados se descartaron"}{" "}
              por no cumplir los límites de la búsqueda.
            </p>
          )}
          {active.status === "complete" && active.sources.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>No se recuperaron fuentes utilizables</h3>
              <p>Esto no confirma que no existan proveedores en la zona.</p>
            </div>
          )}
          <div className="research-sources">
            {active.sources.map((source, index) => {
              const sourceId = `${active.id}:${index}`;
              const url = safeUrl(source.url);
              const proposal = localExtractions[sourceId] ?? source.extraction;
              const isExtracting =
                extracting.includes(sourceId) ||
                source.extractionStatus === "running";
              const wasReviewed = reviewed.some(
                (item) => item.sourceId === sourceId,
              );
              const extractionSource: ExtractionSource = {
                id: sourceId,
                title: source.title,
                text: source.markdown ?? source.description,
                observedAt: active.observedAt,
                simulated: false,
                ...(url ? { url } : {}),
              };
              return (
                <article className="research-source" key={sourceId}>
                  <div className="research-source-copy">
                    <span>Fuente web candidata</span>
                    <h3>{source.title}</h3>
                    <p>{source.description}</p>
                    {source.contentTruncated && (
                      <small>El contenido recuperado está incompleto.</small>
                    )}
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Ver página de origen <ExternalLink size={14} />
                      </a>
                    ) : (
                      <small>La fuente no incluye una URL web válida.</small>
                    )}
                  </div>
                  <div className="research-source-action">
                    {url && renderProspect?.(active, index)}
                    {!source.markdown ? (
                      <p>Sin texto recuperado para extraer datos.</p>
                    ) : !status.extractionEnabled && !proposal ? (
                      <p>Extracción no configurada en el servidor.</p>
                    ) : proposal ? (
                      <ExtractionReview
                        source={extractionSource}
                        proposal={proposal}
                        triggerLabel={
                          wasReviewed ? "Editar revisión" : "Revisar extracción"
                        }
                        confirmLabel="Añadir al estudio"
                        onPrepare={(seed) => {
                          const entry = seed.sources[sourceId];
                          if (entry.extraction)
                            entry.webReview = {
                              runId: active.id,
                              sourceIndex: index,
                              values: { ...entry.extraction.reviewed },
                              confirmed: true,
                            };
                          saveReview(sourceId, seed);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="button secondary"
                        disabled={isExtracting}
                        onClick={() => void extract(active, index)}
                      >
                        <FileSearch size={16} />
                        {isExtracting ? "Extrayendo datos…" : "Extraer datos"}
                      </button>
                    )}
                    {source.extractionStatus === "failed" &&
                      source.extractionError && (
                        <p className="notice error">{source.extractionError}</p>
                      )}
                    {isExtracting && (
                      <p className="field-hint">
                        La extracción está en curso o quedó interrumpida. No se
                        repetirá automáticamente; si persiste, requiere revisión
                        del operador.
                      </p>
                    )}
                    {wasReviewed && (
                      <small>Oferta revisada añadida a esta selección.</small>
                    )}
                    {!wasReviewed && reviewed.length >= 3 && proposal && (
                      <small>Ya seleccionaste el máximo de 3 ofertas.</small>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="reviewed-research">
          <strong>
            {reviewed.length}{" "}
            {reviewed.length === 1 ? "oferta revisada" : "ofertas revisadas"}
          </strong>
          <p>
            Las correcciones de esta selección se conservan al guardar la
            comparación. Las fuentes y extracciones ya permanecen en la
            investigación.
          </p>
          {reviewed.length > 1 && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={equivalent}
                onChange={(event) => setEquivalent(event.target.checked)}
              />
              Confirmo que corresponden al mismo insumo, especificación, unidad
              base y moneda
            </label>
          )}
          <button
            type="button"
            className="button primary"
            disabled={reviewed.length > 1 && !equivalent}
            onClick={compareReviewed}
          >
            Comparar ofertas revisadas
          </button>
          <small>
            La cantidad se indicará al preparar la compra; todavía no se
            muestran totales.
          </small>
        </div>
      )}
    </section>
  );
}

export default function LiveResearch(props: {
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      let stored = localStorage.getItem(SESSION_KEY);
      if (!stored || !/^[a-f0-9]{64}$/.test(stored)) {
        stored = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
        localStorage.setItem(SESSION_KEY, stored);
      }
      setToken(stored);
    } catch {
      setStorageError(true);
    }
  }, []);
  if (!token)
    return (
      <p className="notice info">
        {storageError
          ? "El navegador no permite conservar esta sesión. La investigación web requiere el almacenamiento del sitio."
          : "Preparando la sesión de investigación…"}
      </p>
    );
  return (
    <ResearchBoundary>
      <ConnectedResearch {...props} token={token} />
    </ResearchBoundary>
  );
}

function ConnectedResearch({
  token,
  ...props
}: {
  token: string;
  request: WebSearchRequest | null;
  onStatus: (status: ResearchStatus | undefined) => void;
  onPrepare: (seed: PurchaseSeed) => void;
}) {
  const status = useQuery(api.research.status, {});
  const runs = useQuery(api.research.list, { token });
  const search = useAction(api.research.search);
  const attempts = useRef(new Map<number, Promise<SavedResearch>>());
  const extract = useAction(api.research.extract);
  return (
    <>
      <ResearchWorkspace
        {...props}
        renderProspect={(run, index) => (
          <SaveWebProspect
            token={token}
            runId={run.id as Id<"researchRuns">}
            sourceIndex={index}
            title={run.sources[index].title}
            url={run.sources[index].url}
          />
        )}
        status={status}
        runs={runs}
        onSearch={(ingredient, region) => {
          const requestId = props.request?.id ?? 0;
          const existing = attempts.current.get(requestId);
          if (existing) return existing;
          const pending = search({
            token,
            clientId: crypto.randomUUID(),
            ingredient,
            region,
          });
          attempts.current.set(requestId, pending);
          return pending;
        }}
        onExtract={(runId, sourceIndex) =>
          extract({ token, runId: runId as Id<"researchRuns">, sourceIndex })
        }
      />
      <WebProspectLibrary token={token} onPrepare={props.onPrepare} />
    </>
  );
}

class ResearchBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="notice error" role="alert">
        La investigación web no está disponible. Los ejemplos siguen accesibles.
      </p>
    ) : (
      this.props.children
    );
  }
}

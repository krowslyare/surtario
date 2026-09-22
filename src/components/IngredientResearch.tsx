import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useConvexConnectionState } from "convex/react";
import { ConvexError } from "convex/values";
import { ArrowRight, Check, MapPin, Search } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { IntakeBatch } from "../intake/model";
import { useDemoSession } from "./useDemoSession";
import { Button } from "./ui/Button";
import "../styles/ingredient-research.css";
export const readableError = (error: unknown, fallback: string) =>
  error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
export default function IngredientResearch({
  batch,
  onStarted,
}: {
  batch: IntakeBatch;
  onStarted?: () => void;
}) {
  const { token } = useDemoSession();
  return token ? (
    <Selection batch={batch} token={token} onStarted={onStarted} />
  ) : (
    <p role="status">Preparing your research session…</p>
  );
}
function Selection({
  batch,
  token,
  onStarted,
}: {
  batch: IntakeBatch;
  token: string;
  onStarted?: () => void;
}) {
  const data = useQuery(api.ingredientBatches.list, { token });
  const create = useMutation(api.ingredientBatches.create);
  const connected = useConvexConnectionState().isWebSocketConnected;
  const [selected, setSelected] = useState(
    () => new Set(batch.rows.filter((r) => !r.needsReview).map((r) => r.id)),
  );
  const [region, setRegion] = useState("Portland, Oregon");
  const [title, setTitle] = useState("Kitchen ingredient list");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef({ fingerprint: "", id: crypto.randomUUID() });
  const [started, setStarted] = useState<Set<string>>(() => new Set());
  const currentBatch = useRef(batch);
  currentBatch.current = batch;
  useEffect(() => {
    setSelected(
      new Set(batch.rows.filter((r) => !r.needsReview).map((r) => r.id)),
    );
    setStarted(new Set());
    setBusy(false);
    setError("");
    request.current = { fingerprint: "", id: crypto.randomUUID() };
  }, [batch]);
  async function launch(ids: Set<string>) {
    if (busy) return;
    const rows = batch.rows
      .filter((r) => ids.has(r.id) && !started.has(r.id))
      .map((r) => ({
        id: r.id,
        ingredient: r.ingredient,
        ...(r.documentHash ? { documentHash: r.documentHash } : {}),
        original: r.original.join(" | ").slice(0, 2000),
        reference:
          r.reference ??
          `Row ${r.line}${batch.sheet ? ` · ${batch.sheet}` : ""}`,
        needsReview: !!r.needsReview,
      }));
    if (!rows.length) return;
    const fingerprint = JSON.stringify({ rows, region, title });
    if (request.current.fingerprint !== fingerprint)
      request.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await create({
        token,
        clientId: request.current.id,
        rows,
        region,
        title,
        sourceKind: batch.method,
      });
      if (currentBatch.current !== batch) return;
      const launched = new Set(rows.map((row) => row.id));
      setStarted((current) => new Set([...current, ...launched]));
      setSelected((current) => new Set([...current].filter((id) => !launched.has(id))));
      onStarted?.();
    } catch (cause) {
      if (currentBatch.current !== batch) return;
      setError(
        readableError(
          cause,
          "Starting was not confirmed. Retry the same selection to recover its saved progress.",
        ),
      );
    } finally {
      if (currentBatch.current === batch) setBusy(false);
    }
  }
  const remainingRows = batch.rows.filter((row) => !started.has(row.id));
  const unavailable = busy || !connected || !data?.enabled || data.busy;
  const overCapacity = !!data && selected.size > data.remaining;
  return (
    <div className="ingredient-selection">
      {started.size > 0 && (
        <p className="notice ingredient-started-notice" role="status">
          <Check size={18} />
          Your research is saved in Overview. {remainingRows.length
            ? `${remainingRows.length} ingredients remain in this list. ${data?.busy ? "Start them when the current research finishes." : "Choose which to research next."}`
            : "You can leave this page while it continues."}
        </p>
      )}
      <div className="ingredient-selection-heading">
        <p>
          Select what your kitchen needs. Open findings as soon as they arrive.
        </p>
        <span className="ingredient-count">{selected.size} selected</span>
      </div>
      <div className="ingredient-selection-tools">
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={busy || !remainingRows.length}
            checked={remainingRows.length > 0 && selected.size === remainingRows.length}
            onChange={(e) =>
              setSelected(
                new Set(e.target.checked ? remainingRows.map((r) => r.id) : []),
              )
            }
          />
          Select all
        </label>
        <span>
          {data
            ? `${data.remaining} research places available in this session`
            : "Checking capacity…"}
        </span>
      </div>
      <div className="ingredient-selection-rows">
        {batch.rows.map((row, index) => (
          <div className="ingredient-selection-row" key={row.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={busy || started.has(row.id)}
                checked={selected.has(row.id)}
                onChange={(e) =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (e.target.checked) next.add(row.id);
                    else next.delete(row.id);
                    return next;
                  })
                }
              />
              <span className="ingredient-row-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{row.ingredient}</strong>
            </label>
            {started.has(row.id) ? (
              <span className="ingredient-research-saved"><Check size={15} /> Research saved in Overview</span>
            ) : <Button
              variant="text"
              disabled={
                unavailable ||
                !data?.remaining ||
                !region.trim() ||
                !title.trim()
              }
              onClick={() => void launch(new Set([row.id]))}
            >
              Research this ingredient
              <ArrowRight size={15} />
            </Button>}
          </div>
        ))}
      </div>
      <div className="ingredient-research-settings">
        <label className="field">
          <span>List name</span>
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          <span>
            <MapPin size={14} />
            Delivery area for this list
          </span>
          <input
            value={region}
            maxLength={80}
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
      </div>
      <div className="ingredient-launch">
        <p>
          Two ingredients research at a time. Quantities in your source remain
          unconfirmed; no emails are sent.
        </p>
        <Button
          variant="primary"
          disabled={
            unavailable ||
            overCapacity ||
            !selected.size ||
            !region.trim() ||
            !title.trim()
          }
          onClick={() => void launch(selected)}
        >
          <Search size={17} />
          {busy ? "Starting research…" : `Research selected · ${selected.size}`}
        </Button>
      </div>
      {overCapacity && (
        <p className="notice warning">
          Select up to {data!.remaining} ingredients. Nothing will start until
          the whole selection fits.
        </p>
      )}
      {data?.busy && (
        <p className="field-hint">
          Your current research is still running. Follow it in Overview before
          starting the remaining ingredients.
        </p>
      )}
      {data && !data.enabled && (
        <p className="notice warning">
          Supplier research is not enabled on this server. Your reviewed list
          remains available.
        </p>
      )}
      {!connected && <p role="status">Reconnect to start research.</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
type BatchNextStep = { title: string; action: ReactNode };

export function IngredientBatchProgress({
  onOpen,
  visibleCaseIds,
  nextSteps,
}: {
  onOpen: (id: string, runId?: string) => void;
  visibleCaseIds?: string[];
  nextSteps?: Record<string, BatchNextStep>;
}) {
  const { token } = useDemoSession();
  return token ? (
    <Progress
      token={token}
      onOpen={onOpen}
      visibleCaseIds={visibleCaseIds}
      nextSteps={nextSteps}
    />
  ) : null;
}
function Progress({
  token,
  onOpen,
  visibleCaseIds,
  nextSteps,
}: {
  token: string;
  onOpen: (id: string, runId?: string) => void;
  visibleCaseIds?: string[];
  nextSteps?: Record<string, BatchNextStep>;
}) {
  const data = useQuery(api.ingredientBatches.list, { token });
  const stop = useMutation(api.sourcing.cancel),
    cancel = useMutation(api.ingredientBatches.cancelQueued),
    retry = useMutation(api.ingredientBatches.retry);
  const connected = useConvexConnectionState().isWebSocketConnected;
  const [pending, setPending] = useState<string | null>(null),
    [error, setError] = useState("");
  async function action(id: string, work: () => Promise<unknown>) {
    if (pending) return;
    setPending(id);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(
        readableError(
          cause,
          "That change was not confirmed. Reconnect and try again.",
        ),
      );
    } finally {
      setPending(null);
    }
  }
  if (!data?.batches.length) return null;
  return (
    <section
      id="ingredient-batches"
      className="ingredient-batches"
      aria-label="Ingredient list research"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">From your kitchen list</p>
          <h2>Every ingredient has its own progress.</h2>
        </div>
      </div>
      {visibleCaseIds?.length === 0 && (
        <p>No list ingredients match this view.</p>
      )}
      {data.batches
        .filter(
          (batch) =>
            !visibleCaseIds ||
            batch.rows.some((row) => visibleCaseIds.includes(row.caseId)),
        )
        .map((batch) => {
          const findings = batch.cases.filter((c) => c.sources > 0).length;
          const running = batch.rows.filter(
              (r) => r.state === "running",
            ).length,
            queued = batch.rows.filter((r) => r.state === "queued").length;
          return (
            <article className="ingredient-batch-card" key={batch.id}>
              <header>
                <div>
                  <h3>{batch.title}</h3>
                  <p>
                    {batch.region} · {batch.rows.length} ingredients
                  </p>
                </div>
                <p className="batch-summary" aria-live="polite">
                  {findings} with findings · {running} researching · {queued}{" "}
                  queued
                </p>
              </header>
              <div className="batch-progress-rows">
                {batch.rows
                  .filter(
                    (row) =>
                      !visibleCaseIds || visibleCaseIds.includes(row.caseId),
                  )
                  .map((row, index) => {
                    const c = batch.cases.find((c) => c.id === row.caseId);
                    if (!c) return null;
                    const nextStep = nextSteps?.[c.id];
                    const isQueued = row.state === "queued",
                      isRunning = c.status === "running";
                    const label = isQueued
                      ? "Queued"
                      : isRunning
                        ? (c.phase ?? "Researching")
                        : c.status === "canceled"
                          ? row.state === "running"
                            ? "Stopping · waiting for current request"
                            : "Stopped"
                          : c.status === "failed"
                            ? "Needs attention"
                            : c.sources
                              ? "Findings available"
                              : c.stopReason === "budget"
                                ? "Limit reached"
                                : "No usable sources";
                    return (
                      <div className="batch-progress-row" key={row.id}>
                        <span className="ingredient-row-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="batch-ingredient">
                          <strong>{c.ingredient}</strong>
                          <span
                            className={`batch-phase ${isRunning ? "is-running" : ""}`}
                          >
                            <i aria-hidden="true" />
                            {label}
                          </span>
                        </div>
                        <div className="batch-evidence">
                          {c.sources ? (
                            <>
                              <strong>
                                {c.sources} sources · {c.interpreted}{" "}
                                interpreted
                              </strong>
                            </>
                          ) : (
                            <span>
                              {isQueued
                                ? "Starts when a place becomes available"
                                : isRunning
                                  ? c.discoveryProgress
                                    ? `${c.discoveryProgress.candidates} candidates found · ${c.discoveryProgress.pagesChecked} pages checked this round`
                                    : "Waiting for the next saved checkpoint"
                                  : c.summary}
                            </span>
                          )}
                          {!isQueued && !isRunning && c.stopReason === "budget" && (
                            <span>Research stopped at the six-round limit. Coverage remains incomplete.</span>
                          )}
                          {!isQueued && (nextStep || c.sources > 0) && (
                            <span>
                              {nextStep?.title ??
                                "Review evidence before confirming offers"}
                            </span>
                          )}
                          <time dateTime={new Date(c.updatedAt).toISOString()}>
                            Updated{" "}
                            {new Date(c.updatedAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                        <div className="batch-row-actions">
                          {!isQueued &&
                            (nextStep?.action ?? (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  onOpen(
                                    c.id,
                                    c.sources
                                      ? c.researchRunIds.at(-1)
                                      : undefined,
                                  )
                                }
                              >
                                {c.sources
                                  ? "Review findings"
                                  : "View progress"}
                                <ArrowRight size={15} />
                              </Button>
                            ))}
                          {isQueued ? (
                            <Button
                              variant="text"
                              disabled={!connected || !!pending}
                              onClick={() =>
                                void action(c.id, () =>
                                  cancel({
                                    token,
                                    batchId: batch.id,
                                    caseId: c.id,
                                  }),
                                )
                              }
                            >
                              Cancel
                            </Button>
                          ) : isRunning ? (
                            <Button
                              variant="text"
                              disabled={!connected || !!pending}
                              onClick={() =>
                                void action(c.id, () =>
                                  stop({ token, caseId: c.id }),
                                )
                              }
                            >
                              Stop
                            </Button>
                          ) : row.state === "settled" &&
                            (c.status === "failed" ||
                              c.status === "canceled") &&
                            c.attempts < 3 ? (
                            <Button
                              variant="text"
                              disabled={!connected || !!pending}
                              onClick={() =>
                                void action(c.id, () =>
                                  retry({
                                    token,
                                    batchId: batch.id,
                                    caseId: c.id,
                                    attempt: c.attempts,
                                  }),
                                )
                              }
                            >
                              Retry ingredient
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <footer>
                Research completion is separate from reviewing offers or
                choosing a purchase. Stopping cannot undo provider requests
                already sent.
              </footer>
            </article>
          );
        })}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

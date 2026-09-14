import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { savedAdvisorRun } from "../../convex/advisorValidators";
import {
  analyzePurchase,
  type AdvisorContext,
  type AdvisorReport,
} from "../domain/advisor";
import type { ProcurementRequest, SupplierOffer } from "../domain/procurement";
import { parseCents, parseDecimal } from "../numbers";
export const defaultAdvisorContext: AdvisorContext = {
  priority: "balanced",
  budgetCents: null,
  dailyUsage: null,
  stockQuantity: null,
  maxCoverageDays: null,
  preferredOfferId: null,
};
export function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableValue(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function comparisonStateFingerprint(value: {
  request: ProcurementRequest;
  offers: SupplierOffer[];
  sources: Record<string, unknown>;
  selectedOfferId: string | null;
}) {
  return stableValue({
    request: value.request,
    offers: value.offers,
    sources: Object.fromEntries(
      value.offers.map((offer) => [
        offer.id,
        Object.hasOwn(value.sources, offer.id) ? value.sources[offer.id] : null,
      ]),
    ),
    selectedOfferId: value.selectedOfferId,
  });
}
type Run = typeof savedAdvisorRun.type;
function errorText(error: unknown) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "The operation was not confirmed. Keep the context and check your connection.";
}
export function AdvisorVerdict({ report }: { report: AdvisorReport }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [report.negotiationDraft]);
  return (
    <div className="advisor-verdict">
      <div className="advisor-decision-row advisor-decision-primary">
        <span>Recommended action</span>
        <p className="advisor-recommendation">{report.recommendation}</p>
      </div>
      <div className="advisor-decision-row">
        <span>Impact on this order</span>
        <p>{report.impact}</p>
      </div>
      <div className="advisor-decision-row advisor-decision-condition">
        <span>Decision condition</span>
        <p>{report.warning}</p>
      </div>
      {report.missing.length > 0 && (
        <details>
          <summary>Missing data</summary>
          <ul>
            {report.missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      )}
      {report.negotiationDraft && (
        <details className="advisor-negotiation">
          <summary>Prepare supplier conversation</summary>
          <pre className="quotation-text">{report.negotiationDraft}</pre>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(report.negotiationDraft!);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            Copy proposal
          </button>
          <p role="status">
            {copied
              ? "Text copied. No message was sent."
              : "Review the text before sending it through your usual channel."}
          </p>
        </details>
      )}
    </div>
  );
}
function ScenarioDetails({
  report,
  offers,
}: {
  report: AdvisorReport;
  offers: SupplierOffer[];
}) {
  return (
    <details className="advisor-alternatives">
      <summary>
        View cash outlay, coverage, and pending items by supplier
      </summary>
      <ul>
        {report.alternatives.map((alternative) => {
          const currency = offers.find(
            (offer) => offer.id === alternative.offerId,
          )?.currency;
          const total =
            alternative.totalCents !== null && currency
              ? new Intl.NumberFormat("es-PE", {
                  style: "currency",
                  currency,
                }).format(alternative.totalCents / 100)
              : "Pending";
          return (
            <li key={alternative.offerId}>
              <strong>{alternative.supplier}</strong>
              <p>
                Cash outlay: {total}. Coverage:{" "}
                {alternative.coverageDays === null
                  ? "pending"
                  : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(alternative.coverageDays)} days`}
                .
              </p>
              <p>
                {alternative.affordable === null
                  ? "Budget not evaluated."
                  : alternative.affordable
                    ? "Within the stated budget."
                    : "Exceeds the stated budget."}
              </p>
              {alternative.warnings.length > 0 && (
                <ul>
                  {alternative.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
export type AdvisorDecisionState = { context: AdvisorContext; invalid: boolean };

export default function PurchasingAdvisor(props: {
  onDecisionContext?: (state: AdvisorDecisionState) => void;
  comparisonId: Id<"comparisons"> | null;
  revision: number;
  request: ProcurementRequest;
  offers: SupplierOffer[];
  comparisonFingerprint: string;
  comparisonCurrent: boolean;
  canSaveComparison: boolean;
  saveBlockedReason: string | null;
  onSaveComparison: () => Promise<{
    id: Id<"comparisons">;
    revision: number;
  } | null>;
}) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem("procurement-demo-session-v1");
      if (value && /^[a-f0-9]{64}$/.test(value)) setToken(value);
    } catch {
      /* Session unavailable: calculation remains accessible. */
    }
  }, [props.comparisonId]);
  if (!token)
    return (
      <p className="field-hint">
        Save a comparison to keep the purchasing analysis.
      </p>
    );
  return <Connected {...props} token={token} />;
}
function Connected({
  comparisonId,
  revision,
  request,
  offers,
  token,
  comparisonFingerprint,
  comparisonCurrent,
  canSaveComparison,
  saveBlockedReason,
  onSaveComparison,
  onDecisionContext,
}: {
  onDecisionContext?: (state: AdvisorDecisionState) => void;
  comparisonId: Id<"comparisons"> | null;
  revision: number;
  request: ProcurementRequest;
  offers: SupplierOffer[];
  token: string;
  comparisonFingerprint: string;
  comparisonCurrent: boolean;
  canSaveComparison: boolean;
  saveBlockedReason: string | null;
  onSaveComparison: () => Promise<{
    id: Id<"comparisons">;
    revision: number;
  } | null>;
}) {
  const enabled = useQuery(api.advisor.status, {});
  const runs = useQuery(
    api.advisor.list,
    comparisonId ? { token, comparisonId } : "skip",
  );
  const prepare = useMutation(api.advisor.prepare),
    explain = useAction(api.advisor.explain);
  const [context, setContext] = useState<AdvisorContext>({
    ...defaultAdvisorContext,
  });
  const [active, setActive] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [raw, setRaw] = useState<Record<string, string>>({});
  const pending = useRef<{ key: string; clientId: string } | null>(null);
  const mounted = useRef(true);
  const attempt = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
    };
  }, []);
  const matchesCurrent = (run: Run) =>
    comparisonCurrent &&
    run.comparisonRevision === revision &&
    comparisonFingerprint ===
      comparisonStateFingerprint({
        request: run.snapshot.request,
        offers: run.snapshot.offers,
        sources: run.snapshot.sources,
        selectedOfferId: run.snapshot.selectedOfferId,
      }) &&
    stableValue(context) === stableValue(run.context);
  const persistedActive = active && runs?.find((run) => run.id === active.id);
  const matchingPersisted = runs?.find(matchesCurrent);
  const selected =
    matchingPersisted ??
    (active && matchesCurrent(active) ? (persistedActive ?? active) : null) ??
    persistedActive ??
    active ??
    runs?.[0] ??
    null;
  const stale = !!selected && !matchesCurrent(selected);
  const invalid = Object.entries(raw).some(([k, value]) => {
    const n = k === "budgetCents" ? parseCents(value) : parseDecimal(value);
    return (
      value.trim() !== "" &&
      (n === null ||
        !Number.isFinite(n) ||
        n < 0 ||
        n > 1_000_000_000 ||
        ((k === "dailyUsage" || k === "maxCoverageDays") && n === 0))
    );
  });
  useEffect(() => {
    onDecisionContext?.({ context, invalid });
  }, [context, invalid, onDecisionContext]);
  const validRequestQuantity =
    Number.isFinite(request.quantity) && request.quantity > 0;
  const report = analyzePurchase(request, offers, context);
  const flowKey = stableValue({ comparisonFingerprint, context });
  const currentFlowKey = useRef(flowKey);
  currentFlowKey.current = flowKey;
  function updateNumber(
    key: "budgetCents" | "dailyUsage" | "stockQuantity" | "maxCoverageDays",
    value: string,
  ) {
    setRaw({ ...raw, [key]: value });
    const parsed =
      key === "budgetCents" ? parseCents(value) : parseDecimal(value);
    setContext({ ...context, [key]: parsed === null ? null : parsed });
  }
  async function saveScenario(
    target: Id<"comparisons">,
    targetRevision: number,
  ) {
    const key = stableValue({
      comparisonId: target,
      revision: targetRevision,
      comparisonFingerprint,
      context,
    });
    if (pending.current?.key !== key)
      pending.current = { key, clientId: crypto.randomUUID() };
    return await prepare({
      token,
      comparisonId: target,
      expectedRevision: targetRevision,
      clientId: pending.current.clientId,
      context,
    });
  }
  async function progress() {
    if (
      busy ||
      invalid ||
      !validRequestQuantity ||
      enabled === undefined ||
      (comparisonCurrent && comparisonId !== null && runs === undefined)
    )
      return;
    const attemptId = ++attempt.current;
    const startedWith = currentFlowKey.current;
    const isCurrentAttempt = () =>
      mounted.current &&
      attempt.current === attemptId &&
      currentFlowKey.current === startedWith;
    const reportChangedFlow = () => {
      if (mounted.current && attempt.current === attemptId)
        setError(
          "The data changed during the operation. The confirmed version keeps its own state; continue again after you finish editing.",
        );
    };
    setBusy(true);
    setError("");
    try {
      let targetId = comparisonId;
      let targetRevision = revision;
      if (!comparisonCurrent) {
        if (!canSaveComparison) return;
        const saved = await onSaveComparison();
        if (!isCurrentAttempt()) {
          reportChangedFlow();
          return;
        }
        if (!saved) {
          setError(
            "Saving the comparison was not confirmed. Keep the data and try again.",
          );
          return;
        }
        targetId = saved.id;
        targetRevision = saved.revision;
      }
      if (!targetId) return;
      let run =
        selected &&
        !stale &&
        selected.comparisonId === targetId &&
        selected.comparisonRevision === targetRevision
          ? selected
          : await saveScenario(targetId, targetRevision);
      if (!isCurrentAttempt()) {
        reportChangedFlow();
        return;
      }
      setActive(run);
      if (enabled === true && run.status === "calculated") {
        run = await explain({ token, id: run.id });
        if (!isCurrentAttempt()) {
          reportChangedFlow();
          return;
        }
        setActive(run);
      }
    } catch (e) {
      if (mounted.current && attempt.current === attemptId)
        setError(errorText(e));
    } finally {
      if (mounted.current && attempt.current === attemptId) setBusy(false);
    }
  }
  const displayedReport = selected && !stale ? selected.report : report;
  const actionAvailable =
    !selected ||
    stale ||
    (selected.status === "calculated" && enabled === true);
  const actionLabel = busy
    ? enabled === true
      ? "Saving and analyzing…"
      : "Saving scenario…"
    : enabled === undefined
      ? "Checking advisor…"
      : !comparisonCurrent
        ? enabled
          ? "Save comparison and request AI analysis"
          : "Save comparison and scenario"
        : selected && !stale && selected.status === "calculated" && enabled
          ? "Request AI analysis"
          : enabled
            ? "Save scenario and request AI analysis"
            : "Save scenario";
  return (
    <section className="advisor-panel" aria-label="Purchasing advisor">
      <div className="advisor-heading">
        <div>
          <h2>What should you do next?</h2>
          <p className="field-hint">
            Compare the cash outlay with your priorities. Selecting or copying a
            recommendation does not place an order.
          </p>
        </div>
      </div>
      <details className="advisor-context">
        <summary>Decision context · optional</summary>
        <div className="advisor-fields">
          <label className="field">
            Priority
            <select
              value={context.priority}
              onChange={(e) =>
                setContext({
                  ...context,
                  priority: e.target.value as AdvisorContext["priority"],
                })
              }
            >
              <option value="balanced">
                Balance cash outlay and unit price
              </option>
              <option value="cash">Preserve cash</option>
              <option value="unit_price">Lowest unit price</option>
            </select>
          </label>
          <label className="field">
            Preferred supplier
            <select
              value={context.preferredOfferId ?? ""}
              onChange={(e) =>
                setContext({
                  ...context,
                  preferredOfferId: e.target.value || null,
                })
              }
            >
              <option value="">Not set</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.supplier}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              [
                "budgetCents",
                `Available budget (${offers[0]?.currency ?? "PEN"})`,
              ],
              ["dailyUsage", `Confirmed daily usage (${request.unit})`],
              ["stockQuantity", `Confirmed current stock (${request.unit})`],
              ["maxCoverageDays", "Maximum coverage days"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                inputMode="decimal"
                value={
                  raw[key] ??
                  (context[key] === null
                    ? ""
                    : String(
                        key === "budgetCents"
                          ? context[key] / 100
                          : context[key],
                      ))
                }
                onChange={(e) => updateNumber(key, e.target.value)}
                placeholder="Not entered"
              />
            </label>
          ))}
        </div>
        <p className="field-hint">
          Coverage is estimated from your constant usage; it is not a forecast.
          Leaving inventory blank does not mean zero. This does not calculate
          credit or financing costs.
        </p>
      </details>
      {invalid ? (
        <p role="alert" className="notice error">
          Review the context values before analyzing. The result will appear
          again after you correct them.
        </p>
      ) : (
        <>
          <p className="advisor-mode">
            {selected && !stale
              ? selected.narrative
                ? "Scenario saved and interpreted with its sources"
                : "Scenario saved with a verifiable calculation"
              : "Scenario calculated from the visible data"}
          </p>
          <AdvisorVerdict report={displayedReport} />
          <ScenarioDetails
            report={displayedReport}
            offers={selected && !stale ? selected.snapshot.offers : offers}
          />
        </>
      )}
      {selected && stale && (
        <>
          <p role="status" className="notice info">
            The saved analysis is out of date for this view. The next action
            will save the visible comparison and prepare a new scenario.
          </p>
          <details className="advisor-stale-evidence">
            <summary>View the previous saved analysis</summary>
            <AdvisorVerdict report={selected.report} />
            <ScenarioDetails
              report={selected.report}
              offers={selected.snapshot.offers}
            />
          </details>
        </>
      )}
      {actionAvailable && (
        <div className="advisor-actions">
          <button
            className="button primary"
            disabled={
              busy ||
              invalid ||
              !validRequestQuantity ||
              enabled === undefined ||
              (!comparisonCurrent && !canSaveComparison) ||
              (comparisonCurrent && comparisonId !== null && runs === undefined)
            }
            onClick={progress}
          >
            {actionLabel}
          </button>
        </div>
      )}
      {actionAvailable && (
        <p className="field-hint advisor-action-hint">
          {saveBlockedReason
            ? saveBlockedReason
            : enabled === false
              ? "AI is not configured; the deterministic calculation and its sources will be saved."
              : "One action saves the comparison and context before requesting AI analysis. It does not send messages or record a purchase."}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {selected && (
        <div className="advisor-saved">
          {selected.status === "running" && (
            <p role="status">
              The advisor is reviewing the scenarios and their sources…
            </p>
          )}
          {selected.error && !stale && <p role="alert">{selected.error}</p>}
          {selected.narrative && !stale && (
            <>
              <h3>AI interpretation</h3>
              <p>{selected.narrative.reasoning}</p>
              <ul>
                {selected.narrative.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <details>
                <summary>Sources reviewed</summary>
                <ul>
                  {selected.narrative.sourceIds.map((id) => (
                    <li key={id}>
                      {selected.snapshot.sources[id].label} ·{" "}
                      {selected.snapshot.sources[id].date || "Date pending"}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {selected.status === "calculated" && (
            <p className="field-hint">
              Calculation saved. AI analysis was not run.
            </p>
          )}
        </div>
      )}
      {!!runs?.length && (
        <details>
          <summary>Restore scenarios ({runs.length})</summary>
          {runs.map((run) => (
            <button
              key={run.id}
              className="button text-button"
              onClick={() => {
                setActive(run);
                setContext(run.context);
                setRaw({});
              }}
            >
              Scenario {new Date(run.createdAt).toLocaleString("en-US")} ·{" "}
              {run.context.priority === "cash"
                ? "Cash"
                : run.context.priority === "unit_price"
                  ? "Unit price"
                  : "Balanced"}
            </button>
          ))}
        </details>
      )}
    </section>
  );
}

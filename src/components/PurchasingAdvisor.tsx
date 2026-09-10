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
    : "No se confirmó la operación. Conserva el contexto y revisa la conexión.";
}
export function AdvisorVerdict({ report }: { report: AdvisorReport }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [report.negotiationDraft]);
  return (
    <div className="advisor-verdict">
      <div className="advisor-decision-row advisor-decision-primary">
        <span>Qué haría</span>
        <p className="advisor-recommendation">{report.recommendation}</p>
      </div>
      <div className="advisor-decision-row">
        <span>Impacto en este pedido</span>
        <p>{report.impact}</p>
      </div>
      <div className="advisor-decision-row advisor-decision-condition">
        <span>Condición para decidir</span>
        <p>{report.warning}</p>
      </div>
      {report.missing.length > 0 && (
        <details>
          <summary>Datos que faltan</summary>
          <ul>
            {report.missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      )}
      {report.negotiationDraft && (
        <details className="advisor-negotiation">
          <summary>Preparar conversación con mi proveedor</summary>
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
            Copiar propuesta
          </button>
          <p role="status">
            {copied
              ? "Texto copiado. No se envió ningún mensaje."
              : "Revisa el texto antes de enviarlo por tu canal habitual."}
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
      <summary>Ver caja, cobertura y pendientes por proveedor</summary>
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
              : "Pendiente";
          return (
            <li key={alternative.offerId}>
              <strong>{alternative.supplier}</strong>
              <p>
                Desembolso: {total}. Cobertura:{" "}
                {alternative.coverageDays === null
                  ? "pendiente"
                  : `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(alternative.coverageDays)} días`}
                .
              </p>
              <p>
                {alternative.affordable === null
                  ? "Presupuesto sin evaluar."
                  : alternative.affordable
                    ? "Dentro del presupuesto indicado."
                    : "Supera el presupuesto indicado."}
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
export default function PurchasingAdvisor(props: {
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
        Guarda una comparación para conservar el análisis de compras.
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
}: {
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
    (active && matchesCurrent(active) ? persistedActive ?? active : null) ??
    persistedActive ??
    active ??
    runs?.[0] ??
    null;
  const stale =
    !!selected && !matchesCurrent(selected);
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
          "Los datos cambiaron durante la operación. La versión confirmada conserva su propio estado; vuelve a continuar cuando termines de editar.",
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
            "No se confirmó el guardado de la comparación. Conserva los datos y vuelve a intentar.",
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
      ? "Guardando y analizando…"
      : "Guardando escenario…"
    : enabled === undefined
      ? "Comprobando asesor…"
      : !comparisonCurrent
        ? enabled
          ? "Guardar comparación y pedir análisis de IA"
          : "Guardar comparación y escenario"
        : selected && !stale && selected.status === "calculated" && enabled
          ? "Pedir análisis de IA"
          : enabled
            ? "Guardar escenario y pedir análisis de IA"
            : "Guardar escenario";
  return (
    <section className="advisor-panel" aria-label="Asesor de compras">
      <div className="advisor-heading">
        <div>
          <h2>¿Qué conviene hacer ahora?</h2>
          <p className="field-hint">
            Contrasta el desembolso con tus prioridades. Elegir o copiar una
            propuesta no realiza una compra.
          </p>
        </div>
      </div>
      <details className="advisor-context">
        <summary>Contexto de mi decisión · opcional</summary>
        <div className="advisor-fields">
          <label className="field">
            Prioridad
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
                Equilibrar desembolso y precio unitario
              </option>
              <option value="cash">Cuidar caja</option>
              <option value="unit_price">Menor precio por unidad</option>
            </select>
          </label>
          <label className="field">
            Proveedor habitual
            <select
              value={context.preferredOfferId ?? ""}
              onChange={(e) =>
                setContext({
                  ...context,
                  preferredOfferId: e.target.value || null,
                })
              }
            >
              <option value="">Sin definir</option>
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
                `Presupuesto disponible (${offers[0]?.currency ?? "PEN"})`,
              ],
              ["dailyUsage", `Consumo diario confirmado (${request.unit})`],
              ["stockQuantity", `Stock actual confirmado (${request.unit})`],
              ["maxCoverageDays", "Máximo de días de cobertura"],
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
                placeholder="Sin indicar"
              />
            </label>
          ))}
        </div>
        <p className="field-hint">
          Cobertura estimada con tu consumo constante, no una predicción. Dejar
          stock vacío no equivale a cero. No calcula crédito ni costos
          financieros.
        </p>
      </details>
      {invalid ? (
        <p role="alert" className="notice error">
          Revisa los números del contexto antes de analizar. El resultado se
          mostrará de nuevo cuando los corrijas.
        </p>
      ) : (
        <>
          <p className="advisor-mode">
            {selected && !stale
              ? selected.narrative
                ? "Escenario guardado e interpretado con sus fuentes"
                : "Escenario guardado con cálculo verificable"
              : "Escenario calculado con los datos visibles"}
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
            El análisis guardado está desactualizado respecto a esta vista. La
            acción siguiente guardará la comparación visible y preparará un
            escenario nuevo.
          </p>
          <details className="advisor-stale-evidence">
            <summary>Ver el análisis guardado anterior</summary>
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
              ? "La IA no está configurada; guardarás el cálculo determinista y sus fuentes."
              : "Una sola acción conserva la comparación y el contexto antes de consultar la IA. No envía mensajes ni registra una compra."}
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
              El asesor está consultando los escenarios y sus fuentes…
            </p>
          )}
          {selected.error && !stale && <p role="alert">{selected.error}</p>}
          {selected.narrative && !stale && (
            <>
              <h3>Interpretación de IA</h3>
              <p>{selected.narrative.reasoning}</p>
              <ul>
                {selected.narrative.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <details>
                <summary>Fuentes consultadas</summary>
                <ul>
                  {selected.narrative.sourceIds.map((id) => (
                    <li key={id}>
                      {selected.snapshot.sources[id].label} ·{" "}
                      {selected.snapshot.sources[id].date || "Fecha pendiente"}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          {selected.status === "calculated" && (
            <p className="field-hint">
              Cálculo guardado. No se ha ejecutado el análisis de IA.
            </p>
          )}
        </div>
      )}
      {!!runs?.length && (
        <details>
          <summary>Recuperar escenarios ({runs.length})</summary>
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
              Escenario {new Date(run.createdAt).toLocaleString("es-PE")} ·{" "}
              {run.context.priority === "cash"
                ? "Caja"
                : run.context.priority === "unit_price"
                  ? "Precio por unidad"
                  : "Equilibrio"}
            </button>
          ))}
        </details>
      )}
    </section>
  );
}

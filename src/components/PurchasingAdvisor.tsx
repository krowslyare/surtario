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
      <p className="advisor-recommendation">{report.recommendation}</p>
      <p>
        <strong>Impacto en este pedido.</strong> {report.impact}
      </p>
      <p className="field-hint">
        <strong>Antes de decidir.</strong> {report.warning}
      </p>
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
}: {
  comparisonId: Id<"comparisons"> | null;
  revision: number;
  request: ProcurementRequest;
  offers: SupplierOffer[];
  token: string;
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
  const currentComparison = useRef(comparisonId);
  currentComparison.current = comparisonId;
  useEffect(() => {
    setActive(null);
    setContext({ ...defaultAdvisorContext });
    setRaw({});
    setError("");
    pending.current = null;
  }, [comparisonId]);
  const persisted = active && runs?.find((run) => run.id === active.id);
  const selected =
    persisted && persisted.status !== "calculated" ? persisted : active;
  const sameDraft = (run: Run) =>
    stableValue({ request, offers }) ===
    stableValue({ request: run.snapshot.request, offers: run.snapshot.offers });
  const stale =
    !!selected &&
    (selected.comparisonRevision !== revision ||
      !sameDraft(selected) ||
      stableValue(context) !== stableValue(selected.context));
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
  const report = analyzePurchase(request, offers, context);
  function updateNumber(
    key: "budgetCents" | "dailyUsage" | "stockQuantity" | "maxCoverageDays",
    value: string,
  ) {
    setRaw({ ...raw, [key]: value });
    const parsed =
      key === "budgetCents" ? parseCents(value) : parseDecimal(value);
    setContext({ ...context, [key]: parsed === null ? null : parsed });
  }
  async function saveScenario() {
    if (!comparisonId || busy || invalid) return;
    const target = comparisonId,
      key = stableValue({ comparisonId, revision, context });
    if (pending.current?.key !== key)
      pending.current = { key, clientId: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const run = await prepare({
        token,
        comparisonId,
        expectedRevision: revision,
        clientId: pending.current.clientId,
        context,
      });
      if (currentComparison.current === target) setActive(run);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function ask() {
    if (!selected || stale || busy) return;
    const target = comparisonId;
    setBusy(true);
    setError("");
    try {
      const run = await explain({ token, id: selected.id });
      if (currentComparison.current === target) setActive(run);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
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
        <span className="demo-badge">Asesor de compras</span>
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
        <p role="alert">Revisa los números del contexto antes de analizar.</p>
      ) : (
        <>
          <p className="advisor-mode">
            Escenario calculado con los datos visibles
          </p>
          <AdvisorVerdict report={report} />
          <ScenarioDetails report={report} offers={offers} />
        </>
      )}
      <div className="advisor-actions">
        <button
          className="button secondary"
          disabled={!comparisonId || busy || invalid}
          onClick={saveScenario}
        >
          {busy ? "Procesando…" : "Guardar escenario"}
        </button>
        <button
          className="button primary"
          disabled={
            invalid ||
            !enabled ||
            !selected ||
            stale ||
            busy ||
            selected.status !== "calculated"
          }
          onClick={ask}
        >
          Pedir análisis de IA
        </button>
      </div>
      <p className="field-hint">
        {!comparisonId
          ? "Guarda primero la comparación y sus condiciones."
          : "El análisis conserva la versión guardada de la comparación. Guarda tus cambios antes de crear un escenario."}{" "}
        {enabled === false &&
          "IA sin configurar; los cálculos siguen disponibles."}
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {selected && (
        <div className="advisor-saved">
          <h3>Análisis guardado</h3>
          {stale && (
            <p role="status" className="notice info">
              Desactualizado respecto a la vista actual. Guarda la comparación y
              prepara un nuevo escenario.
            </p>
          )}
          <AdvisorVerdict report={selected.report} />
          <ScenarioDetails
            report={selected.report}
            offers={selected.snapshot.offers}
          />
          {selected.status === "running" && (
            <p role="status">
              El asesor está consultando los escenarios y sus fuentes…
            </p>
          )}
          {selected.error && <p role="alert">{selected.error}</p>}
          {selected.narrative && (
            <>
              <p className="advisor-mode">
                Análisis de IA · revisa la interpretación antes de actuar
              </p>
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

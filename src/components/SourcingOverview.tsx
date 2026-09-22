import IngredientIntake from "./IngredientIntake";
import { IngredientBatchProgress } from "./IngredientResearch";
import { Component, useMemo, useRef, useState, type ReactNode } from "react";
import { useAction, useConvex, useConvexConnectionState, useQueries, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { ArrowRight, Check, ClipboardCheck, RefreshCw, Search } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useDemoSession } from "./useDemoSession";
import { hasObservedChanges, workStatus } from "../domain/workStatus";
import { Button } from "./ui/Button";
import { Dialog } from "./Dialog";
import { Select } from "./ui/Select";
import "../styles/overview.css";

export type OverviewItem = FunctionReturnType<typeof api.overview.list>["items"][number];
type Run = FunctionReturnType<typeof api.overview.research>;
type Target = "work" | "mail" | "comparison" | "evidence" | "research";
type OpenData = { study?: import("./SavedStudies").SavedStudy; comparison?: import("./SavedComparisons").SavedComparison };
type Props = { onOpenCase: (id: string, runId?: string) => void; onResearch: () => void; onOpen: (item: OverviewItem, target: Target, requestId?: string, runId?: string, saved?: OpenData) => Promise<void> | void };

type OverviewData = Omit<NonNullable<FunctionReturnType<typeof api.overview.list>>, "items"> & {
  items: (OverviewItem & {
    next: ReturnType<typeof workStatus>;
    latest?: Run;
    active?: Run;
    pendingRun?: Run;
    refresh?: Run;
    newSources: number;
    changedSources: number;
    suppliers: string[];
    updatedAt: number;
    retained: number;
    interpreted: number;
  })[];
};

function useOverview(token: string): OverviewData | undefined {
  const cached = useRef<OverviewData | undefined>(undefined);
  const cachedToken = useRef(token);
  if (cachedToken.current !== token) {
    cachedToken.current = token;
    cached.current = undefined;
  }
  const data = useQuery(api.overview.list, { token });
  const queries = useMemo(() => {
    const known = new Set(data?.quickRuns.map(run => run.id));
    const ids = [...new Set(data?.items.flatMap(item => item.runIds) ?? [])].filter(id => !known.has(id));
    return Object.fromEntries(ids.map(runId => [runId, { query: api.overview.research, args: { token, runId } }]));
  }, [data, token]);
  const research = useQueries(queries);
  const values = Object.values(research) as (Run | Error | undefined)[];
  const failed = values.find(value => value instanceof Error);
  if (failed instanceof Error) throw failed;
  if (!data || values.some(value => !value)) return cached.current;
  const runs = [...data.quickRuns, ...values as Run[]];
  const items = data.items.map(item => {
    const related = runs.filter(run => item.runIds.includes(run.id));
    const pending = related.filter(run => !run.reviewed).flatMap(run => run.sources.filter(source => source.reviewable && !item.reviewedSourceIds.includes(source.id)));
    const pendingRun = related.find(run => !run.reviewed && run.sources.some(source => pending.some(p => p.id === source.id)));
    const latest = [...related].sort((a, b) => b.createdAt - a.createdAt)[0];
    const refresh = latest?.studyId ? latest : undefined;
    const knownUrls = new Set([...item.baselineSources.map(source => source.url), ...related.filter(run => run.id !== refresh?.id).flatMap(run => run.sources.map(source => source.url))]);
    const newSources = refresh?.sources.filter(source => !knownUrls.has(source.url)).length ?? 0;
    const changedSources = refresh?.sources.filter(source => source.values && item.baselineSources.some(previous => previous.url === source.url && hasObservedChanges(previous.baseline, source.values!))).length ?? 0;
    const active = related.find(run => run.status === "running");
    const status = workStatus({ requests: item.requests, reviewedReplyIds: item.reviewedReplyIds, blocker: item.blocker,
      pendingEvidence: pending.length, running: item.status === "running" || Boolean(active),
      failed: item.status === "failed" || item.status === "canceled" || latest?.status === "failed", hasComparison: Boolean(item.comparisonId) });
    if (status.target === "work") {
      if (item.kind === "search") status.action = "Review sources";
      else if (item.kind === "study") status.action = "Open study";
      else if (item.kind === "case") status.action = "Open research question";
    }
    return { ...item, next: status, latest, active, pendingRun, refresh, newSources, changedSources,
      suppliers: [...new Set([...item.suppliers, ...related.flatMap(run => run.sources.flatMap(source => source.supplier ? [source.supplier] : []))])],
      updatedAt: Math.max(item.updatedAt, ...related.map(run => run.createdAt)),
      retained: new Set(related.flatMap(run => run.sources.map(source => source.url))).size,
      interpreted: related.reduce((sum, run) => sum + run.interpreted, 0),
    };
  });
  const result: OverviewData = { ...data, items };
  cached.current = result;
  return result;
}

type Work = NonNullable<ReturnType<typeof useOverview>>["items"][number];
type Filter = "all" | "attention" | "researching" | "waiting";

export default function SourcingOverview(props: Props) {
  const { token, error } = useDemoSession();
  return <main id="overview-main" className="overview-main">
    <div className="overview-heading"><div><p className="eyebrow">Sourcing overview</p><h1 tabIndex={-1}>Your sourcing workspace</h1></div>
      <Button variant="primary" onClick={props.onResearch}><Search size={18} />Research an ingredient</Button></div>
    {error ? <p role="alert">Site storage is unavailable. Saved work cannot be recovered.</p> : !token ? <p role="status">Loading your work…</p> :
      <div className="overview-list-entry"><IngredientIntake persistenceEnabled activeIngredient={null} onExplore={props.onResearch} /></div> }
    {!error && token && <OverviewBoundary><Connected {...props} token={token} /></OverviewBoundary>}
  </main>;
}

function Connected({ token, ...props }: Props & { token: string }) {
  const convex = useConvex();
  const data = useOverview(token);
  const connected = useConvexConnectionState().isWebSocketConnected;
  const availability = useQuery(api.research.status, {});
  const refresh = useAction(api.research.search);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("priority");
  const order = useRef<string[]>([]);
  const [, rerender] = useState(0);
  const [refreshItem, setRefreshItem] = useState<Work | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  if (!data) return <><p role="status">Loading your work and next steps…</p>{!connected && <p role="status">Connecting to your saved workspace…</p>}</>;
  const { items, outcomes } = data;
  const attention = items.filter(item => item.next.attention);
  const researching = items.filter(item => item.next.researching);
  const waiting = items.filter(item => item.next.waiting);
  const sorted = [...items].sort((a, b) => sort === "recent" ? b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)
    : a.next.rank - b.next.rank || a.updatedAt - b.updatedAt || a.id.localeCompare(b.id));
  const desired = sorted.map(item => item.id);
  if (!order.current.length) order.current = desired;
  const orderedIds = [...order.current.filter(id => desired.includes(id)), ...desired.filter(id => !order.current.includes(id))];
  const ordered = orderedIds.map(id => items.find(item => item.id === id)!);
  const changed = desired.join() !== orderedIds.join();
  const matches = (item: Work) => (filter === "all" || (filter === "attention" ? item.next.attention : filter === "researching" ? item.next.researching : item.next.waiting)) &&
    `${item.ingredient} ${item.region} ${item.suppliers.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase());
  const matching = ordered.filter(matches);
  const visible = matching.filter(item => !item.batchId);
  const standalone = ordered.filter(item => !item.batchId);
  const standaloneAttention = standalone.filter(item => item.next.attention);
  const chooseFilter = (value: Filter) => { setFilter(current => current === value ? "all" : value); (document.getElementById("overview-work") ?? document.getElementById("ingredient-batches"))?.scrollIntoView({ behavior: "instant", block: "start" }); };
  async function open(item: Work, target: Target = item.next.target, requestId?: string) {
    if (opening) return;
    setOpening(item.id); setError("");
    try {
      const saved: OpenData = {};
      if (target === "comparison" || (target === "work" && !item.caseId && item.comparisonId)) {
        saved.comparison = (await convex.query(api.comparisons.list, { token })).find(row => row.id === item.comparisonId);
        if (!saved.comparison) throw new Error("Comparison unavailable");
      } else if (item.studyId && !item.caseId) {
        saved.study = (await convex.query(api.studies.list, { token })).find(row => row.id === item.studyId);
        if (!saved.study) throw new Error("Study unavailable");
      }
      await props.onOpen(item, target, requestId ?? ("requestId" in item.next ? item.next.requestId : undefined),
      (target === "evidence" ? item.pendingRun : item.active ?? item.latest)?.id, saved); }
    catch { setError("This work could not be opened. Your saved evidence is preserved; check your connection and try again."); }
    finally { setOpening(null); }
  }
  const action = (item: Work) => <Button variant="secondary" disabled={Boolean(opening)} onClick={() => void open(item)}>{opening === item.id ? "Opening…" : item.next.action}<ArrowRight size={16} /></Button>;
  return <>
    <p className="overview-summary" aria-live="polite">{attention.length ? `${attention.length} ${attention.length === 1 ? "work item needs" : "work items need"} your attention.` : items.length ? "No reviews are waiting in your saved work." : "Your next sourcing decision starts here."} {researching.length > 0 && `${researching.length} ${researching.length === 1 ? "research task is" : "research tasks are"} in progress.`}</p>
    {!connected && <p className="notice warning" role="status">Connection interrupted. Showing the last received state; updates will resume when connected.</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <div className="overview-counts" aria-label="Filter sourcing work">
      {([["attention", "Needs your attention", attention.length], ["researching", "Research in progress", researching.length], ["waiting", "Waiting for suppliers", waiting.length]] as const).map(([value, label, count]) =>
        <button key={value} aria-pressed={filter === value} onClick={() => chooseFilter(value)}><strong>{count}</strong><span>{label}</span><ArrowRight size={18} /></button>)}
    </div>
    <IngredientBatchProgress nextSteps={Object.fromEntries(items.filter(item => item.batchId && item.caseId).map(item => [item.caseId!, { title: item.next.title, action: action(item) }]))} onOpen={props.onOpenCase} visibleCaseIds={filter === "all" && !search ? undefined : matching.flatMap(item => item.caseId ? [item.caseId] : [])} />
    {filter !== "all" && !standalone.length && <div className="overview-filter-reset"><Button variant="text" onClick={() => setFilter("all")}>Show all work</Button></div>}
    {data.limited && <p className="notice warning" role="status">Recent work only: this session exceeds the overview’s supported record limit.</p>}
    {!items.length ? <section className="overview-empty"><img src="/brand/surtario-symbol.svg" alt="" width="64" height="64" /><h2>Start with what your kitchen needs.</h2><p>Research an ingredient and delivery area. Your saved studies, supplier conversations and decisions will come together here.</p><Button variant="secondary" onClick={props.onResearch}>Explore suppliers<ArrowRight size={16} /></Button></section> : <>
      {standalone.length > 0 && <div className={`overview-priorities ${standalone.some(item => item.next.researching) ? "has-research" : ""}`}>
        <section aria-labelledby="attention-title"><div className="overview-section-title"><div><h2 id="attention-title">Needs your attention</h2><p>Review what’s holding up your next step.</p></div>{standaloneAttention.length > 3 && <Button variant="text" onClick={() => chooseFilter("attention")}>See all {standaloneAttention.length}</Button>}</div>
          {standaloneAttention.length ? <ul className="overview-attention">{standaloneAttention.slice(0, 3).map(item => <li key={item.id}>
            <p className="overview-ingredient">{item.ingredient}<span>{item.region}</span></p><div className="overview-attention-detail"><h3>{item.next.title}</h3><p>{item.next.description}</p></div>{action(item)}
          </li>)}</ul> : <p className="overview-clear"><Check size={20} />{attention.length ? "List ingredients needing attention are shown above." : "No reviews are waiting. Continue any saved work below."}</p>}
        </section>
        {researching.some(item => !item.batchId) && <section className="overview-research" aria-labelledby="research-title"><h2 id="research-title">Research in progress</h2>
          {researching.filter(item => !item.batchId).map(item => <article key={item.id}><h3>{item.ingredient}</h3><p>{item.region}</p><p>{item.active ? ({ searching: "Finding public sources", reading: "Reading product pages", reviewing: "Interpreting source evidence" }[item.active.stage] ?? "Research in progress") : "Investigating this question"}</p>
            {item.status === "running" && item.caseId && <p>Round {Math.min(item.steps + 1, 6)} of up to 6</p>}<p>{item.active?.retained ?? item.retained} sources retained · {item.active?.interpreted ?? item.interpreted} interpretations</p><Button variant="text" onClick={() => void open(item, "research")}>Open research<ArrowRight size={16} /></Button></article>)}
        </section>}
      </div>}
      {items.some(item => !item.batchId) && <section id="overview-work" aria-labelledby="work-title"><div className="overview-section-title"><div><h2 id="work-title">All sourcing work</h2><p>Your research, saved studies and supplier conversations.</p></div>{changed && <Button variant="text" onClick={() => { order.current = desired; rerender(value => value + 1); }}>New activity · update order</Button>}</div>
        <div className="overview-toolbar"><label>Find work<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ingredient, supplier or location" /></label>
          <label>Sort by<Select aria-label="Sort by" value={sort} onValueChange={value => { setSort(value); order.current = []; }} options={[{ value: "priority", label: "Priority" }, { value: "recent", label: "Recent activity" }]} /></label></div>
        <div className="overview-filters" role="group" aria-label="Work status">{([["all", "All"], ["attention", "Needs attention"], ["researching", "Researching"], ["waiting", "Waiting"]] as const).map(([value, label]) => <Button key={value} variant="text" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
        {!visible.length ? <p className="overview-no-matches">No work matches these filters.</p> : <ul className="overview-work-list">{visible.map(item => <li key={item.id}>
          <div><button className="overview-work-name" onClick={() => void open(item, "work")}>{item.ingredient}</button><p>{item.region}</p>{item.objective && <p>{item.objective}</p>}<small>{item.kind === "case" ? "Research question" : item.kind === "search" ? "Search" : item.kind === "inquiry" ? "Conversation" : item.kind === "comparison" ? "Comparison" : "Study"} · {date(item.updatedAt)}</small></div>
          <div><strong>{item.next.title}</strong><p>{item.next.description}</p>{item.refresh && <div className="overview-refresh"><small>Research {item.refresh.status === "running" ? "started" : item.refresh.status === "failed" ? "interrupted" : "updated"} {date(item.refresh.createdAt)}</small><p>{item.refresh.status === "running" ? "Checking for new sources and updated details…" : item.refresh.status === "failed" ? "Research is incomplete. Review the available sources before trying again." : !item.newSources && !item.changedSources ? "No new sources or changed details found." : `${item.newSources} new sources · ${item.changedSources} with different interpreted details. Review against your saved evidence.`}</p></div>}{item.activeWatches > 0 && <small>{item.activeWatches} active source {item.activeWatches === 1 ? "watch" : "watches"}</small>}</div>
          <div className="overview-work-actions">{action(item)}{item.studyId && <Button variant="text" disabled={!connected || !availability?.searchEnabled || item.next.researching || refreshing === item.id} onClick={() => setRefreshItem(item)}><RefreshCw size={15} />{refreshing === item.id ? "Updating research…" : "Update market research"}</Button>}</div>
        </li>)}</ul>}
      </section>}
    </>}
      <section className="overview-decisions" aria-labelledby="decisions-title"><div className="overview-section-title"><div><h2 id="decisions-title">Recent decision updates</h2><p>What changed after you confirmed supplier terms.</p></div></div>
        {!outcomes.length ? <div className="overview-decision-empty"><span className="overview-empty-icon"><ClipboardCheck size={28} aria-hidden="true" /></span><div><h3>No decision updates yet</h3><p>After you review a supplier reply and confirm delivery or minimum order terms, the saved before-and-after comparison will appear here.</p></div></div> : <div className="overview-outcomes">{outcomes.map(outcome => <article key={outcome.id}>
          <p className="eyebrow">{outcome.ingredient} · {outcome.term}</p><h3>{outcome.supplier}</h3>
          <p>{outcome.term === "Minimum confirmed" ? `Minimum: ${outcome.beforeMinimum === null ? "pending" : outcome.beforeMinimum} → ${outcome.value} packs` : `Reviewed delivery fee: ${amount(outcome.value, outcome.currency)}`}</p>
          <p className="overview-order-total">Order total <strong>{amount(outcome.beforeTotal, outcome.currency)} → {amount(outcome.afterTotal, outcome.currency)}</strong></p>
          <p>{outcome.recommendationChanged ? "The recommendation changed under your saved preferences." : "The recommendation is unchanged under your saved preferences."}</p>
          {outcome.affordableBefore !== true && outcome.affordableAfter === true && <p>This option now fits the saved budget.</p>}
          <small>{date(outcome.createdAt)} · revision {outcome.revision}</small>{outcome.stale && <p className="overview-historical">Saved outcome · a newer comparison revision exists</p>}
          <Button variant="text" onClick={() => { const item = items.find(item => item.comparisonId === outcome.comparisonId); if (item) void open(item, "comparison"); }}>Open updated comparison<ArrowRight size={16} /></Button>
        </article>)}</div>}
      </section>
    {refreshItem && <Dialog title="Update market research" onClose={() => setRefreshItem(null)}>
      <p>Search again for <strong>{refreshItem.ingredient}</strong> in <strong>{refreshItem.region}</strong>, including newly listed suppliers and current public details.</p>
      <p>This runs one live search and, when enabled, interprets up to three product pages. New findings are saved for review; your confirmed study and comparison stay as they are.</p>
      <p className="field-hint">Uses the session’s existing search allowance. This is a one-time update.</p>
      <div className="dialog-actions"><Button onClick={() => setRefreshItem(null)}>Keep current research</Button><Button variant="primary" disabled={!connected || Boolean(refreshing)} onClick={() => {
        const item = refreshItem; setRefreshing(item.id); setRefreshItem(null); setError("");
        void refresh({ token, clientId: crypto.randomUUID(), studyId: item.studyId!, ingredient: item.ingredient, region: item.region })
          .catch(cause => setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "The update could not be confirmed. Check the saved research before starting another."))
          .finally(() => setRefreshing(null));
      }}>Search for updates</Button></div>
    </Dialog>}
  </>;
}

function date(value: number) { return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function amount(value: number | null, currency: string | null) {
  return value === null ? "Pending" : !currency ? "Currency not saved" : `${currency} ${(value / 100).toFixed(2)}`;
}
class OverviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="alert"><p>Your sourcing work could not be loaded. Saved records are preserved.</p><Button onClick={() => this.setState({ failed: false })}>Try again</Button></div> : this.props.children; }
}

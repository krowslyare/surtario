import { Component, useId, useMemo, type ReactNode } from "react";
import { useQueries, useQuery } from "convex/react";
import { FolderClock } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SavedStudy } from "./SavedStudies";
import type { SavedComparison } from "./SavedComparisons";
import { casePriority } from "../domain/casePriority";
import { useDemoSession } from "./useDemoSession";
import { Button } from "./ui/Button";

type Props = {
  onStudy: (study: SavedStudy) => void;
  onCase: (id: Id<"sourcingCases">, study?: SavedStudy, requestId?: Id<"quotationRequests">) => void;
  onResearch: (id: string, ingredient: string, region: string) => void;
  onComparison: (comparison: SavedComparison) => void;
};
type Entry = {
  id: string;
  title: string;
  detail: string;
  next: string;
  updatedAt: number;
  researchIds: string[];
  disabled?: boolean;
  open: () => void;
};
function researchIds(study?: SavedStudy, comparison?: SavedComparison): string[] {
  const sources = [
    ...Object.values(comparison?.sources ?? {}),
    ...(study?.webSelections ?? []).flatMap(selection => Object.values(selection.seed.sources)),
  ];
  return [...new Set([
    ...(study?.prospects ?? []).map(prospect => prospect.runId),
    ...sources.flatMap(source => source.webReview ? [source.webReview.runId] : []),
  ])];
}

export default function ContinueWork(props: Props) {
  const { token, error } = useDemoSession();
  const titleId = useId();
  return (
    <section className="continue-work" aria-labelledby={titleId}>
      {error || !token ? <>
        <WorkHeading titleId={titleId} />
        {error ? <p>Site storage is unavailable. Saved work cannot be recovered.</p>
          : <p role="status">Loading your work…</p>}
      </> : <Boundary titleId={titleId}><Connected {...props} token={token} titleId={titleId} /></Boundary>}
    </section>
  );
}

function WorkHeading({ titleId, count }: { titleId: string; count?: number }) {
  return <div className="continue-heading">
    <h2 id={titleId}>Continue your work</h2>
    {count !== undefined && count > 0 && <span className="continue-count">{count} saved {count === 1 ? "item" : "items"}</span>}
  </div>;
}

function Connected({ token, titleId, ...props }: Props & { token: string; titleId: string }) {
  const studies = useQuery(api.studies.list, { token });
  const cases = useQuery(api.sourcing.list, { token });
  const comparisons = useQuery(api.comparisons.list, { token });
  const runs = useQuery(api.research.list, { token });
  const requests = useQuery(api.quotationMail.list, { token });
  const confirmationQueries = useMemo(() => Object.fromEntries(
    (cases ?? []).filter(item => item.comparisonId).map(item => [
      item.id,
      { query: api.quotationMail.listDeliveryConfirmations, args: { token, comparisonId: item.comparisonId! } },
    ]),
  ), [cases, token]);
  const confirmations = useQueries(confirmationQueries);
  if (!studies || !cases || !comparisons || !runs || !requests) {
    return <><WorkHeading titleId={titleId} /><p role="status">Loading your work…</p></>;
  }
  const linkedStudies = new Set(cases.flatMap(item => item.studyId ? [item.studyId] : []));
  const linkedComparisons = new Set(cases.flatMap(item => item.comparisonId ? [item.comparisonId] : []));
  const linkedRuns = new Set([
    ...cases.flatMap(item => item.researchRunIds),
    ...studies.flatMap(study => researchIds(study)),
    ...comparisons.flatMap(comparison => researchIds(undefined, comparison)),
  ]);
  const entries: Entry[] = [];
  for (const item of cases) {
    const study = studies.find(saved => saved.id === item.studyId);
    const comparison = comparisons.find(saved => saved.id === item.comparisonId);
    const mail = requests.filter(request =>
      (item.studyId && request.studyId === item.studyId) ||
      (item.comparisonId && request.comparisonId === item.comparisonId) ||
      study?.prospects?.some(prospect => prospect.id === request.prospectId),
    );
    const confirmed = confirmations[item.id] as FunctionReturnType<typeof api.quotationMail.listDeliveryConfirmations> | Error | undefined;
    if (confirmed instanceof Error) throw confirmed;
    const reviewed = new Set(Object.values(comparison?.sources ?? {})
      .flatMap(source => source.replyReview ? [source.replyReview.messageId] : []));
    for (const confirmation of confirmed ?? []) reviewed.add(confirmation.messageId);
    const reply = mail.find(request => request.replies.some(message => !reviewed.has(message.messageId)));
    const uncertain = mail.find(request => request.state === "uncertain");
    const draft = mail.find(request => request.state === "draft");
    const nextRequest = reply ?? uncertain ?? draft;
    const loading = Boolean(item.comparisonId && confirmed === undefined);
    const next = reply ? "Review reply"
      : uncertain ? "Check unconfirmed send"
      : draft ? "Review inquiry"
      : comparison ? (casePriority(item, comparison).rank === 0 ? "Review purchase terms" : "Resume calculation")
      : item.status === "running" ? "View research progress"
      : "Continue research";
    entries.push({
      id: item.id, title: item.ingredient, detail: `${item.region} · ${item.objective}`,
      disabled: loading, next: loading ? "Loading next step…" : next,
      researchIds: [...new Set([...item.researchRunIds, ...researchIds(study, comparison)])],
      updatedAt: Math.max(item.updatedAt, study?.updatedAt ?? 0, comparison?.updatedAt ?? 0, ...mail.map(request => request.updatedAt)),
      open: () => { if (!loading) props.onCase(item.id, study, nextRequest?.id); },
    });
  }
  for (const study of studies.filter(saved => !linkedStudies.has(saved.id))) {
    entries.push({
      id: study.id, title: study.term, detail: study.region, next: "Resume study",
      updatedAt: study.updatedAt, researchIds: researchIds(study),
      open: () => props.onStudy(study),
    });
  }
  for (const comparison of comparisons.filter(saved => !linkedComparisons.has(saved.id))) {
    entries.push({
      id: comparison.id, title: comparison.request.ingredient,
      detail: `${comparison.request.quantity} ${comparison.request.unit} · ${comparison.offers.map(offer => offer.supplier).join(", ")}`,
      next: "Resume calculation", updatedAt: comparison.updatedAt,
      researchIds: researchIds(undefined, comparison),
      open: () => props.onComparison(comparison),
    });
  }
  for (const run of runs.filter(saved => !linkedRuns.has(saved.id))) {
    entries.push({
      id: run.id, title: run.ingredient, detail: run.region, next: run.status === "running" ? "View search progress" : "Review sources",
      updatedAt: Date.parse(run.observedAt), researchIds: [],
      open: () => props.onResearch(run.id, run.ingredient, run.region),
    });
  }
  entries.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  return <>
    <WorkHeading titleId={titleId} count={entries.length} />
    {entries.length ? (
    <div className="continue-scroll" role="group" aria-label="Saved work" tabIndex={0}>
    <ul className="continue-list">
      {entries.map(entry => {
        const searches = runs.filter(run => entry.researchIds.includes(run.id));
        return (
          <li key={entry.id}>
            <div>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
              <small>{new Date(entry.updatedAt).toLocaleString("en-US")}</small>
            </div>
            <div className="continue-actions">
              <Button variant="secondary" disabled={entry.disabled} onClick={entry.open}>{entry.next}</Button>
              {searches.map((run, index) => (
                <Button key={run.id} variant="text" onClick={() => props.onResearch(run.id, run.ingredient, run.region)}>
                  Review source search{searches.length > 1 ? ` ${index + 1}` : ""}
                </Button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
    </div>
  ) : <div className="continue-empty-card">
    <FolderClock size={24} aria-hidden="true" />
    <h3>No saved work yet</h3>
    <p>Your searches, saved studies and supplier follow-ups will appear here, ready to pick up where you left off.</p>
    <p className="continue-empty-hint">Start with an ingredient or explore the demo catalog.</p>
  </div>}
  </>;
}

class Boundary extends Component<{ children: ReactNode; titleId: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <><WorkHeading titleId={this.props.titleId} /><p role="alert">Saved work could not be loaded. Your current selection is still available.</p></>
      : this.props.children;
  }
}

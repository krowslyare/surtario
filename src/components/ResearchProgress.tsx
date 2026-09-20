import { Check, Globe2, LoaderCircle } from "lucide-react";
import type { ResearchProgress as Progress } from "../../convex/researchValidators";

/** Provider checkpoints only: no estimated percentages or simulated progress. */
export default function ResearchProgress({ progress, ingredient, region, sources = [] }: {
  progress?: Progress;
  ingredient: string;
  region: string;
  sources?: { url: string; title: string; extractionStatus: string; analysis?: { kind: string }; extraction?: { price: { value: string | null }; currency: { value: string | null }; packageContent: { value: string | null }; packageUnit: { value: string | null } } | null }[];
}) {
  const reviewing = progress?.stage === "reviewing";
  const reading = progress?.stage === "reading" || reviewing;
  return <section className="research-progress" aria-label="Search progress">
    <div className="research-progress-intro">
      <img src="/brand/surtario-symbol.svg" alt="" width="36" height="36" />
      <div>
        <p className="research-progress-context">{ingredient} <span>· {region}</span></p>
        <h3 key={progress?.stage ?? "searching"}>{reviewing ? "Preparing your shortlist." : reading ? "Reading the details." : "Finding your options."}</h3>
        <p>Checking public sources. You’ll review what we find.</p>
      </div>
    </div>
    <ol className="research-progress-steps" aria-label="Research stages">
      <li className={reading ? "is-complete" : "is-current"} aria-current={!reading ? "step" : undefined}>
        <span>{reading ? <Check size={14} /> : "1"}</span> Find sources
      </li>
      <li className={reviewing ? "is-complete" : reading ? "is-current" : ""} aria-current={reading && !reviewing ? "step" : undefined}><span>{reviewing ? <Check size={14} /> : "2"}</span> Read pages</li>
      <li className={reviewing ? "is-current" : ""} aria-current={reviewing ? "step" : undefined}><span>3</span> Prepare review</li>
    </ol>
    <div className="research-progress-detail">
      <p role="status" aria-live="polite" aria-atomic="true">
        {reviewing ? `${progress.reviewsCompleted ?? 0} of ${progress.reviewsTotal ?? 0} sources analyzed` : reading
          ? `${progress.candidates} candidate sources · ${progress.pagesChecked} pages checked`
          : progress ? `${progress.searchesCompleted} of ${progress.searchesTotal} searches checked` : "Connecting to search…"}
      </p>
      <span className="research-progress-source"><Globe2 size={15} aria-hidden="true" />
        {progress?.currentHost ?? (reading ? "Preparing source details" : "Searching public pages")}
      </span>
    </div>
    {sources.length > 0 && <div className="research-arrivals" aria-label="Sources arriving">
      <div className="research-arrivals-heading"><strong>Sources found so far</strong><span>{sources.length}</span></div>
      <ul>{sources.slice(0, 6).map(source => <li key={source.url}>
        <div><span>{new URL(source.url).hostname.replace(/^www\./, "")}</span><strong>{source.title}</strong></div>
        <div className="research-arrival-state">
          {source.extractionStatus === "running" ? <><LoaderCircle size={15} className="research-reading-icon" /> Reading terms</> : source.analysis?.kind === "product" && source.extraction?.price.value ? <><strong>{source.extraction.currency.value ?? "Currency pending"} {source.extraction.price.value}</strong><span>{source.extraction.packageContent.value} {source.extraction.packageUnit.value} · To review</span></> : <><Check size={15} /> Source read</>}
        </div>
      </li>)}</ul>
      {sources.length > 6 && <p className="research-progress-note">{sources.length - 6} more sources collected. All will be available when the search finishes.</p>}
    </div>}
    <p className="research-progress-note">Some pages take longer to respond. Your search is saved here as it runs.</p>
  </section>;
}

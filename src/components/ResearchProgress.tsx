import { Check, Globe2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import type { ResearchProgress as Progress } from "../../convex/researchValidators";

/** Provider checkpoints only: no estimated percentages or simulated progress. */
export default function ResearchProgress({ progress, ingredient, region, sources = [], connected = true }: {
  progress?: Progress;
  ingredient: string;
  region: string;
  connected?: boolean;
  sources?: { url: string; title: string; extractionStatus: string; analysis?: { kind: string }; extraction?: { price: { value: string | null }; currency: { value: string | null }; packageContent: { value: string | null }; packageUnit: { value: string | null } } | null }[];
}) {
  const reviewing = progress?.stage === "reviewing";
  const reading = progress?.stage === "reading" || reviewing;
  const panel = useRef<HTMLElement>(null);
  const inView = useInView(panel);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateAge, setUpdateAge] = useState(0);
  // Time since this browser received a changed checkpoint, not estimated progress.
  const checkpoint = JSON.stringify([progress, sources.map(source => [source.url, source.extractionStatus])]);
  useEffect(() => {
    const receivedAt = Date.now();
    setUpdateAge(0);
    const timer = window.setInterval(() => setUpdateAge(Math.floor((Date.now() - receivedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [checkpoint]);
  useEffect(() => {
    const sync = () => { setVisible(!document.hidden); setOnline(navigator.onLine); };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  const disconnected = !connected || !online;
  const waiting = updateAge >= 30;
  const ageLabel = updateAge < 5 ? "Just updated" : `Last update ${updateAge < 60 ? `${updateAge}s` : `${Math.floor(updateAge / 60)}m ${updateAge % 60}s`} ago`;
  return <section ref={panel} className="research-progress" aria-label="Search progress" data-animate={inView && visible && !disconnected}>
    <div className="research-progress-intro">
      <svg className="research-brand-loader" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 32h48v5a24 24 0 0 1-48 0v-5Z" fill="currentColor" />
        <path className="research-leaf research-leaf-left" d="M17 7c11 0 17 6 17 18C23 25 17 19 17 7Z" fill="currentColor" />
        <path className="research-leaf research-leaf-right" d="M47 10c-10 1-15 6-14 16 10-1 15-6 14-16Z" fill="currentColor" />
      </svg>
      <div>
        <p className="research-progress-context">{ingredient} <span>· {region}</span></p>
        <h3 key={progress?.stage ?? "searching"}>{reviewing ? "Preparing your shortlist." : reading ? "Reading the details." : "Finding your options."}</h3>
        <p>Checking public sources. You’ll review what we find.</p>
      </div>
    </div>
    <div className="research-activity">
      <p role="status">{disconnected
        ? "Connection interrupted. Waiting to reconnect."
        : waiting ? "Waiting for the next update. Some sources take longer to respond."
        : reviewing ? "Checking the details we found against each source."
        : reading ? "Reading source pages and collecting their details."
        : "Looking for suppliers and product pages."}</p>
      <span className="research-update-age" aria-live="off">{progress ? ageLabel : "Waiting for the first update"}</span>
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
          {source.extractionStatus === "running" ? <><LoaderCircle size={15} className="research-reading-icon" /> Reading terms</> : source.analysis?.kind === "product" && source.extraction?.price.value ? <><strong>{source.extraction.currency.value ?? "Currency pending"} {source.extraction.price.value}</strong><span>{source.extraction.packageContent.value && source.extraction.packageUnit.value ? `${source.extraction.packageContent.value} ${source.extraction.packageUnit.value}` : "Package size pending"} · To review</span></> : <><Check size={15} /> Source read</>}
        </div>
      </li>)}</ul>
      {sources.length > 6 && <p className="research-progress-note">{sources.length - 6} more sources collected. All will be available when the search finishes.</p>}
    </div>}
    <p className="research-progress-note">{disconnected ? "Collected sources stay here. Reconnecting does not start another search." : "Your search is saved here as it runs. You can return to it from Continue your work."}</p>
  </section>;
}

export function ResearchCompletion({ count, partial }: { count: number; partial: boolean }) {
  return <div className="research-completion" role="status">
    <svg className="research-completion-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
      <path d="m9 16 5 5 9-10" pathLength="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div><strong>Search finished.</strong><p>{count > 0 ? `${count} ${count === 1 ? "source is" : "sources are"} ready to review.${partial ? " Some pages need attention." : ""}` : "No usable sources were retrieved. Try a more specific search."}</p></div>
  </div>;
}

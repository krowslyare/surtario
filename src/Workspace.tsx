import { scrollToPageStart } from "./scroll";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Comparison from "./Comparison";
import ResumeComparison from "./components/ResumeComparison";
import MarketStudy from "./MarketStudy";
import type { PurchaseSeed } from "./domain/market";

const BrandGuide = lazy(() => import("./BrandGuide"));

export default function Workspace({
  persistenceEnabled,
}: {
  persistenceEnabled: boolean;
}) {
  const [view, setView] = useState<"market" | "comparison" | "brand">(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    return (import.meta.env.DEV && requested === "brand") || requested === "comparison"
      ? requested
      : "market";
  });
  const [resumeId, setResumeId] = useState(() => new URLSearchParams(window.location.search).get("comparison"));
  const [comparisonKey, setComparisonKey] = useState(0);
  const [seed, setSeed] = useState<PurchaseSeed | undefined>();
  const previousView = useRef(view);
  useEffect(() => {
    if (previousView.current === view) return;
    previousView.current = view;
    document
      .querySelector<HTMLElement>(`#${view}-main h1`)
      ?.focus({ preventScroll: true });
  }, [view]);
  function openComparison(nextSeed?: PurchaseSeed) {
    setResumeId(null);
    setSeed(nextSeed);
    setComparisonKey((key) => key + 1);
    setView("comparison");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "comparison");
    if (nextSeed?.resumeComparison) url.searchParams.set("comparison", nextSeed.resumeComparison.id);
    else url.searchParams.delete("comparison");
    window.history.replaceState(null, "", url);
    requestAnimationFrame(scrollToPageStart);
  }
  function backToMarket() {
    setView("market");
    setResumeId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", "market");
    url.searchParams.delete("comparison");
    window.history.replaceState(null, "", url);
    requestAnimationFrame(scrollToPageStart);
  }
  if (view === "brand") {
    return (
      <Suspense
        fallback={
          <main>
            <p role="status">Opening the Surtario brand guide…</p>
          </main>
        }
      >
        <BrandGuide />
      </Suspense>
    );
  }
  return (
    <>
      {import.meta.env.DEV && import.meta.env.VITE_REHEARSAL === "true" && (
        <aside className="rehearsal-notice" aria-label="Rehearsal mode">
          {import.meta.env.VITE_LIVE_RESEARCH === "true"
            ? "Local research · Real Firecrawl web · Luna CLI AI · Email simulated"
            : "Local rehearsal · Luna CLI AI · Simulated web and email · Sample data"}
        </aside>
      )}
      <div hidden={view !== "market"}>
        <MarketStudy
          persistenceEnabled={persistenceEnabled}
          onPrepare={openComparison}
          onManualExample={() => openComparison()}
        />
      </div>
      {view === "comparison" && (resumeId ? (
        persistenceEnabled
          ? <ResumeComparison id={resumeId} onReady={next => { setSeed(next); setResumeId(null); }} onBack={backToMarket} />
          : <main><p>Saved comparisons are unavailable while storage is disconnected.</p><button onClick={backToMarket}>Back to workspace</button></main>
      ) : (
        <Comparison
          key={comparisonKey}
          onPrepare={openComparison}
          seed={seed}
          persistenceEnabled={persistenceEnabled}
          onBack={backToMarket}
        />
      ))}
    </>
  );
}

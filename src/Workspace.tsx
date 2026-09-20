import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Comparison, { readComparisonDraft } from "./Comparison";
import ResumeComparison from "./components/ResumeComparison";
import MarketStudy from "./MarketStudy";
import type { PurchaseSeed } from "./domain/market";

const BrandGuide = lazy(() => import("./BrandGuide"));

export default function Workspace({
  persistenceEnabled,
}: {
  persistenceEnabled: boolean;
}) {
  type Route = { view: "market" | "comparison" | "brand" | "followup" | "messages"; caseId: string | null; requestId?: string; comparisonId: string | null; fromCase: string | null; fromMessage?: string };
  function readRoute(): Route {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    const view = requested === "comparison" || requested === "followup" || requested === "messages" || (import.meta.env.DEV && requested === "brand") ? requested : "market";
    return { view, caseId: params.get("case"), requestId: params.get("message") ?? undefined, comparisonId: params.get("comparison"), fromCase: params.get("fromCase"), fromMessage: params.get("fromMessage") ?? undefined };
  }
  const [route, setRoute] = useState<Route>(readRoute);
  const view = route.view;
  const initialDraft = view === "comparison" ? readComparisonDraft() : undefined;
  const [restoredDraft, setRestoredDraft] = useState(initialDraft);
  const [resumeId, setResumeId] = useState(initialDraft ? null : route.comparisonId);
  const [visit, setVisit] = useState(0);
  const [comparisonKey, setComparisonKey] = useState(0);
  const [seed, setSeed] = useState<PurchaseSeed | undefined>(initialDraft?.seed);
  const marketScroll = useRef(0);
  const previousView = useRef(`${view}:${route.caseId ?? ""}`);
  useEffect(() => {
    function restore() {
      const next = readRoute();
      if (next.view === "comparison") {
        const draft = readComparisonDraft();
        setRestoredDraft(draft);
        setSeed(draft?.seed);
        setResumeId(draft ? null : next.comparisonId);
        setComparisonKey(key => key + 1);
      }
      setVisit(value => value + 1);
      setRoute(next);
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    const destination = `${view}:${route.caseId ?? ""}`;
    if (previousView.current === destination) return;
    previousView.current = destination;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: view === "market" ? marketScroll.current : 0, behavior: "instant" });
      document.querySelector<HTMLElement>(`#${view}-main h1`)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, route.caseId]);
  function navigate(next: Route, replace = false) {
    if (view === "market" && next.view !== "market") marketScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    for (const key of ["case", "message", "comparison", "fromCase", "fromMessage"]) url.searchParams.delete(key);
    url.hash = "";
    url.searchParams.set("view", next.view);
    if (next.caseId) url.searchParams.set("case", next.caseId);
    if (next.requestId) url.searchParams.set("message", next.requestId);
    if (next.comparisonId) url.searchParams.set("comparison", next.comparisonId);
    if (next.fromCase) url.searchParams.set("fromCase", next.fromCase);
    if (next.fromMessage) url.searchParams.set("fromMessage", next.fromMessage);
    window.history[replace ? "replaceState" : "pushState"]({ surtario: true, previous: route }, "", url);
    setRoute(next);
    setVisit(value => value + 1);
  }
  function openFollowup(id: string | null, requestId?: string) {
    navigate({ view: "followup", caseId: id, requestId, comparisonId: null, fromCase: null, fromMessage: view === "messages" ? route.requestId : undefined });
  }
  function openMessages(requestId?: string, replace = false) {
    navigate({ view: "messages", caseId: null, requestId, comparisonId: null, fromCase: null }, replace);
  }
  function openComparison(nextSeed?: PurchaseSeed) {
    setResumeId(null);
    setSeed(nextSeed);
    setRestoredDraft(undefined);
    setComparisonKey(key => key + 1);
    navigate({ view: "comparison", caseId: null, comparisonId: nextSeed?.resumeComparison?.id ?? null, fromCase: view === "followup" ? route.caseId : null, fromMessage: view === "messages" ? route.requestId : undefined });
  }
  function backToMarket() {
    setResumeId(null);
    if (view === "followup" && window.history.state?.previous?.view === "market") { window.history.back(); return; }
    navigate({ view: "market", caseId: null, comparisonId: null, fromCase: null });
  }
  function backFromComparison() {
    if (route.fromMessage) openMessages(route.fromMessage);
    else if (window.history.state?.previous?.view === "followup" && route.fromCase) window.history.back();
    else if (route.fromCase) openFollowup(route.fromCase);
    else backToMarket();
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
      <div hidden={view !== "market" && view !== "followup" && view !== "messages"}>
        <MarketStudy
          persistenceEnabled={persistenceEnabled}
          followup={view === "followup" ? { id: route.caseId, requestId: route.requestId, visit } : null}
          onOpenFollowup={openFollowup}
          onExitFollowup={backToMarket}
          onBackFollowup={() => route.fromMessage ? openMessages(route.fromMessage) : backToMarket()}
          followupBackLabel={route.fromMessage ? "Back to messages" : undefined}
          messages={view === "messages" ? { requestId: route.requestId, visit } : null}
          onOpenMessages={() => { if (view !== "messages") openMessages(); }}
          onSelectMessage={id => openMessages(id, true)}
          active={view === "market"}
          onPrepare={openComparison}
          onManualExample={() => openComparison()}
        />
      </div>
      {view === "comparison" && (resumeId ? (
        persistenceEnabled
          ? <ResumeComparison id={resumeId} onReady={next => { setSeed(next); setResumeId(null); }} onBack={backFromComparison} />
          : <main><p>Saved comparisons are unavailable while storage is disconnected.</p><button onClick={backToMarket}>Back to workspace</button></main>
      ) : (
        <Comparison
          key={comparisonKey}
          onPrepare={openComparison}
          seed={seed}
          restoredDraft={restoredDraft}
          persistenceEnabled={persistenceEnabled}
          onBack={backFromComparison}
          onOpenMessages={() => openMessages()}
          backLabel={route.fromMessage ? "Back to messages" : route.fromCase ? "Back to follow-up" : "Back to market study"}
        />
      ))}
    </>
  );
}

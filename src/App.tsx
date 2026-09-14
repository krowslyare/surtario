import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Comparison from "./Comparison";
import MarketStudy from "./MarketStudy";
import type { PurchaseSeed } from "./domain/market";

const BrandGuide = lazy(() => import("./BrandGuide"));

export default function App({
  persistenceEnabled,
}: {
  persistenceEnabled: boolean;
}) {
  const [view, setView] = useState<"market" | "comparison" | "brand">(() => {
    const requested = new URLSearchParams(window.location.search).get("view");
    return requested === "brand" || requested === "comparison"
      ? requested
      : "market";
  });
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
    setSeed(nextSeed);
    setComparisonKey((key) => key + 1);
    setView("comparison");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "comparison");
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
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
          Local rehearsal · Luna CLI AI · Simulated web and email · Sample data
        </aside>
      )}
      <div hidden={view !== "market"}>
        <MarketStudy
          persistenceEnabled={persistenceEnabled}
          onPrepare={openComparison}
          onManualExample={() => openComparison()}
        />
      </div>
      {view === "comparison" && (
        <Comparison
          key={comparisonKey}
          onPrepare={openComparison}
          seed={seed}
          persistenceEnabled={persistenceEnabled}
          onBack={() => {
            setView("market");
            const url = new URL(window.location.href);
            url.searchParams.delete("view");
            window.history.replaceState(null, "", url);
            window.scrollTo(0, 0);
          }}
        />
      )}
    </>
  );
}

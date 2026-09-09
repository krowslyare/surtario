import { useState } from "react";
import Comparison from "./Comparison";
import MarketStudy from "./MarketStudy";
import type { PurchaseSeed } from "./domain/market";

export default function App({
  persistenceEnabled,
}: {
  persistenceEnabled: boolean;
}) {
  const [view, setView] = useState<"market" | "comparison">(() =>
    new URLSearchParams(window.location.search).get("view") === "comparison"
      ? "comparison"
      : "market",
  );
  const [seed, setSeed] = useState<PurchaseSeed | undefined>();
  function openComparison(nextSeed?: PurchaseSeed) {
    setSeed(nextSeed);
    setView("comparison");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "comparison");
    window.history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  }
  return (
    <>
      <div hidden={view !== "market"}>
        <MarketStudy
          persistenceEnabled={persistenceEnabled}
          onPrepare={openComparison}
          onManualExample={() => openComparison()}
        />
      </div>
      {view === "comparison" && (
        <Comparison
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

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
          onBack={() => {
            setView("market");
            window.scrollTo(0, 0);
          }}
        />
      )}
    </>
  );
}

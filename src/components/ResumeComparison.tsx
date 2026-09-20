import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { PurchaseSeed } from "../domain/market";
import { useDemoSession } from "./useDemoSession";

/** Restore only an owner-scoped saved record, never substitute sample offers. */
export default function ResumeComparison({ id, onReady, onBack }: {
  id: string;
  onReady: (seed: PurchaseSeed) => void;
  onBack: () => void;
}) {
  const { token, error } = useDemoSession();
  const comparisons = useQuery(api.comparisons.list, token ? { token } : "skip");
  const saved = comparisons?.find(item => item.id === id);
  useEffect(() => {
    if (saved) onReady({
      ...saved,
      resumeComparison: { id: saved.id, revision: saved.revision, selectedOfferId: saved.selectedOfferId, unchanged: true },
    });
  }, [saved, onReady]);
  const unavailable = error || (comparisons !== undefined && !saved);
  return <main id="comparison-main" className="comparison-recovery">
    <img src="/brand/surtario-symbol.svg" alt="" width="40" height="40" />
    <h1 tabIndex={-1}>{unavailable ? "This comparison isn’t available." : "Opening your comparison…"}</h1>
    <p role="status">{unavailable
      ? "Saved comparisons belong to the browser where you created them. Return to your workspace to open another."
      : "Restoring your saved offers, quantities and source details."}</p>
    <button className="button secondary" onClick={onBack}>Back to workspace</button>
  </main>;
}

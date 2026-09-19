import { useEffect, useState } from "react";
import Brand from "./Brand";
import "../styles/arrival.css";

export default function WorkspaceArrival({ ready, onFinished }: { ready: boolean; onFinished: () => void }) {
  const [finished, setFinished] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const leaving = ready && minimumElapsed;
  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumElapsed(true), 1700);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => { setFinished(true); onFinished(); },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 140 : 560);
    return () => window.clearTimeout(timer);
  }, [leaving, onFinished]);
  if (finished) return null;
  return (
    <div className="workspace-arrival" data-ready={leaving} aria-hidden={leaving || undefined}>
      <div className="workspace-arrival-content" role="status" aria-live="polite">
        <Brand compact />
        <p>Good ingredients. Better decisions.</p>
        <span className="sr-only">Loading your workspace.</span>
      </div>
    </div>
  );
}

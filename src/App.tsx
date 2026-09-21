import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import Landing from "./Landing";
import WorkspaceArrival from "./components/WorkspaceArrival";
import { consumeWorkspaceEntry } from "./workspaceCheckpoint";

const Workspace = lazy(() => import("./Workspace"));
// Consume once per document, outside StrictMode's repeated initializers.
const animateEntry = consumeWorkspaceEntry();

class WorkspaceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (
      <main className="workspace-arrival">
        <div className="workspace-arrival-content">
          <h1>Let’s try that again.</h1>
          <p>Your workspace couldn’t load. Check your connection and retry.</p>
          <a className="button secondary" href={window.location.href}>Try again</a>
        </div>
      </main>
    ) : this.props.children;
  }
}

function ReadyWorkspace({ persistenceEnabled, onReady }: { persistenceEnabled: boolean; onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return <Workspace persistenceEnabled={persistenceEnabled} />;
}

export default function App({ persistenceEnabled }: { persistenceEnabled: boolean }) {
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [onFinished] = useState(() => () => setRevealed(true));
  const [onReady] = useState(() => () => setReady(true));
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const workspaceRequested =
    view === "overview" || view === "market" || view === "comparison" || view === "followup" || view === "messages" || view === "brand" ||
    params.get("example") === "pe";

  if (!workspaceRequested) return <Landing />;
  return (
    <WorkspaceBoundary>
      <div className="workspace-content" inert={(animateEntry && !revealed) || undefined} aria-hidden={(animateEntry && !revealed) || undefined}>
        <Suspense fallback={animateEntry ? null : <main><p role="status">Opening your workspace…</p></main>}>
          {animateEntry ? <ReadyWorkspace persistenceEnabled={persistenceEnabled} onReady={onReady} /> : <Workspace persistenceEnabled={persistenceEnabled} />}
        </Suspense>
      </div>
      {animateEntry && <WorkspaceArrival ready={ready} onFinished={onFinished} />}
    </WorkspaceBoundary>
  );
}

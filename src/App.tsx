import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import Landing from "./Landing";
import WorkspaceArrival from "./components/WorkspaceArrival";

const Workspace = lazy(() => import("./Workspace"));

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
  const [onReady] = useState(() => () => setReady(true));
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const workspaceRequested =
    view === "market" || view === "comparison" || view === "brand" ||
    params.get("example") === "pe";

  if (!workspaceRequested) return <Landing />;
  return (
    <WorkspaceBoundary>
      <Suspense fallback={null}>
        <ReadyWorkspace persistenceEnabled={persistenceEnabled} onReady={onReady} />
      </Suspense>
      <WorkspaceArrival ready={ready} />
    </WorkspaceBoundary>
  );
}

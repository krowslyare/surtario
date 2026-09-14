import { lazy, Suspense } from "react";
import Landing from "./Landing";

const Workspace = lazy(() => import("./Workspace"));

export default function App({ persistenceEnabled }: { persistenceEnabled: boolean }) {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  const workspaceRequested =
    view === "market" || view === "comparison" || view === "brand" ||
    params.get("example") === "pe";

  if (!workspaceRequested) return <Landing />;
  return (
    <Suspense fallback={<main><p role="status">Opening Surtario…</p></main>}>
      <Workspace persistenceEnabled={persistenceEnabled} />
    </Suspense>
  );
}

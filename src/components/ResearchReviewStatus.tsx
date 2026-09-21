import { useState } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/Button";

/** Acknowledges an exact evidence version. It neither confirms terms nor changes offers. */
export default function ResearchReviewStatus({ token, runId }: { token: string; runId: string }) {
  const summary = useQuery(api.overview.research, { token, runId: runId as Id<"researchRuns"> });
  const review = useMutation(api.overview.reviewResearch);
  const connected = useConvexConnectionState().isWebSocketConnected;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!summary || summary.status === "running" || !summary.retained) return null;
  return <div className="research-reviewed">
    {summary.reviewed ? <p role="status">These findings are marked as reviewed.</p> : <>
      <p>Finished checking this search? Clear its review reminder when you have considered the useful sources.</p>
      <p className="field-hint">This does not confirm supplier terms or change your saved offers. New evidence will need a new review.</p>
      <Button disabled={!connected || busy} onClick={() => {
        setBusy(true); setError("");
        void review({ token, runId: summary.id, evidenceKey: summary.evidenceKey })
          .catch(cause => setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "The review could not be saved. Try again when connected."))
          .finally(() => setBusy(false));
      }}>{busy ? "Saving review…" : "Mark findings reviewed"}</Button>
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

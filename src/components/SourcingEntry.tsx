import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { SavedStudy, StudyDraft } from "./SavedStudies";
import { useDemoSession } from "./useDemoSession";
import { Dialog } from "./Dialog";
import { Button } from "./ui/Button";

export type SourcingEntryRequest = {
  supplier: string;
  draft: StudyDraft;
  target: { resultId: string } | { prospectId: Id<"webProspects"> };
  intent: "inquiry" | "research";
};
export default function SourcingEntry(props: {
  entry: SourcingEntryRequest;
  onReady: (study: SavedStudy, caseId: Id<"sourcingCases">, requestId: Id<"quotationRequests"> | null) => void;
  onClose: () => void;
}) {
  const { token, error } = useDemoSession();
  return <Dialog title={`Preparing next step for ${props.entry.supplier}`} onClose={props.onClose}>
    {error ? <p role="alert">Site storage is unavailable. The inquiry has not been saved.</p> : token ? <Connected {...props} token={token} /> : <p role="status">Preparing your session…</p>}
  </Dialog>;
}
function Connected({ entry, token, onReady }: { entry: SourcingEntryRequest; token: string; onReady: (study: SavedStudy, caseId: Id<"sourcingCases">, requestId: Id<"quotationRequests"> | null) => void }) {
  const prepare = useMutation(api.sourcingEntry.prepare);
  const pending = useRef<ReturnType<typeof prepare> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const clientId = useRef(crypto.randomUUID());
  useEffect(() => {
    let active = true;
    const { webSelections, prospects, ...draft } = entry.draft;
    pending.current ??= prepare({ token, clientId: clientId.current, study: {
      ...draft,
      webReviews: (webSelections ?? []).map(({ seed, sourceId }) => ({ ...seed.sources[sourceId].webReview!, runId: seed.sources[sourceId].webReview!.runId as Id<"researchRuns"> })),
      prospectIds: (prospects ?? []).map(p => p.id),
    }, target: entry.target, intent: entry.intent });
    pending.current.then(result => { if (active) onReady(result.study, result.caseId, result.requestId); }).catch(cause => {
      if (active) setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Saving was not confirmed. Check your connection and retry, or recover your work from Continue your work.");
    });
    return () => { active = false; };
  }, [entry, token, prepare, onReady, attempt]);
  return <>
    <p>Saving the selected evidence and its next step. No email is sent and no research call is made.</p>
    {error ? <><p role="alert">{error}</p><Button variant="secondary" onClick={() => { pending.current = null; setError(""); setAttempt(n => n + 1); }}>Retry preparation</Button></> : <p role="status">Saving…</p>}
  </>;
}

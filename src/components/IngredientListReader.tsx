import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { ScanText } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useDemoSession } from "./useDemoSession";
import type { IntakeRow } from "../intake/model";
export default function IngredientListReader({
  file,
  onRead,
}: {
  file: File;
  onRead: (rows: IntakeRow[]) => void;
}) {
  const { token } = useDemoSession();
  return token ? (
    <Reader
      key={`${file.name}:${file.lastModified}`}
      file={file}
      token={token}
      onRead={onRead}
    />
  ) : null;
}
function Reader({
  file,
  token,
  onRead,
}: {
  file: File;
  token: string;
  onRead: (rows: IntakeRow[]) => void;
}) {
  const availability = useQuery(api.ingredientExtraction.status, {});
  const [requestId, setRequestId] = useState<string | null>(null);
  const result = useQuery(
    api.ingredientExtraction.get,
    requestId ? { token, clientId: requestId } : "skip",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const applied = useRef<string | null>(null);
  const inFlight = useRef(false);
  const terminal = result?.status === "complete" || result?.status === "failed";
  useEffect(() => {
    if (!result || applied.current === requestId) return;
    if (result.status === "complete") {
      applied.current = requestId;
      setBusy(false);
      if (!result.rows.length) {
        setError(
          "No ingredients could be read. Try a clearer file or transcribe the list below.",
        );
        return;
      }
      onRead(
        result.rows.map((row, i) => ({
          ...row,
          original: [row.original],
          line: i + 1,
        })),
      );
    } else if (result.status === "failed") {
      applied.current = requestId;
      setBusy(false);
      setError(result.error ?? "The list could not be read.");
    }
  }, [result, requestId, onRead]);
  async function read() {
    if (!availability?.enabled || busy || inFlight.current) return;
    inFlight.current = true;
    // A lost HTTP acknowledgement is not a new paid operation. The server
    // recovers the same reservation before considering quotas or provider work.
    const id = requestId && !terminal ? requestId : crypto.randomUUID();
    setRequestId(id);
    setBusy(true);
    setError("");
    const type =
      file.type ||
      (file.name.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : file.name.toLowerCase().endsWith(".png")
          ? "image/png"
          : file.name.toLowerCase().endsWith(".webp")
            ? "image/webp"
            : "image/jpeg");
    try {
      const response = await fetch(
        `${availability.siteUrl}/ingredient-list/read`,
        {
          method: "POST",
          headers: {
            "Content-Type": type,
            Authorization: `Bearer ${token}`,
            "X-Request-Id": id,
          },
          body: file,
        },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "The file could not be read.");
      }
    } catch (cause) {
      if (applied.current === id) return;
      setBusy(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Connection interrupted. Recover this reading to check its saved result.",
      );
    } finally {
      inFlight.current = false;
    }
  }
  return (
    <div className="ingredient-ai-read">
      <button
        className="button primary"
        disabled={!availability?.enabled || busy}
        onClick={() => void read()}
      >
        <ScanText size={18} />
        {busy ? "Reading your list…" : requestId && !terminal ? "Recover this reading" : terminal ? "Read list again" : "Read list with AI"}
      </button>
      <p className="field-hint">
        This sends the file to OpenAI for reading. Surtario does not store the
        file; proposed text is retained for 24 hours. Reviewed text is kept when
        you save or research a list. Use files you are permitted to share.
      </p>
      {busy && (
        <p role="status">
          Reading visible ingredients and checking uncertain lines. You will
          review the result before research starts.
        </p>
      )}
      {availability && !availability.enabled && (
        <p className="notice warning">
          AI list reading is not enabled on this server. You can transcribe the
          ingredients below.
        </p>
      )}
      {error && (
        <div role="alert" className="notice error">
          <p>{error}</p>
          {requestId && !terminal && <p>Recover this reading to check the same request. A completed reading will appear automatically; recovery does not start a second AI reading.</p>}
        </div>
      )}
    </div>
  );
}
export function RecentListReadings({
  onRead,
}: {
  onRead: (rows: IntakeRow[]) => void;
}) {
  const { token } = useDemoSession();
  return token ? <Recent token={token} onRead={onRead} /> : null;
}
function Recent({
  token,
  onRead,
}: {
  token: string;
  onRead: (rows: IntakeRow[]) => void;
}) {
  const readings = useQuery(api.ingredientExtraction.recent, { token });
  const latest = readings?.filter(
    (r) => r.status === "complete" && r.rows.length,
  );
  if (!latest?.length) return null;
  return (
    <details className="recent-list-readings">
      <summary>Resume a recent list reading</summary>
      <p className="field-hint">
        Available for 24 hours. Your original file is not stored; reselect it if
        you need to inspect it again.
      </p>
      {latest.map((r) => (
        <div key={r.clientId}>
          <span>
            {r.rows.length} proposed ingredients ·{" "}
            {new Date(r.createdAt).toLocaleString("en-US")}
          </span>
          <button
            className="button secondary"
            onClick={() =>
              onRead(
                r.rows.map((row, i) => ({
                  ...row,
                  original: [row.original],
                  line: i + 1,
                })),
              )
            }
          >
            Review reading
          </button>
        </div>
      ))}
    </details>
  );
}

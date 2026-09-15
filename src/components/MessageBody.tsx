/** A literal preview, never an AI summary. Full source remains available. */
export function MessageBody({ text }: { text: string }) {
  const preview = text.slice(0, 240);
  const shortened = text.length > preview.length;
  return <div className="mail-message">
    <p className="mail-message-text">{preview}{shortened ? "…" : ""}</p>
    {shortened && <details className="mail-details">
      <summary>Read full email</summary>
      <p className="mail-message-text">{text}</p>
    </details>}
  </div>;
}

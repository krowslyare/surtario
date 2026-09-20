/** A literal preview, never an AI summary. Full source remains available. */
export function MessageBody({ text }: { text: string }) {
  const preview = text.slice(0, 240);
  const shortened = text.length > preview.length;
  return <div className="mail-message">
    <p className="mail-message-text">{preview}{shortened ? "…" : ""}</p>
    {shortened && <Disclosure className="mail-details mail-full-text" title="Read full email">
      <p className="mail-message-text">{text}</p>
    </Disclosure>}
  </div>;
}
import { Disclosure } from "./ui/Disclosure";

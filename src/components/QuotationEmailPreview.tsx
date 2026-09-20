import { quotationEmailMarkup } from "../domain/quotationEmail";

export function QuotationEmailPreview({ subject, text }: { subject: string; text: string }) {
  return <article aria-label="Email preview" className="mail-email-preview"
    // This renderer escapes every user-controlled value; it accepts no HTML.
    dangerouslySetInnerHTML={{ __html: quotationEmailMarkup(subject, text) }} />;
}

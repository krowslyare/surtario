// One deterministic, escaped template for the reviewed preview and outbound email.
// Never interpret supplier content or edited text as HTML.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function quotationEmailMarkup(subject: string, text: string): string {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).filter(Boolean);
  const body = paragraphs.map((paragraph) =>
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;color:#42202D;font-family:Arial,Helvetica,sans-serif;table-layout:fixed">
<tr><td style="padding:22px 24px 18px;border-top:3px solid #42202D;border-bottom:1px solid #E0D9DB"><span style="font-size:24px;font-weight:700;letter-spacing:-1px">surtario<span style="color:#BA3527">.</span></span><br><span style="font-size:12px;color:#72616A;line-height:1.6">Sourcing for your kitchen</span></td></tr>
<tr><td style="padding:24px 24px 6px;overflow-wrap:anywhere"><h3 style="margin:0 0 22px;font-size:20px;line-height:1.3;font-weight:700;color:#42202D">${escapeHtml(subject)}</h3>${body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #E0D9DB;font-size:12px;line-height:1.6;color:#72616A">Prepared with Surtario · Supplier correspondence</td></tr>
</table>`;
}

export function quotationEmailPayload(subject: string, text: string) {
  return {
    text: `${text}\n\n—\nPrepared with Surtario · Sourcing for your kitchen`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:16px 0;background:#FAFAF7">${quotationEmailMarkup(subject, text)}</body></html>`,
  };
}

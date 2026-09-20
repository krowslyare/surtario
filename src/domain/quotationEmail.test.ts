import { describe, expect, it } from "vitest";
import { quotationEmailMarkup, quotationEmailPayload } from "./quotationEmail";

describe("supplier email presentation", () => {
  it("renders untrusted subjects and message bodies as text, never executable markup", () => {
    const subject = '<img src=x onerror="alert(1)"> & quote';
    const body = 'Hello,\n\n<script>alert(1)</script>\n<a href="https://tracker.test">Click</a>';
    const payload = quotationEmailPayload(subject, body);
    expect(payload.html).not.toMatch(/<script|<img|<a\s/i);
    expect(payload.html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; quote');
    expect(payload.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(payload.text).toContain(body);
  });

  it("uses the exact reviewed content in preview and send, preserving paragraphs and units", () => {
    const text = 'Hello,\r\n\r\nCould you confirm?\r\n• Price for 25 lb\r\n• Tax & delivery\r\n\r\nThank you.';
    const preview = quotationEmailMarkup('Quote: arroz', text);
    const payload = quotationEmailPayload('Quote: arroz', text);
    expect(payload.html).toContain(preview);
    expect(preview).toContain('• Price for 25 lb<br>• Tax &amp; delivery');
    expect(payload.text).toBe(`${text}\n\n—\nPrepared with Surtario · Sourcing for your kitchen`);
    expect(preview).not.toMatch(/https?:\/\//);
  });
});

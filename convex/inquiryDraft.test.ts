// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { riceOffers, riceRequest } from "../fixtures/procurement";
const modules = import.meta.glob("./**/*.ts"),
  token = "a".repeat(64);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function setup() {
  const t = convexTest(schema, modules);
  const c = await t.mutation(api.comparisons.save, {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  const draft = await t.mutation(api.quotationMail.create, {
    token,
    comparisonId: c.id,
    clientId: crypto.randomUUID(),
  });
  return { t, draft };
}
function enable() {
  vi.stubEnv("QUOTATION_DRAFT_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("OPENAI_EXTRACTION_MODEL", "test-only");
}
test("real Agent draft is a saved suggestion, never a send or implicit revision; retry performs no new call", async () => {
  enable();
  const { t, draft } = await setup();
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          id: "r",
          output: [
            {
              type: "message",
              role: "assistant",
              id: "m",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    subject: "Confirm delivery terms",
                    text: "Could you confirm the freight and delivery terms for this rice? This is an inquiry, not an order.",
                  }),
                  annotations: [],
                },
              ],
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const result = await t.action(api.quotationMail.suggestInquiry, {
    token,
    id: draft.id,
    expectedRevision: 1,
  });
  expect(result.aiDraftStatus).toBe("complete");
  expect(result.text).toBe(draft.text);
  expect(result.revision).toBe(1);
  expect(result.approvedAt).toBeNull();
  expect(result.state).toBe("draft");
  await t.action(api.quotationMail.suggestInquiry, {
    token,
    id: draft.id,
    expectedRevision: 1,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  const revised = await t.mutation(api.quotationMail.reviseDraft, {
    token,
    id: draft.id,
    expectedRevision: 1,
    subject: result.aiDraftSubject!,
    text: result.aiDraftText!,
  });
  expect(revised.revision).toBe(2);
  expect(revised.recipient).toBe(draft.recipient);
  await expect(
    t.action(api.quotationMail.send, {
      token,
      id: draft.id,
      expectedRevision: 1,
      confirmed: true,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.quotationMail.reviseDraft, {
      token: "b".repeat(64),
      id: draft.id,
      expectedRevision: 2,
      subject: "Hello",
      text: "A different message",
    }),
  ).rejects.toThrow(/unavailable/);
});
test("interrupted generation unlocks manual editing and drops a late proposal", async () => {
  enable();
  const { t, draft } = await setup();
  await t.mutation(internal.quotationMail.reserveInquiry, {
    token,
    id: draft.id,
    expectedRevision: 1,
  });
  await expect(
    t.mutation(api.quotationMail.reviseDraft, {
      token,
      id: draft.id,
      expectedRevision: 1,
      subject: "Hello",
      text: "Review these terms",
    }),
  ).rejects.toThrow(/still running/);
  await t.mutation(internal.quotationMail.expireInquiry, { id: draft.id });
  await t.mutation(api.quotationMail.reviseDraft, {
    token,
    id: draft.id,
    expectedRevision: 1,
    subject: "Hello",
    text: "Review these terms",
  });
  const late = await t.mutation(internal.quotationMail.finishInquiry, {
    id: draft.id,
    proposal: { subject: "Late text", text: "This result arrived too late." },
  });
  expect(late.aiDraftStatus).toBe("failed");
  expect(late.text).toBe("Review these terms");
  expect(late.aiDraftText).toBeNull();
});

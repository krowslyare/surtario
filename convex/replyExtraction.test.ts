// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import type { ExtractedOffer } from "./researchValidators";

vi.mock("./lib/replyExtraction", () => ({
  extractReplyOfferWithAgent: vi.fn(),
}));

const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const replyText = [
  "Distribuidora de ejemplo",
  "Arroz blanco extra",
  "Saco 18 kg: PEN 80.00",
].join("\n");
const proposal: ExtractedOffer = {
  supplier: {
    value: "Distribuidora de ejemplo",
    evidence: "Distribuidora de ejemplo",
  },
  ingredient: { value: "Arroz", evidence: "Arroz blanco extra" },
  specification: { value: "Blanco extra", evidence: "Arroz blanco extra" },
  packageContent: { value: "18", evidence: "Saco 18 kg: PEN 80.00" },
  packageUnit: { value: "kg", evidence: "Saco 18 kg: PEN 80.00" },
  price: { value: "80.00", evidence: "Saco 18 kg: PEN 80.00" },
  currency: { value: "PEN", evidence: "Saco 18 kg: PEN 80.00" },
};

function enable() {
  vi.stubEnv("REPLY_EXTRACTION_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_EXTRACTION_MODEL", "test-model");
}

async function setup(simulated = true) {
  const t = convexTest(schema, modules);
  const requestId = await t.run(async (ctx) =>
    ctx.db.insert("quotationRequests", {
      ownerHash: await ownerHash(token),
      clientId: "fixture",
      simulated,
      recipient: "buyer@example.test",
      inboxId: "inbox-test",
      subject: "Consulta",
      text: "Solicitud original",
      state: "sent",
      revision: 3,
      idempotencyKey: "fixture",
      receipt: { messageId: "out", threadId: "thread" },
      failure: null,
      createdAt: 0,
      updatedAt: 0,
    }),
  );
  await t.run(async (ctx) =>
    ctx.db.insert("quotationReplies", {
      requestId,
      eventId: "event",
      messageId: "incoming",
      threadId: "thread",
      from: "buyer@example.test",
      text: replyText,
      receivedAt: "2026-09-09T12:00:00Z",
    }),
  );
  return { t, requestId };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("extracts only the owned stored reply and reuses the paid result", async () => {
  enable();
  const { t, requestId } = await setup();
  const { extractReplyOfferWithAgent } = await import("./lib/replyExtraction");
  vi.mocked(extractReplyOfferWithAgent).mockResolvedValue(proposal);
  expect(await t.query(api.quotationMail.status, {})).toMatchObject({
    extractionEnabled: true,
  });
  const args = { token, requestId, messageId: "incoming" };
  await expect(
    t.action(api.quotationMail.extractReply, {
      ...args,
      text: "Oferta falsa enviada por el navegador",
    } as never),
  ).rejects.toThrow();
  expect(extractReplyOfferWithAgent).not.toHaveBeenCalled();
  const extracted = await t.action(api.quotationMail.extractReply, args);
  expect(extracted.extraction).toEqual(proposal);
  expect(extracted.extractionStatus).toBe("complete");
  expect(extracted.extractionAttempts).toBe(1);
  expect(extracted.extractionAttempt).toBe(1);
  expect(extractReplyOfferWithAgent).toHaveBeenCalledWith(
    expect.anything(),
    replyText,
    "test-key",
    "test-model",
  );
  await t.action(api.quotationMail.extractReply, args);
  expect(extractReplyOfferWithAgent).toHaveBeenCalledTimes(1);
  await expect(
    t.action(api.quotationMail.extractReply, {
      ...args,
      token: "b".repeat(64),
    }),
  ).rejects.toThrow(/unavailable/);
});

test("disabled extraction cannot reserve or call the provider", async () => {
  const { t, requestId } = await setup();
  const { extractReplyOfferWithAgent } = await import("./lib/replyExtraction");
  await expect(
    t.action(api.quotationMail.extractReply, {
      token,
      requestId,
      messageId: "incoming",
    }),
  ).rejects.toThrow(/not enabled/);
  expect(extractReplyOfferWithAgent).not.toHaveBeenCalled();
  expect(
    (await t.query(api.quotationMail.list, { token }))[0].replies[0]
      .extractionStatus,
  ).toBe("idle");
});

test("sanitizes failures and allows only one explicit retry", async () => {
  enable();
  const { t, requestId } = await setup();
  const { extractReplyOfferWithAgent } = await import("./lib/replyExtraction");
  vi.mocked(extractReplyOfferWithAgent).mockRejectedValue(
    new Error("provider-secret"),
  );
  const args = { token, requestId, messageId: "incoming" };
  const first = await t.action(api.quotationMail.extractReply, args);
  expect(first.extractionStatus).toBe("failed");
  expect(first.extractionAttempts).toBe(1);
  expect(JSON.stringify(first)).not.toContain("provider-secret");
  const second = await t.action(api.quotationMail.extractReply, args);
  expect(second.extractionStatus).toBe("failed");
  expect(second.extractionAttempts).toBe(2);
  await expect(t.action(api.quotationMail.extractReply, args)).rejects.toThrow(
    /two-attempt limit/,
  );
  expect(extractReplyOfferWithAgent).toHaveBeenCalledTimes(2);
});

test("running and uncertain reservations never issue another paid call", async () => {
  enable();
  const { t, requestId } = await setup();
  const { extractReplyOfferWithAgent } = await import("./lib/replyExtraction");
  const args = { token, requestId, messageId: "incoming" };
  expect(
    (await t.mutation(internal.quotationMail.reserveReplyExtraction, args))
      .kind,
  ).toBe("reserved");
  await expect(t.action(api.quotationMail.extractReply, args)).rejects.toThrow(
    /already running/,
  );
  expect(extractReplyOfferWithAgent).not.toHaveBeenCalled();

  const other = await setup();
  vi.mocked(extractReplyOfferWithAgent).mockResolvedValueOnce(
    {} as ExtractedOffer,
  );
  const uncertain = {
    token,
    requestId: other.requestId,
    messageId: "incoming",
  };
  await expect(
    other.t.action(api.quotationMail.extractReply, uncertain),
  ).rejects.toThrow(/saving was not confirmed/);
  await expect(
    other.t.action(api.quotationMail.extractReply, uncertain),
  ).rejects.toThrow(/already running/);
  expect(extractReplyOfferWithAgent).toHaveBeenCalledTimes(1);
});

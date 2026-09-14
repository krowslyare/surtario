// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import { extractDocument, validateDocument } from "./lib/documentExtraction";
import files from "../fixtures/documentFiles.json";
vi.mock("./lib/documentExtraction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/documentExtraction")>()),
  extractDocument: vi.fn(),
}));
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const args = {
  token,
  clientId: "22222222-2222-4222-8222-222222222222",
  kind: "image" as const,
};
const result = {
  documentType: "quotation" as const,
  transcript: extractionSource.text,
  offer: extractionExample,
};
function enable() {
  vi.stubEnv("DOCUMENT_EXTRACTION_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_EXTRACTION_MODEL", "test-model");
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
test("disabled documents cannot call the provider", async () => {
  const t = convexTest(schema, modules);
  expect(await t.query(api.documents.status, {})).toBe(false);
  await expect(t.action(api.documents.extract, args)).rejects.toThrow(
    /not enabled/,
  );
  expect(extractDocument).not.toHaveBeenCalled();
});
test("each format sends only its server-owned binary and retry returns the saved result", async () => {
  enable();
  for (const kind of ["image", "pdf"] as const) {
    const t = convexTest(schema, modules);
    vi.mocked(extractDocument).mockResolvedValue(validateDocument(result));
    const saved = await t.action(api.documents.extract, { ...args, kind });
    expect(saved.result).toEqual(result);
    expect(extractDocument).toHaveBeenLastCalledWith(
      expect.anything(),
      files[kind],
      "test-key",
      "test-model",
    );
    const count = vi.mocked(extractDocument).mock.calls.length;
    expect((await t.action(api.documents.extract, { ...args, kind })).id).toBe(
      saved.id,
    );
    expect(extractDocument).toHaveBeenCalledTimes(count);
    expect(
      await t.query(api.documents.list, { token: "b".repeat(64) }),
    ).toEqual([]);
  }
});
test("running reservations cannot repeat a paid call or switch file identity", async () => {
  enable();
  const t = convexTest(schema, modules);
  await t.mutation(internal.documents.reserve, args);
  expect((await t.action(api.documents.extract, args)).status).toBe("running");
  await expect(
    t.action(api.documents.extract, { ...args, kind: "pdf" }),
  ).rejects.toThrow(/different file/);
  expect(extractDocument).not.toHaveBeenCalled();
});
test("provider failure is sanitized and not automatically retried", async () => {
  enable();
  const t = convexTest(schema, modules);
  vi.mocked(extractDocument).mockRejectedValue(
    new Error("private provider detail"),
  );
  const run = await t.action(api.documents.extract, args);
  expect(run.status).toBe("failed");
  expect(JSON.stringify(run)).not.toContain("private provider detail");
  await t.action(api.documents.extract, args);
  expect(extractDocument).toHaveBeenCalledTimes(1);
});
test("cooldown and total quota reject before another provider call", async () => {
  enable();
  const t = convexTest(schema, modules);
  await t.mutation(internal.documents.reserve, args);
  await expect(
    t.mutation(internal.documents.reserve, {
      ...args,
      clientId: "33333333-3333-4333-8333-333333333333",
    }),
  ).rejects.toThrow(/30 seconds/);
  const full = convexTest(schema, modules);
  await full.run(async (ctx) => {
    for (let i = 0; i < 100; i++)
      await ctx.db.insert("documentRuns", {
        ownerHash: "other",
        clientId: String(i),
        kind: "pdf",
        createdAt: 0,
        status: "failed",
        result: null,
        error: null,
      });
  });
  await expect(full.action(api.documents.extract, args)).rejects.toThrow(
    /limit/,
  );
  expect(extractDocument).not.toHaveBeenCalled();
});
test("classification, citations and text bounds are enforced", () => {
  expect(validateDocument(result)).toEqual(result);
  expect(() =>
    validateDocument({ ...result, documentType: "purchase" }),
  ).toThrow(/Non-quotation/);
  expect(() =>
    validateDocument({ ...result, transcript: "unrelated text" }),
  ).toThrow(/quote/);
  expect(() =>
    validateDocument({ ...result, transcript: "x".repeat(12001) }),
  ).toThrow();
});

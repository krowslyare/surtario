// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { extractionExample } from "../fixtures/extraction";
vi.mock("./lib/agentExtraction", () => ({
  analyzeWebSourceWithAgent: vi.fn(async () => ({
    offer: extractionExample,
    analysis: {
      kind: "product",
      summary: "Oferta de arroz para revisar.",
      evidence: ["Saco: S/ 80.00"],
      warnings: [],
    },
  })),
}));
const modules = import.meta.glob("./**/*.ts");
const draft = {
  token: "a".repeat(64),
  clientId: "11111111-1111-4111-8111-111111111111",
  ingredient: "Arroz",
  region: "Lima",
};
const source = {
  url: "https://supplier.test/rice",
  title: "Arroz",
  description: "Catálogo",
  markdown: "Saco: S/ 80.00",
  contentTruncated: false,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function enable() {
  for (const key of [
    "FIRECRAWL_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_EXTRACTION_MODEL",
  ])
    vi.stubEnv(key, "test-only");
  vi.stubEnv("LIVE_RESEARCH_ENABLED", "true");
}
test("disabled public search cannot spend or write; status contains no credentials", async () => {
  const t = convexTest(schema, modules);
  vi.stubEnv("LIVE_RESEARCH_ENABLED", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(await t.query(api.research.status, {})).toEqual({
    searchEnabled: false,
    extractionEnabled: false,
  });
  await expect(t.action(api.research.search, draft)).rejects.toThrow(
    /not enabled/,
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(await t.query(api.research.list, { token: draft.token })).toEqual([]);
});
test("one reservation per client id, owner isolation, conflict and cooldown", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(internal.research.reserveSearch, draft);
  expect(first.kind).toBe("reserved");
  expect((await t.mutation(internal.research.reserveSearch, draft)).kind).toBe(
    "existing",
  );
  await expect(
    t.mutation(internal.research.reserveSearch, {
      ...draft,
      ingredient: "Otro",
    }),
  ).rejects.toThrow(/different data/);
  await expect(
    t.mutation(internal.research.reserveSearch, {
      ...draft,
      clientId: "22222222-2222-4222-8222-222222222222",
    }),
  ).rejects.toThrow(/30 seconds/);
  expect(await t.query(api.research.list, { token: "b".repeat(64) })).toEqual(
    [],
  );
  await expect(
    t.mutation(internal.research.reserveExtraction, {
      token: "b".repeat(64),
      runId: first.run.id,
      sourceIndex: 0,
    }),
  ).rejects.toThrow(/unavailable/);
  expect(first.run).not.toHaveProperty("ownerHash");
  expect(first.run.simulated).toBe(false);
});
test("mocked provider search persists source and retry never repeats paid call", async () => {
  enable();
  const t = convexTest(schema, modules);
  const fetch = vi.fn(
    async (_url: unknown) =>
      new Response(
        JSON.stringify({
          success: true,
          data: { web: [{ ...source, url: "https://supplier.com/rice" }] },
        }),
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const run = await t.action(api.research.search, draft);
  expect(run.status).toBe("complete");
  expect(run.simulated).toBe(false);
  expect(run.sources).toHaveLength(1);
  expect(run.sources[0].extraction).toBeNull();
  await t.action(api.research.search, draft);
  expect(fetch).toHaveBeenCalledTimes(1);
  const offer = await t.action(api.research.extract, {
    token: draft.token,
    runId: run.id,
    sourceIndex: 0,
  });
  expect(offer).toEqual(extractionExample);
  const { analyzeWebSourceWithAgent } = await import("./lib/agentExtraction");
  await t.action(api.research.extract, {
    token: draft.token,
    runId: run.id,
    sourceIndex: 0,
  });
  expect(analyzeWebSourceWithAgent).toHaveBeenCalledTimes(1);
  expect(
    (await t.query(api.research.list, { token: draft.token }))[0].sources[0]
      .extractionStatus,
  ).toBe("complete");
});
test("loopback rehearsal records synthetic provenance on the research run", async () => {
  enable();
  vi.stubEnv("CONVEX_CLOUD_URL", "http://127.0.0.1:3240");
  vi.stubEnv("REHEARSAL_BRIDGE_URL", "http://127.0.0.1:8789");
  vi.stubEnv("REHEARSAL_BRIDGE_TOKEN", "r".repeat(64));
  const t = convexTest(schema, modules);
  const fetch = vi.fn(
    async (_url: unknown) =>
      new Response(
        JSON.stringify({
          success: true,
          data: { web: [{ ...source, url: "https://supplier.com/rice" }] },
        }),
      ),
  );
  vi.stubGlobal("fetch", fetch);
  const run = await t.action(api.research.search, draft);
  expect(run.simulated).toBe(true);
  expect(String(fetch.mock.calls[0][0])).toBe(
    "http://127.0.0.1:8789/firecrawl/v2/search",
  );
  await t.run(async (ctx) => {
    expect((await ctx.db.get(run.id))?.simulated).toBe(true);
  });
  vi.stubEnv("REHEARSAL_BRIDGE_URL", "");
  vi.stubEnv("REHEARSAL_BRIDGE_TOKEN", "");
  expect(
    (await t.query(api.research.list, { token: draft.token }))[0].simulated,
  ).toBe(true);
});
test("failures are sanitized and extraction attempts bounded", async () => {
  enable();
  const t = convexTest(schema, modules);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("provider-secret-body");
    }),
  );
  const failed = await t.action(api.research.search, draft);
  expect(failed.status).toBe("failed");
  expect(JSON.stringify(failed)).not.toContain("provider-secret-body");
  const other = await t.mutation(internal.research.reserveSearch, {
    ...draft,
    token: "c".repeat(64),
  });
  await t.mutation(internal.research.finishSearch, {
    id: other.run.id,
    sources: [source, { ...source, markdown: null }],
    discarded: 0,
    warning: false,
    simulated: false,
  });
  const args = { token: "c".repeat(64), runId: other.run.id, sourceIndex: 0 };
  expect(
    (await t.mutation(internal.research.reserveExtraction, args)).kind,
  ).toBe("reserved");
  expect(
    (await t.mutation(internal.research.reserveExtraction, args)).kind,
  ).toBe("running");
  await t.mutation(internal.research.failExtraction, {
    runId: other.run.id,
    sourceIndex: 0,
  });
  await t.mutation(internal.research.reserveExtraction, args);
  await t.mutation(internal.research.failExtraction, {
    runId: other.run.id,
    sourceIndex: 0,
  });
  await expect(
    t.mutation(internal.research.reserveExtraction, args),
  ).rejects.toThrow(/two-attempt/);
  await expect(
    t.mutation(internal.research.reserveExtraction, {
      ...args,
      sourceIndex: 1,
    }),
  ).rejects.toThrow(/no text/);
});

test("session and global reservations enforce lifetime spend ceilings", async () => {
  const t = convexTest(schema, modules);
  const first = await t.mutation(internal.research.reserveSearch, draft);
  await t.run(async (ctx) => {
    const doc = (await ctx.db.get(first.run.id))!;
    const { _id, _creationTime, ...fields } = doc;
    await ctx.db.patch(_id, { createdAt: 0 });
    for (let i = 1; i < 500; i++)
      await ctx.db.insert("researchRuns", {
        ...fields,
        createdAt: 0,
        clientId: String(i),
        ownerHash: i < 10 ? fields.ownerHash : "other",
      });
  });
  await expect(
    t.mutation(internal.research.reserveSearch, {
      ...draft,
      clientId: "22222222-2222-4222-8222-222222222222",
    }),
  ).rejects.toThrow(/10 live searches/);
  await expect(
    t.mutation(internal.research.reserveSearch, {
      ...draft,
      token: "d".repeat(64),
    }),
  ).rejects.toThrow(/capacity/);
});

test("uncertain persistence after model response cannot issue another paid extraction", async () => {
  enable();
  const t = convexTest(schema, modules);
  const run = await t.mutation(internal.research.reserveSearch, draft);
  await t.mutation(internal.research.finishSearch, {
    id: run.run.id,
    sources: [source],
    discarded: 0,
    warning: false,
    simulated: false,
  });
  const { analyzeWebSourceWithAgent } = await import("./lib/agentExtraction");
  // Force the commit validator to reject the result, representing failed persistence.
  vi.mocked(analyzeWebSourceWithAgent).mockResolvedValueOnce(
    {} as Awaited<ReturnType<typeof analyzeWebSourceWithAgent>>,
  );
  const args = { token: draft.token, runId: run.run.id, sourceIndex: 0 };
  await expect(t.action(api.research.extract, args)).rejects.toThrow(
    /saving could not be confirmed/,
  );
  expect(
    (await t.query(api.research.list, { token: draft.token }))[0].sources[0]
      .extractionStatus,
  ).toBe("running");
  await expect(t.action(api.research.extract, args)).rejects.toThrow(
    /already running/,
  );
  expect(analyzeWebSourceWithAgent).toHaveBeenCalledTimes(1);
});

// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { evidenceValues, compareObservation } from "./lib/watchEvidence";
import { extractionToPurchase, draftValues } from "../src/domain/extraction";
import { ownerHash } from "./lib/demoSession";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64),
  other = "b".repeat(64);
const field = (value: string) => ({ value, evidence: value });
const offer = {
  supplier: field("Rice Supply"),
  ingredient: field("Rice"),
  specification: field("White rice"),
  price: field("20"),
  currency: field("USD"),
  packageContent: field("25"),
  packageUnit: field("lb"),
};
const source = {
  url: "https://example.com/rice",
  title: "White rice",
  description: "Rice supply",
  markdown: "Rice Supply\nWhite rice\n25 lb\nUSD 20",
  contentTruncated: false,
  analysis: {
    kind: "product" as const,
    summary: "Rice price",
    evidence: ["USD 20"],
    warnings: [],
  },
  extraction: offer,
  extractionStatus: "complete" as const,
  extractionError: null,
  extractionAttempts: 1,
};
function enable() {
  for (const name of [
    "SOURCING_ENABLED",
    "SOURCE_WATCH_ENABLED",
    "LIVE_RESEARCH_ENABLED",
  ])
    vi.stubEnv(name, "true");
  for (const name of [
    "FIRECRAWL_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_EXTRACTION_MODEL",
  ])
    vi.stubEnv(name, "test-only");
}
function instance() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  return t;
}
async function create(t: ReturnType<typeof instance>) {
  return t.mutation(api.sourcing.create, {
    token,
    ingredient: "Rice",
    region: "Portland",
    objective: "Find comparable rice packages",
  });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("starts without documents, quantity or selected offers; retries and session boundaries", async () => {
  const t = instance(),
    id = await create(t);
  expect(await create(t)).toBe(id);
  expect(await t.query(api.sourcing.list, { token })).toHaveLength(1);
  expect(
    (await t.query(api.sourcing.get, { token, caseId: id })).case.status,
  ).toBe("idle");
  expect(await t.query(api.sourcing.list, { token: other })).toEqual([]);
  for (const ref of [api.sourcing.get, api.sourcing.research])
    await expect(t.query(ref, { token: other, caseId: id })).rejects.toThrow(
      /unavailable/,
    );
  await expect(
    t.mutation(api.sourcing.start, { token, caseId: id }),
  ).rejects.toThrow(/not enabled/);
  await expect(
    t.mutation(api.sourcing.cancel, { token: other, caseId: id }),
  ).rejects.toThrow(/unavailable/);
});

test("late and duplicate step results cannot update a canceled or advanced case", async () => {
  const t = instance(),
    id = await create(t);
  await t.run((ctx) => ctx.db.patch(id, { status: "running", revision: 2 }));
  const args = {
    caseId: id,
    revision: 2,
    step: 0,
    reason: "Read a relevant source",
    query: "Rice packs",
    sources: [source],
  };
  expect(await t.mutation(internal.sourcing.recordStep, args)).toBe(true);
  expect(await t.mutation(internal.sourcing.recordStep, args)).toBe(false);
  await t.mutation(api.sourcing.cancel, { token, caseId: id });
  expect(
    await t.mutation(internal.sourcing.recordStep, { ...args, step: 1 }),
  ).toBe(false);
  await t.mutation(internal.sourcing.finish, {
    caseId: id,
    revision: 2,
    summary: "late",
    failed: false,
  });
  const result = await t.query(api.sourcing.get, { token, caseId: id });
  expect(result.case.status).toBe("canceled");
  expect(result.case.researchRunIds).toHaveLength(1);
});

function envelope(output: unknown) {
  return new Response(
    JSON.stringify({
      id: "response-test",
      output: [
        {
          id: "message-test",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(output),
              annotations: [],
            },
          ],
        },
      ],
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
test("durable workflow researches, observes the result, then stops; no emails or duplicate start", async () => {
  enable();
  vi.useFakeTimers();
  const t = instance(),
    id = await create(t);
  let plans = 0;
  const fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    if (String(url).includes("firecrawl"))
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            web: [
              {
                url: source.url,
                title: "White rice",
                description: "Rice supplier",
                markdown: "Rice Supply\nWhite rice\n25 lb\nUSD 20",
              },
            ],
          },
        }),
      );
    if (body.text.format.schema.properties.action) {
      plans++;
      return envelope(
        plans === 1
          ? {
              action: "search",
              query: "rice bulk packs",
              url: "",
              reason: "Find explicit pack sizes and prices.",
            }
          : {
              action: "stop",
              query: "",
              url: "",
              reason:
                "A product source is available for review; confirm missing delivery terms with the supplier.",
            },
      );
    }
    const f = (value: string, line: number) => ({
      value,
      evidenceLineNumber: line,
    });
    return envelope({
      analysis: {
        kind: "product",
        summary: "White rice with pack price.",
        evidenceLineNumbers: [3, 4, 5],
        warnings: ["Delivery is not stated."],
      },
      offer: {
        supplier: f("Rice Supply", 2),
        ingredient: f("Rice", 3),
        specification: f("White rice", 3),
        packageContent: f("25", 4),
        packageUnit: f("lb", 4),
        price: f("20", 5),
        currency: f("USD", 5),
      },
    });
  });
  vi.stubGlobal("fetch", fetch);
  await t.mutation(api.sourcing.start, { token, caseId: id });
  await t.mutation(api.sourcing.start, { token, caseId: id });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const result = await t.query(api.sourcing.get, { token, caseId: id });
  expect(result.case.status).toBe("complete");
  expect(result.case.steps).toBe(1);
  expect(plans).toBe(2);
  expect(fetch).toHaveBeenCalledTimes(4);
  const runs = await t.query(api.sourcing.research, { token, caseId: id });
  expect(runs[0].sources[0].extraction?.price.value).toBe("20");
  expect(result.case.summary).toContain("missing delivery");
});

test("planner refuses links absent from evidence and duplicate searches stop before external IO", async () => {
  enable();
  const t = instance(),
    id = await create(t);
  await t.run((ctx) => ctx.db.patch(id, { status: "running", revision: 2 }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      envelope({
        action: "read",
        query: "",
        url: "https://unrelated.test/",
        reason: "read",
      }),
    ),
  );
  await expect(
    t.action(internal.sourcingWorkflow.plan, { caseId: id, revision: 2 }),
  ).rejects.toThrow(/outside/);
  await t.mutation(internal.sourcing.recordStep, {
    caseId: id,
    revision: 2,
    step: 0,
    reason: "read",
    query: "Rice bulk packs",
    sources: [source],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      envelope({
        action: "search",
        query: "bulk packs",
        url: "",
        reason: "repeat",
      }),
    ),
  );
  expect(
    (
      await t.action(internal.sourcingWorkflow.plan, {
        caseId: id,
        revision: 2,
      })
    )?.action,
  ).toBe("stop");
});

async function watched(t: ReturnType<typeof instance>) {
  const id = await create(t);
  const baseline = JSON.stringify(evidenceValues(offer));
  const watchId = await t.run((ctx) =>
    ctx.db.insert("sourceWatches", {
      caseId: id,
      resultId: "source-one",
      url: source.url,
      title: source.title,
      baseline,
      lastObservation: baseline,
      status: "checking",
      nextCheckAt: Date.now() + 600000,
      expiresAt: Date.now() + 604800000,
      checks: 1,
      revision: 2,
      lastOutcome: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  return { id, watchId, baseline };
}
test("source changes produce reviewable evidence once; failed reads and late results do not mutate confirmed terms", async () => {
  const t = instance();
  const { id, watchId } = await watched(t);
  await t.mutation(internal.sourcingWatch.finish, {
    watchId,
    revision: 2,
    source: { ...source, extraction: { ...offer, price: field("24") } },
  });
  await t.mutation(internal.sourcingWatch.finish, {
    watchId,
    revision: 2,
    source: { ...source, extraction: { ...offer, price: field("24") } },
  });
  let detail = await t.query(api.sourcing.get, { token, caseId: id });
  expect(detail.watches[0].lastOutcome).toBe("changed");
  expect(detail.case.researchRunIds).toHaveLength(1);
  expect(detail.events.filter((e) => e.kind === "watch_changed")).toHaveLength(
    1,
  );
  await t.run((ctx) =>
    ctx.db.patch(watchId, { status: "checking", revision: 3 }),
  );
  await t.mutation(internal.sourcingWatch.finish, {
    watchId,
    revision: 3,
    source: null,
  });
  detail = await t.query(api.sourcing.get, { token, caseId: id });
  expect(detail.watches[0].lastOutcome).toBe("unverified");
  expect(detail.case.researchRunIds).toHaveLength(1);
  await expect(
    t.mutation(api.sourcing.stopWatch, { token: other, watchId }),
  ).rejects.toThrow(/unavailable/);
  await t.run((ctx) =>
    ctx.db.patch(watchId, { status: "checking", revision: 4 }),
  );
  await t.mutation(api.sourcing.stopWatch, { token, watchId });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await t.action(internal.sourcingWatch.check, {
    watchId,
    revision: 4,
    ingredient: "Rice",
    region: "Portland",
    url: source.url,
  });
  expect(fetch).not.toHaveBeenCalled();

  await t.mutation(internal.sourcingWatch.finish, {
    watchId,
    revision: 4,
    source,
  });
  expect(
    (await t.query(api.sourcing.get, { token, caseId: id })).watches[0].status,
  ).toBe("stopped");
});

test("observation compares canonical values, blocks product/currency changes and missing price", () => {
  const baseline = JSON.stringify(evidenceValues(offer));
  expect(
    compareObservation(
      baseline,
      baseline,
      { ...offer, price: field("20.00") },
      "product",
    ).outcome,
  ).toBe("unchanged");
  expect(
    compareObservation(
      baseline,
      baseline,
      { ...offer, specification: field("Brown rice") },
      "product",
    ).outcome,
  ).toBe("unverified");
  expect(
    compareObservation(
      baseline,
      baseline,
      { ...offer, currency: field("PEN") },
      "product",
    ).outcome,
  ).toBe("unverified");
  expect(
    compareObservation(
      baseline,
      baseline,
      { ...offer, price: { value: null, evidence: null } },
      "product",
    ).outcome,
  ).toBe("unverified");
  expect(
    compareObservation(
      baseline,
      baseline,
      { ...offer, price: field("18") },
      "catalog",
    ).outcome,
  ).toBe("unverified");
});

test("watch registration requires owned selected real reviewed source and has one explicit schedule", async () => {
  enable();
  const t = instance();
  const id = await create(t);
  await expect(
    t.mutation(api.sourcing.watch, { token, caseId: id, resultId: "fake" }),
  ).rejects.toThrow(/reviewed/);
  const hash = await ownerHash(token);
  const values = draftValues(offer);
  const seed = extractionToPurchase(
    {
      id: "real:0",
      title: source.title,
      text: source.markdown,
      url: source.url,
      observedAt: "2026-09-14",
      simulated: false,
    },
    offer,
    values,
    true,
  );
  seed.sources["real:0"].webReview = {
    runId: "fake",
    sourceIndex: 0,
    values,
    confirmed: true,
  };
  const studyId = await t.run((ctx) =>
    ctx.db.insert("studies", {
      ownerHash: hash,
      clientId: crypto.randomUUID(),
      term: "Rice",
      region: "Portland",
      results: [],
      selectedIds: [],
      revision: 1,
      updatedAt: Date.now(),
      webSelections: [{ sourceId: "real:0", seed }],
    }),
  );
  await t.mutation(api.sourcing.attachStudy, { token, caseId: id, studyId });
  const watchId = await t.mutation(api.sourcing.watch, {
    token,
    caseId: id,
    resultId: "real:0",
  });
  expect(
    await t.mutation(api.sourcing.watch, {
      token,
      caseId: id,
      resultId: "real:0",
    }),
  ).toBe(watchId);
  const detail = await t.query(api.sourcing.get, { token, caseId: id });
  expect(detail.watchableSources).toHaveLength(1);
  expect(detail.watches[0].nextCheckAt - detail.watches[0].createdAt).toBe(
    86400000,
  );
  expect(detail.watches[0].expiresAt - detail.watches[0].createdAt).toBe(
    604800000,
  );
  await expect(
    t.mutation(api.sourcing.attachStudy, { token: other, caseId: id, studyId }),
  ).rejects.toThrow(/unavailable/);
});

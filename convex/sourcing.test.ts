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
test("workflow refuses one-source completion, expands queries, then stops after two rounds without new evidence", async () => {
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
  expect(result.case.steps).toBe(3);
  expect(plans).toBe(3);
  expect(fetch).toHaveBeenCalledTimes(7);
  const runs = await t.query(api.sourcing.research, { token, caseId: id });
  expect(runs[0].sources[0].extraction?.price.value).toBe("20");
  expect(result.case.stopReason).toBe("diminishing_returns");
  expect(result.case.summary).toContain("incomplete");
  expect(
    fetch.mock.calls.every(([url]) => !String(url).includes("agentmail")),
  ).toBe(true);
});

test("planner refuses unauthorized links and replaces duplicate searches with a new gap-directed query", async () => {
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
  ).toBe("search");
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

test("incremental interpretation preserves ownership, revision, and idempotency", async () => {
  const t = instance(),
    id = await create(t);
  await t.run((ctx) => ctx.db.patch(id, { status: "running", revision: 2 }));
  const idle = {
    ...source,
    analysis: undefined,
    extraction: null,
    extractionStatus: "idle" as const,
    extractionAttempts: 0,
  };
  await t.mutation(internal.sourcing.recordStep, {
    caseId: id,
    revision: 2,
    step: 0,
    query: "Rice price",
    reason: "Explore",
    sources: [idle],
  });
  const runs = await t.query(api.sourcing.research, { token, caseId: id });
  const args = {
    caseId: id,
    revision: 2,
    runId: runs[0].id,
    sourceIndex: 0,
    source,
  };
  await t.mutation(internal.sourcing.recordAnalysis, { ...args, revision: 1 });
  expect(
    (await t.query(api.sourcing.research, { token, caseId: id }))[0].sources[0]
      .extractionStatus,
  ).toBe("idle");
  await t.mutation(internal.sourcing.recordAnalysis, args);
  await t.mutation(internal.sourcing.recordAnalysis, {
    ...args,
    source: { ...source, extraction: { ...offer, price: field("999") } },
  });
  expect(
    (await t.query(api.sourcing.research, { token, caseId: id }))[0].sources[0]
      .extraction?.price.value,
  ).toBe("20");
  await expect(
    t.query(api.sourcing.research, { token: "c".repeat(64), caseId: id }),
  ).rejects.toThrow();
  await t.mutation(api.sourcing.cancel, { token, caseId: id });
  await t.mutation(internal.sourcing.recordAnalysis, args);
  expect(
    (await t.query(api.sourcing.get, { token, caseId: id })).case.status,
  ).toBe("canceled");
});

test("later rounds can add a better-priced candidate and budget exhaustion never claims completeness", async () => {
  enable();
  vi.useFakeTimers();
  const t = instance(),
    id = await create(t);
  let plans = 0,
    searches = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (String(url).includes("firecrawl")) {
        searches++;
        return Response.json({
          success: true,
          data: {
            web: [
              {
                url: `https://supplier${searches}.com/product/rice`,
                title: "Rice wholesale",
                markdown: `Rice supplier ${searches}\nRice\n25 lb\nUSD ${searches === 6 ? "12" : "20"}`,
              },
            ],
          },
        });
      }
      if (body.text.format.schema.properties.action) {
        plans++;
        return envelope({
          action: "search",
          query: `Rice independent supplier round ${plans}`,
          url: "",
          reason:
            "Investigate independent alternatives and missing delivery evidence.",
        });
      }
      const f = (value: string, line: number) => ({
        value,
        evidenceLineNumber: line,
      });
      return envelope({
        analysis: {
          kind: "product",
          summary: "Published rice package; delivery unknown.",
          warnings: ["Delivery unknown."],
          evidenceLineNumbers: [3, 4, 5],
        },
        offer: {
          supplier: f(`Rice supplier ${searches}`, 2),
          ingredient: f("Rice", 3),
          specification: f("Rice", 3),
          packageContent: f("25", 4),
          packageUnit: f("lb", 4),
          price: f(searches === 6 ? "12" : "20", 5),
          currency: f("USD", 5),
        },
      });
    }),
  );
  await t.mutation(api.sourcing.start, { token, caseId: id }); // Six rounds schedule more than the harness default 100 workflow/workpool jobs.
  await t.finishAllScheduledFunctions(vi.runAllTimers, 250);
  const detail = await t.query(api.sourcing.get, { token, caseId: id });
  const runs = await t.query(api.sourcing.research, { token, caseId: id });
  expect(searches).toBe(6);
  expect(detail.case.stopReason).toBe("budget");
  expect(detail.case.summary).toContain("incomplete");
  expect(runs).toHaveLength(6);
  expect(runs[5].sources[0].extraction?.price.value).toBe("12");
  expect(runs[0].sources[0].extraction?.price.value).toBe("20");
});

test("an unreadable allowed page is preserved as failed evidence without crashing the case", async () => {
  enable();
  const t = instance(),
    id = await create(t);
  await t.run((ctx) => ctx.db.patch(id, { status: "running", revision: 2 }));
  const unread = {
    ...source,
    markdown: null,
    analysis: undefined,
    extraction: null,
    extractionStatus: "idle" as const,
    extractionAttempts: 0,
  };
  await t.mutation(internal.sourcing.recordStep, {
    caseId: id,
    revision: 2,
    step: 0,
    reason: "Discover",
    query: "Rice suppliers",
    sources: [unread],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ success: true, data: { markdown: "", metadata: {} } }),
    ),
  );
  const result = await t.action(internal.sourcingWorkflow.investigate, {
    caseId: id,
    revision: 2,
    plan: {
      action: "read",
      url: source.url,
      query: "",
      reason: "Recover price",
    },
  });
  expect(result?.warning).toBe(true);
  expect(result?.sources[0].extractionStatus).toBe("failed");
  expect(result?.sources[0].markdown).toBeNull();
  expect(
    (await t.query(api.sourcing.get, { token, caseId: id })).case.status,
  ).toBe("running");
});

test("a changed watch retains twelve research rounds and leaves the confirmed comparison untouched", async () => {
  const t = instance();
  const { id, watchId } = await watched(t);
  const comparisonId = await t.run(async ctx => {
    const { riceRequest, riceOffers } = await import("../fixtures/procurement");
    const comparisonId = await ctx.db.insert("comparisons", { ownerHash: await ownerHash(token), clientId: "test-retention", request: riceRequest, offers: riceOffers, sources: {}, selectedOfferId: riceOffers[0].id, revision: 4, updatedAt: Date.now() });
    await ctx.db.patch(id, { comparisonId, status: "running", revision: 2 });
    return comparisonId;
  });
  for (let round = 0; round < 12; round++) {
    await t.run(ctx => ctx.db.patch(id, { steps: round % 6 }));
    await t.mutation(internal.sourcing.recordStep, { caseId: id, revision: 2, step: round % 6, reason: "Retained round", query: `rice ${round}`, sources: [{ ...source, url: `https://example.com/rice-${round}` }] });
  }
  const before = await t.run(ctx => ctx.db.get(comparisonId));
  const ids = (await t.query(api.sourcing.get, { token, caseId: id })).case.researchRunIds;
  await t.mutation(internal.sourcingWatch.finish, { watchId, revision: 2, source: { ...source, extraction: { ...offer, price: field("24") } } });
  const detail = await t.query(api.sourcing.get, { token, caseId: id });
  expect(detail.case.researchRunIds.slice(0, 12)).toEqual(ids);
  expect(await t.query(api.sourcing.research, { token, caseId: id })).toHaveLength(13);
  expect((await t.query(internal.sourcing.snapshot, { caseId: id, revision: 2 }))?.runs).toHaveLength(13);
  expect(await t.run(ctx => ctx.db.get(comparisonId))).toEqual(before);
});

test("watch clock advances unchanged observations, recovers timed-out checks and expires without touching confirmed data", async () => {
 vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-17T00:00:00Z"));enable();
 const t=instance();const {id,watchId}=await watched(t);
 await t.mutation(internal.sourcingWatch.finish,{watchId,revision:2,source});
 let detail=await t.query(api.sourcing.get,{token,caseId:id});
 expect(detail.watches[0].lastOutcome).toBe("unchanged");expect(detail.case.researchRunIds).toHaveLength(0);
 await t.run(ctx=>ctx.db.patch(watchId,{status:"checking",nextCheckAt:Date.now()+600000,revision:3}));
 vi.setSystemTime(Date.now()+600001);await t.mutation(internal.sourcingWatch.due,{});
 detail=await t.query(api.sourcing.get,{token,caseId:id});
 expect(detail.watches[0]).toMatchObject({status:"active",lastOutcome:"unverified"});
 await t.run(ctx=>ctx.db.patch(watchId,{checks:7,nextCheckAt:Date.now()}));
 await t.mutation(internal.sourcingWatch.due,{});
 expect((await t.query(api.sourcing.get,{token,caseId:id})).watches[0].status).toBe("expired");
});

for (const liveWeb of [false, true]) test(`watch provenance follows web transport when Luna bridge is enabled (${liveWeb})`, async () => {
 const t=instance();const {id,watchId}=await watched(t);
 vi.stubEnv("CONVEX_CLOUD_URL","http://127.0.0.1:3280");vi.stubEnv("REHEARSAL_BRIDGE_URL","http://127.0.0.1:8789");vi.stubEnv("REHEARSAL_BRIDGE_TOKEN","a".repeat(64));vi.stubEnv("REHEARSAL_LIVE_FIRECRAWL",String(liveWeb));
 await t.mutation(internal.sourcingWatch.finish,{watchId,revision:2,source:{...source,extraction:{...offer,price:field("24")}}});
 expect((await t.query(api.sourcing.research,{token,caseId:id}))[0].simulated).toBe(!liveWeb);
});


test("progress deduplicates long source URLs and retains interpretation without copying URLs into the case", async () => {
  const t = instance(), id = await create(t);
  await t.run(ctx => ctx.db.patch(id, { status: "running", revision: 2 }));
  const url = `https://example.com/rice?context=${"a".repeat(20000)}`;
  const unread = { ...source, url, extractionStatus: "idle" as const, extraction: null };
  await t.mutation(internal.sourcing.recordStep, { caseId: id, revision: 2, step: 0, reason: "Find rice", query: "rice", sources: [unread, unread] });
  let saved = await t.run(ctx => ctx.db.get(id));
  expect(saved?.sourceProgress).toHaveLength(1);
  expect(JSON.stringify(saved?.sourceProgress).length).toBeLessThan(150);
  await t.mutation(internal.sourcing.recordAnalysis, { caseId: id, revision: 2, runId: saved!.researchRunIds[0], sourceIndex: 0, source: { ...source, url } });
  await t.mutation(internal.sourcing.recordStep, { caseId: id, revision: 2, step: 1, reason: "Check rice again", query: "rice", sources: [unread] });
  saved = await t.run(ctx => ctx.db.get(id));
  expect(saved?.sourceProgress).toHaveLength(1);
  expect(saved?.sourceProgress?.[0].interpreted).toBe(true);
});

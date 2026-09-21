// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
const modules = import.meta.glob("./**/*.ts");
const token = "c".repeat(64),
  other = "d".repeat(64);
function setup() {
  for (const name of [
    "SOURCING_ENABLED",
    "LIVE_RESEARCH_ENABLED",
    "DOCUMENT_EXTRACTION_ENABLED",
  ])
    vi.stubEnv(name, "true");
  for (const name of [
    "FIRECRAWL_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_EXTRACTION_MODEL",
  ])
    vi.stubEnv(name, "test-only");
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  return t;
}
const selection = (names = ["Rice", "Flour", "Oil", "Onions"]) => ({
  token,
  clientId: crypto.randomUUID(),
  title: "Kitchen list",
  region: "Portland",
  sourceKind: "manual" as const,
  rows: names.map((ingredient, i) => ({
    id: String(i),
    ingredient,
    original: `${ingredient} — 40 lb`,
    reference: `Line ${i + 1}`,
    needsReview: false,
  })),
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
test("capacity is atomic, request replay is stable, and another session cannot read or control a batch", async () => {
  vi.useFakeTimers();
  const t = setup(),
    input = selection();
  const id = await t.mutation(api.ingredientBatches.create, input);
  expect(await t.mutation(api.ingredientBatches.create, input)).toBe(id);
  const own = await t.query(api.ingredientBatches.list, { token });
  expect(own.remaining).toBe(6);
  expect(own.batches[0].cases).toHaveLength(4);
  expect(own.batches[0].cases.every((c) => !c.studyId && !c.comparisonId)).toBe(
    true,
  );
  expect(
    (await t.query(api.ingredientBatches.list, { token: other })).batches,
  ).toEqual([]);
  const caseId = own.batches[0].rows[0].caseId;
  await expect(
    t.mutation(api.ingredientBatches.cancelQueued, {
      token: other,
      batchId: id,
      caseId,
    }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.ingredientBatches.retry, {
      token: other,
      batchId: id,
      caseId,
      attempt: 0,
    }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.ingredientBatches.create, { ...input, region: "Lima" }),
  ).rejects.toThrow(/different selection/);
  await expect(
    t.mutation(api.ingredientBatches.create, selection()),
  ).rejects.toThrow(/current research/);
  await t.mutation(api.ingredientBatches.cancelQueued, {
    token,
    batchId: id,
    caseId,
  });
  expect((await t.query(api.sourcing.get, { token, caseId })).case.status).toBe(
    "canceled",
  );
  expect(
    (await t.query(api.ingredientBatches.list, { token })).batches[0].rows[0]
      .state,
  ).toBe("settled");
  const t2 = setup();
  const hash = await ownerHash(token);
  await t2.run(async (ctx) => {
    for (let i = 0; i < 8; i++)
      await ctx.db.insert("sourcingCases", {
        ownerHash: hash,
        ingredient: `Existing ${i}`,
        region: "Portland",
        objective: "test",
        status: "complete",
        revision: 1,
        steps: 0,
        runs: 0,
        researchRunIds: [],
        summary: "done",
        createdAt: 0,
        updatedAt: 0,
      });
  });
  await expect(
    t2.mutation(api.ingredientBatches.create, selection()),
  ).rejects.toThrow(/room for 2/);
  expect(
    (await t2.query(api.ingredientBatches.list, { token })).batches,
  ).toHaveLength(0);
  expect(await t2.query(api.sourcing.list, { token })).toHaveLength(8);
});
test("two durable lanes hold their places across provider waits; stopping drains the current call and one failure does not stop the list", async () => {
  vi.useFakeTimers();
  const t = setup();
  const releases = new Map<string, () => void>();
  let signalTwo!: () => void;
  const twoStarted = new Promise<void>((r) => {
    signalTwo = r;
  });
  let calls = 0,
    inFlight = 0,
    maximum = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      const serialized = JSON.stringify(body);
      const ingredient =
        ["Rice", "Flour", "Oil", "Onions"].find((name) =>
          serialized.includes(`\\\"ingredient\\\":\\\"${name}\\\"`),
        ) ??
        ["Rice", "Flour", "Oil", "Onions"].find((name) =>
          serialized.includes(name),
        )!;
      calls++;
      inFlight++;
      maximum = Math.max(maximum, inFlight);
      if (calls <= 2)
        await new Promise<void>((resolve) => {
          releases.set(ingredient, resolve);
          if (releases.size === 2) signalTwo();
        });
      inFlight--;
      // A non-retryable provider failure in one ingredient should leave the other lane alive.
      return new Response("provider unavailable", { status: 400 });
    }),
  );
  const batchId = await t.mutation(api.ingredientBatches.create, selection());
  const drain = t.finishAllScheduledFunctions(
    () => vi.advanceTimersByTime(20),
    5000,
  );
  await twoStarted;
  let b = (await t.query(api.ingredientBatches.list, { token })).batches[0];
  expect(b.rows.map((r) => r.state)).toEqual([
    "running",
    "running",
    "queued",
    "queued",
  ]);
  const rice = b.cases.find((c) => c.ingredient === "Rice")!;
  await t.mutation(api.sourcing.cancel, { token, caseId: rice.id });
  b = (await t.query(api.ingredientBatches.list, { token })).batches[0];
  expect(b.rows[0].state).toBe("running"); // reservation is held while its provider call is outstanding
  expect(calls).toBe(2);
  for (const release of releases.values()) release();
  await drain;
  b = (await t.query(api.ingredientBatches.list, { token })).batches[0];
  expect(maximum).toBe(2);
  expect(calls).toBe(4);
  expect(b.active).toBe(false);
  expect(b.rows.every((r) => r.state === "settled")).toBe(true);
  expect(b.cases.find((c) => c.id === rice.id)?.status).toBe("canceled");
  expect(b.cases.filter((c) => c.status === "failed")).toHaveLength(3);
  const failed = b.cases.find((c) => c.ingredient === "Flour")!;
  await t.mutation(api.ingredientBatches.retry, {
    token,
    batchId,
    caseId: failed.id,
    attempt: 1,
  });
  await t.mutation(api.ingredientBatches.retry, {
    token,
    batchId,
    caseId: failed.id,
    attempt: 1,
  });
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTime(20), 5000);
  b = (await t.query(api.ingredientBatches.list, { token })).batches[0];
  expect(calls).toBe(5);
  expect(b.cases.find((c) => c.id === failed.id)?.attempts).toBe(2);
  expect(
    b.cases.filter((c) => c.id !== failed.id).every((c) => c.attempts === 1),
  ).toBe(true);
});
test("source text survives reviewed save and extraction ownership, expiry and ambiguous rows are enforced", async () => {
  vi.useFakeTimers();
  const t = setup(),
    input = selection(["Low-moisture mozzarella"]);
  await expect(
    t.mutation(api.ingredientBatches.create, {
      ...input,
      rows: input.rows.map((r) => ({ ...r, needsReview: true })),
    }),
  ).rejects.toThrow(/review every/);
  const saved = await t.mutation(api.ingredientLists.save, {
    token,
    clientId: input.clientId,
    ingredients: [input.rows[0].ingredient],
    sourceKind: "ai",
    rows: input.rows,
  });
  expect(saved.rows?.[0].original).toBe("Low-moisture mozzarella — 40 lb");
  const reservation = await t.mutation(internal.ingredientExtraction.reserve, {
    token,
    clientId: input.clientId,
    contentHash: "test-file",
  });
  expect(
    (
      await t.mutation(internal.ingredientExtraction.reserve, {
        token,
        clientId: input.clientId,
        contentHash: "test-file",
      })
    ).existing,
  ).toBe(true);
  await t.mutation(internal.ingredientExtraction.finish, {
    id: reservation.id,
    rows: input.rows,
    error: null,
  });
  expect(
    await t.query(api.ingredientExtraction.get, {
      token: other,
      clientId: input.clientId,
    }),
  ).toBeNull();
  await t.mutation(internal.ingredientExtraction.expire, {
    id: reservation.id,
    remove: true,
  });
  expect(
    await t.query(api.ingredientExtraction.get, {
      token,
      clientId: input.clientId,
    }),
  ).toBeNull();
  expect((await t.query(api.ingredientLists.list, { token }))[0].rows).toEqual(
    input.rows,
  );
});

// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { riceRequest, riceOffers } from "../fixtures/procurement";
import { explainPurchase, validateNarrative } from "./lib/advisorAgent";
vi.mock("./lib/advisorAgent", async (original) => ({
  ...(await original<typeof import("./lib/advisorAgent")>()),
  explainPurchase: vi.fn(),
}));
const modules = import.meta.glob("./**/*.ts"),
  token = "a".repeat(64);
const context = {
  priority: "cash" as const,
  budgetCents: 6000,
  dailyUsage: null,
  stockQuantity: null,
  maxCoverageDays: null,
  preferredOfferId: null,
};
async function setup() {
  const t = convexTest(schema, modules);
  const comparison = await t.mutation(api.comparisons.save, {
    token,
    clientId: crypto.randomUUID(),
    id: null,
    expectedRevision: 0,
    request: riceRequest,
    offers: riceOffers,
    selectedOfferId: null,
  });
  const args = {
    token,
    comparisonId: comparison.id,
    expectedRevision: 1,
    clientId: crypto.randomUUID(),
    context,
  };
  return { t, args, comparison };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
test("interrupted analyses expire without retrying or accepting a late completion", async () => {
  vi.useFakeTimers();
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  const { t, args } = await setup();
  const run = await t.mutation(api.advisor.prepare, args);
  await t.mutation(internal.advisor.reserve, { token, id: run.id });

  // Simulate an action that never reaches finish, then let durable recovery run.
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  const expired = await t.action(api.advisor.explain, { token, id: run.id });
  expect(expired.status).toBe("failed");
  expect(expired.error).toMatch(/no terminó a tiempo/);
  expect(expired.report.alternatives[1].totalCents).toBe(5000);
  expect(explainPurchase).not.toHaveBeenCalled();
  const late = await t.mutation(internal.advisor.finish, {
    id: run.id,
    narrative: {
      reasoning: "La presentación menor permite mantener caja disponible.",
      questions: [],
      sourceIds: ["rice-supplier-b"],
    },
    toolCalls: ["evaluateScenarios", "readEvidence"],
  });
  expect(late).toEqual(expired);
});
test("expiry leaves an already completed analysis intact", async () => {
  vi.useFakeTimers();
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  const { t, args, comparison } = await setup();
  const run = await t.mutation(api.advisor.prepare, args);
  await t.mutation(internal.advisor.reserve, { token, id: run.id });
  const completed = await t.mutation(internal.advisor.finish, {
    id: run.id,
    narrative: {
      reasoning: "La presentación menor permite mantener caja disponible.",
      questions: [],
      sourceIds: ["rice-supplier-b"],
    },
    toolCalls: ["evaluateScenarios", "readEvidence"],
  });
  await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  expect(
    (await t.query(api.advisor.list, { token, comparisonId: comparison.id }))[0],
  ).toEqual(completed);
});
test("owned snapshots preserve calculations and context, retries cannot change their meaning", async () => {
  const { t, args, comparison } = await setup();
  const run = await t.mutation(api.advisor.prepare, args);
  expect(run.report.recommendedOfferId).toBe("rice-supplier-b");
  expect(run.report.alternatives.map((a) => a.totalCents)).toEqual([
    9500, 5000,
  ]);
  expect(run.context.stockQuantity).toBeNull();
  expect((await t.mutation(api.advisor.prepare, args)).id).toBe(run.id);
  await expect(
    t.mutation(api.advisor.prepare, {
      ...args,
      context: { ...context, budgetCents: 100 },
    }),
  ).rejects.toThrow(/otro análisis/);
  await expect(
    t.query(api.advisor.list, {
      token: "b".repeat(64),
      comparisonId: comparison.id,
    }),
  ).rejects.toThrow(/no disponible/);
  await expect(
    t.mutation(api.advisor.prepare, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/no disponible/);
  await t.mutation(api.comparisons.save, {
    token,
    id: comparison.id,
    clientId: crypto.randomUUID(),
    expectedRevision: 1,
    request: { ...riceRequest, quantity: 20 },
    offers: riceOffers,
    selectedOfferId: null,
  });
  expect(
    (await t.query(api.advisor.list, { token, comparisonId: comparison.id }))[0]
      .snapshot.request.quantity,
  ).toBe(10);
  expect((await t.mutation(api.advisor.prepare, args)).id).toBe(run.id);
  await expect(
    t.mutation(api.advisor.prepare, { ...args, clientId: crypto.randomUUID() }),
  ).rejects.toThrow(/cambió/);
});
test("new client requests reuse the same semantic run in every persisted state", async () => {
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  const { t, args } = await setup();
  const calculated = await t.mutation(api.advisor.prepare, args);
  expect(
    (
      await t.mutation(api.advisor.prepare, {
        ...args,
        clientId: crypto.randomUUID(),
      })
    ).id,
  ).toBe(calculated.id);

  await t.mutation(internal.advisor.reserve, { token, id: calculated.id });
  const running = await t.mutation(api.advisor.prepare, {
    ...args,
    clientId: crypto.randomUUID(),
  });
  expect(running.id).toBe(calculated.id);
  expect(running.status).toBe("running");

  await t.mutation(internal.advisor.finish, {
    id: calculated.id,
    narrative: {
      reasoning: "La presentación menor permite mantener caja disponible.",
      questions: [],
      sourceIds: ["rice-supplier-b"],
    },
    toolCalls: ["evaluateScenarios", "readEvidence"],
  });
  const complete = await t.mutation(api.advisor.prepare, {
    ...args,
    clientId: crypto.randomUUID(),
  });
  expect(complete.id).toBe(calculated.id);
  expect(complete.status).toBe("complete");

  const failedContext = { ...context, priority: "balanced" as const };
  const failing = await t.mutation(api.advisor.prepare, {
    ...args,
    clientId: crypto.randomUUID(),
    context: failedContext,
  });
  await t.mutation(internal.advisor.reserve, { token, id: failing.id });
  await t.mutation(internal.advisor.finish, {
    id: failing.id,
    narrative: null,
    toolCalls: [],
  });
  const failed = await t.mutation(api.advisor.prepare, {
    ...args,
    clientId: crypto.randomUUID(),
    context: failedContext,
  });
  expect(failed.id).toBe(failing.id);
  expect(failed.status).toBe("failed");
  expect(explainPurchase).not.toHaveBeenCalled();
});
test("a saved comparison with pending quantity cannot prepare an advisor run", async () => {
  const { t, args, comparison } = await setup();
  await t.mutation(api.comparisons.save, {
    token,
    id: comparison.id,
    clientId: crypto.randomUUID(),
    expectedRevision: 1,
    request: { ...riceRequest, quantity: 0 },
    offers: riceOffers,
    selectedOfferId: null,
  });
  await expect(
    t.mutation(api.advisor.prepare, {
      ...args,
      expectedRevision: 2,
      clientId: crypto.randomUUID(),
    }),
  ).rejects.toThrow(/cantidad mayor que cero/);
  expect(
    await t.query(api.advisor.list, {
      token,
      comparisonId: comparison.id,
    }),
  ).toEqual([]);
});
test("disabled, failed and concurrent analyses never trigger an unapproved retry", async () => {
  const { t, args } = await setup();
  const run = await t.mutation(api.advisor.prepare, args);
  await expect(
    t.action(api.advisor.explain, { token, id: run.id }),
  ).rejects.toThrow(/habilitado/);
  expect(explainPurchase).not.toHaveBeenCalled();
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  expect(
    (await t.mutation(internal.advisor.reserve, { token, id: run.id })).fresh,
  ).toBe(true);
  expect(
    (await t.mutation(internal.advisor.reserve, { token, id: run.id })).fresh,
  ).toBe(false);
  await t.mutation(internal.advisor.finish, {
    id: run.id,
    narrative: null,
    toolCalls: [],
  });
  const failed = await t.action(api.advisor.explain, { token, id: run.id });
  expect(failed.status).toBe("failed");
  expect(explainPurchase).not.toHaveBeenCalled();
  expect(failed.report.alternatives[1].totalCents).toBe(5000);
});
test("AI output must use known evidence and cannot inject calculated amounts", async () => {
  const { t, args } = await setup();
  const run = await t.mutation(api.advisor.prepare, args);
  const valid = {
    reasoning: "La presentación menor permite mantener caja disponible.",
    questions: ["¿Se mantiene la entrega confirmada?"],
    sourceIds: ["rice-supplier-b"],
  };
  expect(validateNarrative(valid, run.snapshot.sources)).toEqual(valid);
  expect(() =>
    validateNarrative(
      { ...valid, sourceIds: ["foreign"] },
      run.snapshot.sources,
    ),
  ).toThrow();
  expect(() =>
    validateNarrative(
      { ...valid, reasoning: "Ahorra 140 soles esta semana" },
      run.snapshot.sources,
    ),
  ).toThrow();
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  vi.mocked(explainPurchase).mockResolvedValue({
    narrative: valid,
    toolCalls: ["evaluateScenarios", "readEvidence"],
  });
  const completed = await t.action(api.advisor.explain, { token, id: run.id });
  expect(completed.status).toBe("complete");
  expect(completed.toolCalls).toHaveLength(2);
  expect((await t.action(api.advisor.explain, { token, id: run.id })).id).toBe(
    run.id,
  );
  expect(explainPurchase).toHaveBeenCalledTimes(1);
});
test("invalid context and stale revisions cannot consume model calls", async () => {
  const { t, args } = await setup();
  for (const input of [
    { budgetCents: NaN },
    { dailyUsage: 0 },
    { stockQuantity: -1 },
    { preferredOfferId: "foreign" },
  ])
    await expect(
      t.mutation(api.advisor.prepare, {
        ...args,
        context: { ...context, ...input },
      }),
    ).rejects.toThrow();
  expect(explainPurchase).not.toHaveBeenCalled();
});

test("removed offer evidence cannot support a new analysis", async () => {
  const { t, args, comparison } = await setup();
  await t.mutation(api.comparisons.save, {
    token,
    id: comparison.id,
    clientId: crypto.randomUUID(),
    expectedRevision: 1,
    request: riceRequest,
    offers: [riceOffers[1]],
    selectedOfferId: null,
  });
  const run = await t.mutation(api.advisor.prepare, {
    ...args,
    expectedRevision: 2,
  });
  expect(run.snapshot.sources["rice-supplier-a"]).toBeDefined();
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_ADVISOR_MODEL", "test-model");
  await t.mutation(internal.advisor.reserve, { token, id: run.id });
  await expect(
    t.mutation(internal.advisor.finish, {
      id: run.id,
      narrative: {
        reasoning: "La oferta retirada parece conveniente.",
        questions: [],
        sourceIds: ["rice-supplier-a"],
      },
      toolCalls: ["evaluateScenarios", "readEvidence"],
    }),
  ).rejects.toThrow();
});

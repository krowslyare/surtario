// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import { usRiceOffers, usRiceRequest } from "../fixtures/procurement";
import { analyzePurchase } from "../src/domain/advisor";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64), other = "b".repeat(64);
const source = { url: "https://example.test/rice", title: "Public rice source", description: "Rice", markdown: "Rice, 25 lb, USD 20",
  contentTruncated: false, extraction: null, extractionStatus: "idle" as const, extractionError: null, extractionAttempts: 0 };
afterEach(() => vi.unstubAllEnvs());
const instance = () => convexTest(schema, modules);
async function setup(t: ReturnType<typeof instance>) {
  const hash = await ownerHash(token);
  return t.run(async ctx => {
    const studyId = await ctx.db.insert("studies", { ownerHash: hash, clientId: crypto.randomUUID(), term: "Rice", region: "Portland", results: [], selectedIds: [], revision: 1, updatedAt: 100 });
    const runId = await ctx.db.insert("researchRuns", { ownerHash: hash, clientId: crypto.randomUUID(), studyId, ingredient: "Rice", region: "Portland", createdAt: 100, observedAt: "2026-09-21", status: "complete", sources: [source], error: null, discarded: 0, warning: false });
    const caseId = await ctx.db.insert("sourcingCases", { ownerHash: hash, studyId, ingredient: "Rice", region: "Portland", objective: "Find rice", status: "running", revision: 1, steps: 1, runs: 1, researchRunIds: [runId], summary: "Reading", createdAt: 100, updatedAt: 100 });
    const comparisonId = await ctx.db.insert("comparisons", { ownerHash: hash, clientId: crypto.randomUUID(), request: usRiceRequest, offers: usRiceOffers, sources: {}, selectedOfferId: null, revision: 1, updatedAt: 100 });
    await ctx.db.patch(caseId, { comparisonId });
    const requestId = await ctx.db.insert("quotationRequests", { ownerHash: hash, clientId: crypto.randomUUID(), studyId, recipient: null, inboxId: null, subject: "Rice", text: "Delivery?", state: "sent", revision: 1, idempotencyKey: "one", receipt: null, failure: null, createdAt: 100, updatedAt: 100 });
    return { hash, studyId, runId, caseId, comparisonId, requestId };
  });
}

test("one work per actual case link; same ingredient and area never merge independent work", async () => {
  const t = instance(); const ids = await setup(t);
  await t.run(ctx => ctx.db.insert("studies", { ownerHash: ids.hash, clientId: crypto.randomUUID(), term: "Rice", region: "Portland", results: [], selectedIds: [], revision: 1, updatedAt: 90 }));
  const result = await t.query(api.overview.list, { token });
  expect(result.items).toHaveLength(2);
  expect(result.items.find(item => item.kind === "case")).toMatchObject({ id: ids.caseId, studyId: ids.studyId, comparisonId: ids.comparisonId, runIds: [ids.runId], requests: [{ id: ids.requestId }] });
  expect(JSON.stringify(result)).not.toContain(source.markdown);
  expect(JSON.stringify(result)).not.toContain(ids.hash);
  expect(await t.query(api.overview.list, { token: other })).toEqual({ items: [], quickRuns: [], outcomes: [], limited: false });
  await expect(t.query(api.overview.research, { token: other, runId: ids.runId })).rejects.toThrow("unavailable");
  expect(result.limited).toBe(false);
});

test("review survives reload; a changed source requires a new review and stale acknowledgements fail", async () => {
  const t = instance(); const { runId } = await setup(t);
  const first = await t.query(api.overview.research, { token, runId });
  await expect(t.mutation(api.overview.reviewResearch, { token: other, runId, evidenceKey: first.evidenceKey })).rejects.toThrow("unavailable");
  await t.mutation(api.overview.reviewResearch, { token, runId, evidenceKey: first.evidenceKey });
  expect((await t.query(api.overview.research, { token, runId })).reviewed).toBe(true);
  await t.run(ctx => ctx.db.patch(runId, { sources: [{ ...source, markdown: "Rice, 25 lb, USD 22" }] }));
  expect((await t.query(api.overview.research, { token, runId })).reviewed).toBe(false);
  await expect(t.mutation(api.overview.reviewResearch, { token, runId, evidenceKey: first.evidenceKey })).rejects.toThrow("changed");
  const latest = await t.query(api.overview.research, { token, runId });
  await t.run(ctx => ctx.db.patch(runId, { status: "running" }));
  await expect(t.mutation(api.overview.reviewResearch, { token, runId, evidenceKey: latest.evidenceKey })).rejects.toThrow("finish");
});

test("manual refresh preserves study and comparison, deduplicates overlapping calls and checks session and market", async () => {
  const t = instance(); const { studyId, comparisonId } = await setup(t);
  const before = await t.run(async ctx => ({ study: await ctx.db.get(studyId), comparison: await ctx.db.get(comparisonId) }));
  const args = { token, clientId: crypto.randomUUID(), studyId, ingredient: "Rice", region: "Portland" };
  await expect(t.mutation(internal.research.reserveSearch, { ...args, token: other })).rejects.toThrow("unavailable");
  await expect(t.mutation(internal.research.reserveSearch, { ...args, region: "Lima" })).rejects.toThrow("market");
  const first = await t.mutation(internal.research.reserveSearch, args);
  const second = await t.mutation(internal.research.reserveSearch, { ...args, clientId: crypto.randomUUID() });
  expect(second).toMatchObject({ kind: "existing", run: { id: first.run.id } });
  expect((await t.mutation(internal.research.reserveSearch, args)).kind).toBe("existing");
  expect(await t.run(async ctx => ({ study: await ctx.db.get(studyId), comparison: await ctx.db.get(comparisonId) }))).toEqual(before);
  expect((await t.query(api.overview.list, { token })).items).toHaveLength(1);
  await expect(t.action(api.research.search, args)).rejects.toThrow("not enabled");
});

test("saved decision outcomes use frozen reports, clear the reply and flag a newer revision", async () => {
  const t = instance(); const { requestId, comparisonId } = await setup(t);
  const context = { priority: "cash" as const, budgetCents: 10000, dailyUsage: null, stockQuantity: null, maxCoverageDays: null, preferredOfferId: null };
  const before = analyzePurchase(usRiceRequest, usRiceOffers.map(offer => ({ ...offer, freightCents: null })), context);
  const after = analyzePurchase(usRiceRequest, usRiceOffers, context);
  await t.run(async ctx => {
    await ctx.db.insert("quotationReplies", { requestId, messageId: "reply-1", eventId: "event-1", threadId: "thread-1", from: "test@example.test", text: "USD 4 delivery", receivedAt: "2026-09-21T10:00:00Z" });
    await ctx.db.insert("deliveryConfirmations", { requestId, messageId: "reply-1", comparisonId, offerId: usRiceOffers[0].id, freightCents: 400, currency: "USD", ingredient: "Rice", evidenceQuote: "USD 4 delivery", receivedAt: "2026-09-21T10:00:00Z", context, before, after, comparisonRevision: 1, createdAt: 200 });
  });
  const first = await t.query(api.overview.list, { token });
  expect(first.items[0].reviewedReplyIds).toContain(`reply:${requestId}:reply-1`);
  expect(first.outcomes[0]).toMatchObject({ stale: false, currency: "USD", value: 400, beforeTotal: null, afterTotal: after.alternatives[0].totalCents });
  await t.run(ctx => ctx.db.patch(comparisonId, { revision: 2 }));
  expect((await t.query(api.overview.list, { token })).outcomes[0]).toEqual({ ...first.outcomes[0], stale: true });
  await t.run(async ctx => {
    const confirmation = (await ctx.db.query("deliveryConfirmations").first())!;
    await ctx.db.patch(confirmation._id, { currency: undefined, ingredient: undefined });
  });
  expect((await t.query(api.overview.list, { token })).outcomes[0]).toMatchObject({ currency: null, ingredient: "Saved comparison", stale: true });
});

test("legacy overflow is labelled as a partial inventory", async () => {
  const t = instance(); const hash = await ownerHash(token);
  await t.run(async ctx => { for (let i = 0; i < 11; i++) await ctx.db.insert("studies", { ownerHash: hash, clientId: crypto.randomUUID(), term: `Ingredient ${i}`, region: "Portland", results: [], selectedIds: [], revision: 1, updatedAt: i }); });
  const result = await t.query(api.overview.list, { token });
  expect(result.items).toHaveLength(10); expect(result.limited).toBe(true);
});

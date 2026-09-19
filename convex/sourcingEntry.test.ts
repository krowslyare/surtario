// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { usRiceRequest, usRiceOffers } from "../fixtures/procurement";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
const input = () => ({ token, clientId: crypto.randomUUID(), intent: "inquiry" as const,
  target: { resultId: "us-distributor-c" },
  study: { clientId: crypto.randomUUID(), id: null, expectedRevision: 0, term: "Rice", region: "Portland, OR, US", selectedIds: ["us-distributor-c"], webReviews: [], prospectIds: [] },
});
test("context inquiry atomically saves evidence, case and draft; retry reuses records without sending", async () => {
  const t = convexTest(schema, modules), args = input();
  const first = await t.mutation(api.sourcingEntry.prepare, args);
  const second = await t.mutation(api.sourcingEntry.prepare, args);
  expect(second).toEqual(first);
  const detail = await t.query(api.sourcing.get, { token, caseId: first.caseId });
  expect(detail.events.filter(event => event.sourceId === first.requestId)).toHaveLength(1);
  expect(await t.query(api.studies.list, { token })).toHaveLength(1);
  expect(await t.query(api.sourcing.list, { token })).toHaveLength(1);
  const mail = await t.query(api.quotationMail.list, { token });
  expect(mail).toHaveLength(1);
  expect(mail[0]).toMatchObject({ state: "draft", receipt: null, studyId: first.study.id });
  expect(mail[0].text).toContain("Northwest Restaurant Goods");
  expect(mail[0].text).toContain("Portland");
  expect(await t.query(api.studies.list, { token: "b".repeat(64) })).toEqual([]);
  expect(await t.query(api.quotationMail.list, { token: "b".repeat(64) })).toEqual([]);
});
test("invalid target and fictional research roll back every write", async () => {
  const t = convexTest(schema, modules);
  await expect(t.mutation(api.sourcingEntry.prepare, { ...input(), target: { resultId: "forged" } })).rejects.toThrow(/reviewed distributor/);
  await expect(t.mutation(api.sourcingEntry.prepare, { ...input(), intent: "research" })).rejects.toThrow(/real reviewed web source/);
  expect(await t.query(api.studies.list, { token })).toEqual([]);
  expect(await t.query(api.sourcing.list, { token })).toEqual([]);
});
test("mail cooldown failure rolls back a newly created study and case", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.sourcingEntry.prepare, input());
  await expect(t.mutation(api.sourcingEntry.prepare, input())).rejects.toThrow(/Wait 30 seconds/);
  expect(await t.query(api.studies.list, { token })).toHaveLength(1);
  expect(await t.query(api.sourcing.list, { token })).toHaveLength(1);
  expect(await t.query(api.quotationMail.list, { token })).toHaveLength(1);
});
test("existing comparison is retained, stale and foreign studies cannot be overwritten", async () => {
  const t = convexTest(schema, modules), args = input();
  const first = await t.mutation(api.sourcingEntry.prepare, args);
  const comparison = await t.mutation(api.comparisons.save, { token, sourcingCaseId: first.caseId, clientId: crypto.randomUUID(), id: null, expectedRevision: 0, request: usRiceRequest, offers: usRiceOffers, selectedOfferId: null });
  const next = { ...args, clientId: crypto.randomUUID(), study: { ...args.study, id: first.study.id, expectedRevision: first.study.revision } };
  const reopened = await t.mutation(api.sourcingEntry.prepare, next);
  expect(reopened.requestId).toBe(first.requestId);
  expect((await t.query(api.sourcing.list, { token }))[0].comparisonId).toBe(comparison.id);
  await expect(t.mutation(api.sourcingEntry.prepare, next)).rejects.toThrow(/changed in another view/);
  await expect(t.mutation(api.sourcingEntry.prepare, { ...next, token: "b".repeat(64) })).rejects.toThrow(/unavailable/);
  expect(await t.query(api.comparisons.list, { token })).toHaveLength(1);
});

test("reviewed public candidate can continue research with its evidence, without provider execution", async () => {
  const t = convexTest(schema, modules);
  const { ownerHash } = await import("./lib/demoSession");
  const owner = await ownerHash(token);
  const runId = await t.run(ctx => ctx.db.insert("researchRuns", {
    ownerHash: owner, clientId: crypto.randomUUID(), simulated: false,
    ingredient: "Rice", region: "Portland, OR, US", observedAt: new Date().toISOString(), createdAt: Date.now(),
    status: "complete", error: null, sources: [{ url: "https://supplier.test/rice", title: "Synthetic test of public-source path", description: "Test source", markdown: null, contentTruncated: false, extraction: null, extractionStatus: "idle", extractionError: null, extractionAttempts: 0 }], discarded: 0, warning: false,
  }));
  const prospect = await t.mutation(api.prospects.save, { token, runId, sourceIndex: 0, supplier: "Test distributor", contact: "", confirmed: true });
  const args = { ...input(), intent: "research" as const, target: { prospectId: prospect.id } };
  const next = await t.mutation(api.sourcingEntry.prepare, { ...args, study: { ...args.study, selectedIds: [], prospectIds: [prospect.id] } });
  expect(next.requestId).toBeNull();
  expect(next.study.prospects?.[0].sourceUrl).toBe("https://supplier.test/rice");
  expect((await t.query(api.sourcing.list, { token }))[0]).toMatchObject({ status: "idle", steps: 0, researchRunIds: [] });
  expect(await t.query(api.quotationMail.list, { token })).toEqual([]);
  await expect(t.mutation(api.sourcingEntry.prepare, { ...args, token: "b".repeat(64), study: { ...args.study, selectedIds: [], prospectIds: [prospect.id] } })).rejects.toThrow(/unavailable/);
});

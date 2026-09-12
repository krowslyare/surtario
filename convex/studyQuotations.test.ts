// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
test("a saved study can request a distributor catalog without any comparison or quantity", async () => {
  const t = convexTest(schema, modules);
  const study = await t.mutation(api.studies.save, {
    token,
    clientId: "11111111-1111-4111-8111-111111111111",
    id: null,
    expectedRevision: 0,
    term: "Arroz",
    region: "Lima",
    selectedIds: ["distributor-c"],
  });
  const args = {
    token,
    studyId: study.id,
    resultId: "distributor-c",
    clientId: "22222222-2222-4222-8222-222222222222",
  };
  const request = await t.mutation(api.quotationMail.create, args);
  expect(request.comparisonId).toBeUndefined();
  expect(request.studyId).toBe(study.id);
  expect(request.text).toContain("Quantity is still to be determined");
  expect(request.text).toContain("Lima");
  expect(request.recipient).toBeNull();
  expect(request.state).toBe("draft");
  expect((await t.mutation(api.quotationMail.create, args)).id).toBe(
    request.id,
  );
  expect(await t.query(api.comparisons.list, { token })).toEqual([]);
  expect(
    await t.query(api.quotationMail.list, { token: "b".repeat(64) }),
  ).toEqual([]);
  await expect(
    t.mutation(api.quotationMail.create, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.quotationMail.create, { ...args, resultId: "catalog-a" }),
  ).rejects.toThrow(/distributor/);
  await expect(
    t.mutation(api.quotationMail.create, { token, clientId: args.clientId }),
  ).rejects.toThrow(/Choose one source/);
});

// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { marketExamples } from "../fixtures/market";
const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(64),
  tokenB = "b".repeat(64);
const draft = {
  token: tokenA,
  clientId: "11111111-1111-4111-8111-111111111111",
  id: null,
  expectedRevision: 0,
  term: "Arroz",
  region: "Lima",
  selectedIds: ["catalog-a", "distributor-c"],
};

test("saves server snapshots, retries once, and never exposes session credentials", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  expect(saved.results).toEqual(marketExamples);
  expect(saved.selectedIds).toEqual(draft.selectedIds);
  expect(saved).not.toHaveProperty("ownerHash");
  expect(saved).not.toHaveProperty("token");
  expect((await t.mutation(api.studies.save, draft)).id).toBe(saved.id);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      selectedIds: ["catalog-b", "distributor-c"],
    }),
  ).rejects.toThrow(/otra selección/);
  expect(await t.query(api.studies.list, { token: tokenA })).toHaveLength(1);
});
test("a second capability cannot read or update another study even with its ID", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  expect(await t.query(api.studies.list, { token: tokenB })).toEqual([]);
  await expect(
    t.mutation(api.studies.save, {
      ...draft,
      token: tokenB,
      id: saved.id,
      expectedRevision: 1,
    }),
  ).rejects.toThrow(/no disponible/);
  await expect(t.query(api.studies.list, { token: "invalid" })).rejects.toThrow(
    /Sesión/,
  );
  expect((await t.query(api.studies.list, { token: tokenA }))[0].revision).toBe(
    1,
  );
});
test("stale updates are rejected while source evidence remains unchanged", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.studies.save, draft);
  const update = {
    ...draft,
    id: saved.id,
    expectedRevision: 1,
    selectedIds: ["catalog-b"],
  };
  const updated = await t.mutation(api.studies.save, update);
  expect(updated.revision).toBe(2);
  expect(updated.results).toEqual(saved.results);
  await expect(t.mutation(api.studies.save, update)).rejects.toThrow(
    /otra vista/,
  );
  expect(
    (await t.query(api.studies.list, { token: tokenA }))[0].selectedIds,
  ).toEqual(["catalog-b"]);
});
test("anonymous persistence accepts only bounded synthetic studies", async () => {
  const t = convexTest(schema, modules);
  for (const overrides of [
    { term: "Private restaurant" },
    { region: "Cusco" },
    { selectedIds: ["forged-price"] },
    { selectedIds: [] },
    { selectedIds: Array(5).fill("catalog-a") },
    { expectedRevision: -1 },
  ]) {
    await expect(
      t.mutation(api.studies.save, { ...draft, ...overrides }),
    ).rejects.toThrow();
  }
  for (let i = 0; i < 10; i++)
    await t.mutation(api.studies.save, {
      ...draft,
      clientId: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
    });
  await expect(t.mutation(api.studies.save, draft)).rejects.toThrow(
    /10 estudios/,
  );
  expect(await t.query(api.studies.list, { token: tokenA })).toHaveLength(10);
});

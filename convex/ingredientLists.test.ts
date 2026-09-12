// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
const tokenA = "a".repeat(64);
const tokenB = "b".repeat(64);
const draft = {
  token: tokenA,
  clientId: "11111111-1111-4111-8111-111111111111",
  ingredients: [" Arroz ", "Aceite vegetal"],
  sourceKind: "spreadsheet" as const,
};

test("stores only reviewed names, derives read-only labels, and retries idempotently", async () => {
  const t = convexTest(schema, modules);
  const saved = await t.mutation(api.ingredientLists.save, draft);
  expect(saved).toMatchObject({
    ingredients: ["Arroz", "Aceite vegetal"],
    sourceKind: "spreadsheet",
    sourceLabel: "Reviewed XLSX or CSV",
  });
  expect(saved).not.toHaveProperty("ownerHash");
  expect(saved).not.toHaveProperty("clientId");
  expect(saved).not.toHaveProperty("file");
  expect((await t.mutation(api.ingredientLists.save, draft)).id).toBe(saved.id);
  await expect(
    t.mutation(api.ingredientLists.save, {
      ...draft,
      ingredients: ["Azúcar"],
    }),
  ).rejects.toThrow(/different list/);
});

test("isolates lists by browser capability and rejects invalid sessions", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.ingredientLists.save, draft);
  expect(await t.query(api.ingredientLists.list, { token: tokenB })).toEqual(
    [],
  );
  await expect(
    t.query(api.ingredientLists.list, { token: "invalid" }),
  ).rejects.toThrow(/session/);
});

test("bounds names and lists per session", async () => {
  const t = convexTest(schema, modules);
  for (const ingredients of [
    [],
    Array.from({ length: 101 }, (_, index) => `Insumo ${index}`),
    [""],
    ["x".repeat(121)],
  ]) {
    await expect(
      t.mutation(api.ingredientLists.save, { ...draft, ingredients }),
    ).rejects.toThrow();
  }
  for (let index = 0; index < 10; index++) {
    await t.mutation(api.ingredientLists.save, {
      ...draft,
      clientId: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`,
    });
  }
  await expect(t.mutation(api.ingredientLists.save, draft)).rejects.toThrow(
    /10 saved lists/,
  );
  expect(
    await t.query(api.ingredientLists.list, { token: tokenA }),
  ).toHaveLength(10);
});

test("enforces the global demo capacity", async () => {
  const t = convexTest(schema, modules);
  for (let owner = 1; owner <= 10; owner++) {
    const token = owner.toString(16).padStart(64, "0");
    for (let index = 0; index < 10; index++) {
      await t.mutation(api.ingredientLists.save, {
        ...draft,
        token,
        clientId: `${String(owner).padStart(8, "0")}-${String(index).padStart(4, "0")}-4111-8111-111111111111`,
      });
    }
  }
  await expect(
    t.mutation(api.ingredientLists.save, {
      ...draft,
      token: "f".repeat(64),
    }),
  ).rejects.toThrow(/capacity/);
});

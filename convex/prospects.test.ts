// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { expect, test, vi, afterEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
const token = "a".repeat(64);
afterEach(() => vi.unstubAllEnvs());
async function setup() {
  const t = convexTest(schema, modules);
  const reserved = await t.mutation(internal.research.reserveSearch, {
    token,
    clientId: "11111111-1111-4111-8111-111111111111",
    ingredient: "Arroz",
    region: "Lima",
  });
  await t.mutation(internal.research.finishSearch, {
    id: reserved.run.id,
    sources: [
      {
        url: "https://supplier.test/catalog",
        title: "Catalogo candidato",
        description: "Pedir cotizacion",
        markdown: null,
        contentTruncated: false,
      },
    ],
    discarded: 0,
    warning: false,
    simulated: false,
  });
  return {
    t,
    args: {
      token,
      runId: reserved.run.id,
      sourceIndex: 0,
      supplier: "Distribuidor revisado",
      contact: "contact@example.test",
      confirmed: true as const,
    },
  };
}
test("source without price or extraction can be saved, recovered and queried without using contact as recipient", async () => {
  const { t, args } = await setup();
  const saved = await t.mutation(api.prospects.save, args);
  expect(saved.sourceUrl).toBe("https://supplier.test/catalog");
  expect(saved.ingredient).toBe("Arroz");
  expect(saved).not.toHaveProperty("priceCents");
  expect(saved).not.toHaveProperty("ownerHash");
  expect((await t.mutation(api.prospects.save, args)).id).toBe(saved.id);
  expect(await t.query(api.prospects.list, { token })).toEqual([saved]);
  vi.stubEnv("AGENTMAIL_TEST_RECIPIENT", "authorized@example.test");
  const mail = await t.mutation(api.quotationMail.create, {
    token,
    prospectId: saved.id,
    clientId: "22222222-2222-4222-8222-222222222222",
  });
  expect(mail.prospectId).toBe(saved.id);
  expect(mail.recipient).toBe("authorized@example.test");
  expect(mail.text).not.toContain(args.contact);
  expect(mail.state).toBe("draft");
  expect(mail.text).toContain("Quantity is still to be determined");
  expect(await t.query(api.comparisons.list, { token })).toEqual([]);
  await expect(
    t.mutation(api.quotationMail.create, {
      token: "b".repeat(64),
      prospectId: saved.id,
      clientId: "33333333-3333-4333-8333-333333333333",
    }),
  ).rejects.toThrow(/unavailable/);
});
test("ownership, source identity and immutable review are enforced", async () => {
  const { t, args } = await setup();
  await expect(
    t.mutation(api.prospects.save, { ...args, token: "b".repeat(64) }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.mutation(api.prospects.save, { ...args, sourceIndex: 1 }),
  ).rejects.toThrow(/source/);
  await expect(
    t.mutation(api.prospects.save, { ...args, sourceIndex: -1 }),
  ).rejects.toThrow(/source/);
  await expect(
    t.mutation(api.prospects.save, { ...args, supplier: "x\nInjected" }),
  ).rejects.toThrow(/Review/);
  const saved = await t.mutation(api.prospects.save, { ...args, contact: "" });
  expect(saved.contact).toBeNull();
  await expect(t.mutation(api.prospects.save, args)).rejects.toThrow(
    /different data/,
  );
  expect(await t.query(api.prospects.list, { token: "b".repeat(64) })).toEqual(
    [],
  );
});

// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
const token = "e".repeat(64);
const file = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
function setup() {
  vi.useFakeTimers();
  vi.stubEnv("DOCUMENT_EXTRACTION_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("OPENAI_EXTRACTION_MODEL", "test");
  return convexTest(schema, modules);
}
function request(
  clientId: string,
  body: Uint8Array = file,
  bearer = token,
  type = "image/png",
): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": type,
      "X-Request-Id": clientId,
    },
    body: body as BodyInit,
  };
}
test("uploaded binary is read once, ambiguous names stay flagged, and request identity cannot switch files", async () => {
  const t = setup(),
    clientId = crypto.randomUUID();
  const output = {
    rows: [
      {
        ingredient: "Low-moisture mozzarella",
        original: "Low-moisture mozzarella — 40 lb",
        reference: "Page 1, line 1",
        needsReview: false,
      },
      {
        ingredient: "",
        original: "Unreadable line",
        reference: "Page 1, line 2",
        needsReview: true,
      },
    ],
  };
  const provider = vi.fn(async (_url: unknown, init?: RequestInit) => {
    expect(String(init?.body)).toContain("data:image/png;base64,");
    return new Response(
      JSON.stringify({
        id: "response",
        output: [
          {
            id: "message",
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
  });
  vi.stubGlobal("fetch", provider);
  expect(
    (await t.fetch("/ingredient-list/read", request(clientId))).status,
  ).toBe(200);
  const result = await t.query(api.ingredientExtraction.get, {
    token,
    clientId,
  });
  expect(result?.status).toBe("complete");
  expect(result?.rows[0].ingredient).toBe("Low-moisture mozzarella");
  expect(result?.rows[0].original).toContain("40 lb");
  expect(result?.rows[1].needsReview).toBe(true);
  expect(
    (await t.fetch("/ingredient-list/read", request(clientId))).status,
  ).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(
    (
      await t.fetch(
        "/ingredient-list/read",
        request(clientId, new Uint8Array([...file, 1])),
      )
    ).status,
  ).toBe(400);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(
    await t.query(api.ingredientExtraction.get, {
      token: "f".repeat(64),
      clientId,
    }),
  ).toBeNull();
  expect(
    await t.run((ctx) => ctx.db.system.query("_storage").collect()),
  ).toEqual([]);
});
test("invalid sessions, formats, signatures and size never reach the provider; provider failures are sanitized", async () => {
  const t = setup(),
    provider = vi.fn(async () => {
      throw new Error("private upstream credential detail");
    });
  vi.stubGlobal("fetch", provider);
  expect(
    (
      await t.fetch(
        "/ingredient-list/read",
        request(crypto.randomUUID(), file, "invalid"),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await t.fetch(
        "/ingredient-list/read",
        request(crypto.randomUUID(), file, token, "text/html"),
      )
    ).status,
  ).toBe(415);
  expect(
    (
      await t.fetch(
        "/ingredient-list/read",
        request(crypto.randomUUID(), new Uint8Array([1, 2, 3])),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await t.fetch(
        "/ingredient-list/read",
        request(crypto.randomUUID(), new Uint8Array(3 * 1024 * 1024 + 1)),
      )
    ).status,
  ).toBe(413);
  expect(provider).not.toHaveBeenCalled();
  const clientId = crypto.randomUUID();
  const response = await t.fetch("/ingredient-list/read", request(clientId));
  expect(response.status).toBe(400);
  expect(await response.text()).not.toContain("private upstream");
  expect(
    (await t.query(api.ingredientExtraction.get, { token, clientId }))?.status,
  ).toBe("failed");
  await t.fetch("/ingredient-list/read", request(clientId));
  expect(provider).toHaveBeenCalledTimes(1);
});

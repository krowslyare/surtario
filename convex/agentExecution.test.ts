// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { riceOffers, riceRequest } from "../fixtures/procurement";

const modules = import.meta.glob("./**/*.ts");
const token = "c".repeat(64);
const field = (value: string, evidence: string) => ({ value, evidence });
const offer = {
  supplier: field("Distribuidora de ejemplo", "Distribuidora de ejemplo"),
  ingredient: field("Arroz", "Arroz blanco extra"),
  specification: field("Arroz blanco extra", "Arroz blanco extra"),
  packageContent: field("18", "Saco de 18 kg"),
  packageUnit: field("kg", "Saco de 18 kg"),
  price: field("80.00", "PEN 80.00"),
  currency: field("PEN", "PEN 80.00"),
};
function message(result: unknown) {
  return new Response(
    JSON.stringify({
      id: "resp_test",
      output: [
        {
          type: "message",
          role: "assistant",
          id: "msg_test",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(result),
              annotations: [],
            },
          ],
        },
      ],
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
function enable() {
  for (const key of [
    "OPENAI_API_KEY",
    "OPENAI_EXTRACTION_MODEL",
    "OPENAI_ADVISOR_MODEL",
  ])
    vi.stubEnv(key, "test-only");
  for (const key of ["ADVISOR_ENABLED", "DOCUMENT_EXTRACTION_ENABLED"])
    vi.stubEnv(key, "true");
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Keep the real Agent and AI SDK in these tests. Mocking the agent hid its required context scope.
test("stateless extraction and document reading reach the provider and validate its output", async () => {
  enable();
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.text.format.type).toBe("json_schema");
    const visual = JSON.stringify(body.input).includes("input_image");
    return message(
      visual
        ? {
            documentType: "quotation",
            transcript:
              "Distribuidora de ejemplo\nArroz blanco extra\nSaco de 18 kg: PEN 80.00",
            offer,
          }
        : offer,
    );
  });
  vi.stubGlobal("fetch", fetch);
  const t = convexTest(schema, modules);
  const extracted = await t.action(internal.extraction.probe, {
    example: "clear",
  });
  expect(extracted.offer.packageContent.value).toBe("18");
  expect(extracted.offer.price.value).toBe("80.00");
  const document = await t.action(api.documents.extract, {
    token,
    clientId: crypto.randomUUID(),
    kind: "image",
  });
  expect(document.status).toBe("complete");
  expect(document.result?.documentType).toBe("quotation");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("the real advisor executes both tools before accepting structured advice", async () => {
  enable();
  const requests: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      requests.push(body);
      if (body.tool_choice?.type === "function")
        return new Response(
          JSON.stringify({
            output: [
              {
                type: "function_call",
                id: `fc_${body.tool_choice.name}`,
                call_id: `call_${body.tool_choice.name}`,
                name: body.tool_choice.name,
                arguments: "{}",
              },
            ],
          }),
        );
      const input = JSON.stringify(body.input);
      expect(input).toContain("function_call_output");
      expect(input).toContain("chosenPriority");
      expect(input).toContain("reviewedConditions");
      expect(input).toContain("deliveryConfirmed");
      expect(input).toContain('\\"synthetic\\":false');
      expect(input).toContain('\\"synthetic\\":true');
      return message({
        reasoning: "La presentación menor protege la caja disponible.",
        questions: [],
        sourceIds: ["rice-supplier-b"],
      });
    }),
  );
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
  await t.run(async (ctx) => {
    const stored = (await ctx.db.get(comparison.id))!;
    await ctx.db.patch(stored._id, {
      sources: {
        ...stored.sources,
        "rice-supplier-a": {
          ...stored.sources["rice-supplier-a"],
          marketSource: {
            title: "Live source",
            url: "https://supplier.example/rice",
            observedAt: "2026-09-09T12:00:00Z",
            publishedAt: null,
            evidence: "Reviewed live evidence",
            simulated: false,
          },
        },
        "rice-supplier-b": {
          ...stored.sources["rice-supplier-b"],
          replyReview: {
            requestId: "synthetic-request",
            messageId: "synthetic-reply",
            values: {
              supplier: "Proveedor B",
              ingredient: riceRequest.ingredient,
              specification: riceRequest.specification,
              packageContent: "1",
              packageUnit: "kg",
              price: "5",
              currency: "PEN",
            },
            confirmed: true,
          },
          marketSource: {
            title: "Synthetic reply",
            url: null,
            observedAt: "2026-09-09T12:00:00Z",
            publishedAt: null,
            evidence: "Synthetic rehearsal reply",
            simulated: true,
          },
        },
      },
    });
  });
  const run = await t.mutation(api.advisor.prepare, {
    token,
    comparisonId: comparison.id,
    expectedRevision: 1,
    clientId: crypto.randomUUID(),
    context: {
      priority: "cash",
      budgetCents: 6000,
      dailyUsage: null,
      stockQuantity: null,
      maxCoverageDays: null,
      preferredOfferId: null,
    },
  });
  const result = await t.action(api.advisor.explain, { token, id: run.id });
  expect(result.status).toBe("complete");
  expect(result.toolCalls).toEqual(["evaluateScenarios", "readEvidence"]);
  expect(result.narrative?.reasoning).toBe(
    "La presentación menor protege la caja disponible.",
  );
  expect(requests).toHaveLength(3);
});

import { expect, test, vi } from "vitest";
import type { ActionCtx } from "./_generated/server";
import {
  extractReplyOfferWithAgent,
  validateReplyExtraction,
} from "./lib/replyExtraction";

const mocks = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("@convex-dev/agent", () => ({
  Agent: class {
    generateObject = mocks.generateObject;
  },
}));

const source = "Proveedor Uno\nArroz extra\nSaco 18 kg a PEN 80.00";
const referenced = {
  supplier: { value: "Proveedor Uno", evidenceLineNumber: 1 },
  ingredient: { value: "Arroz", evidenceLineNumber: 2 },
  specification: { value: "extra", evidenceLineNumber: 2 },
  packageContent: { value: "18", evidenceLineNumber: 3 },
  packageUnit: { value: "kg", evidenceLineNumber: 3 },
  price: { value: "80.00", evidenceLineNumber: 3 },
  currency: { value: "PEN", evidenceLineNumber: 3 },
};

test("uses numbered literal evidence with bounded stateless generation", async () => {
  mocks.generateObject.mockResolvedValue({ object: referenced });
  const offer = await extractReplyOfferWithAgent(
    {} as ActionCtx,
    source,
    "fake-key",
    "fake-model",
  );
  expect(offer.price).toEqual({
    value: "80.00",
    evidence: "Saco 18 kg a PEN 80.00",
  });
  const options = mocks.generateObject.mock.lastCall![2];
  expect(options.maxRetries).toBe(0);
  expect(options.maxOutputTokens).toBe(1800);
  expect(options.prompt).toContain('"line":3');
  expect(options.prompt).toContain("Saco 18 kg a PEN 80.00");
});

test("rejects missing, mismatched and nonexistent references", () => {
  expect(() =>
    validateReplyExtraction(
      { ...referenced, price: { value: "80.00", evidenceLineNumber: null } },
      source,
    ),
  ).toThrow(/evidencia/);
  expect(() =>
    validateReplyExtraction(
      { ...referenced, price: { value: "80.00", evidenceLineNumber: 20 } },
      source,
    ),
  ).toThrow(/inexistente/);
});

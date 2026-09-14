import { expect, test } from "vitest";
import { validateExtraction } from "./lib/extraction";
import { extractionExample, extractionSource } from "../fixtures/extraction";

test("valida salida parcial sin convertir ausencias en valores", () => {
  expect(
    validateExtraction(extractionExample, extractionSource.text).packageContent,
  ).toEqual({ value: null, evidence: null });
});
test("rechaza campos fuera de contrato, citas inexistentes y valores sin fuente", () => {
  expect(() =>
    validateExtraction(
      { ...extractionExample, sendEmail: true },
      extractionSource.text,
    ),
  ).toThrow();
  expect(() =>
    validateExtraction(
      {
        ...extractionExample,
        packageContent: { value: "18", evidence: "Saco de 18 kg" },
      },
      extractionSource.text,
    ),
  ).toThrow("quote");
  expect(() =>
    validateExtraction(
      { ...extractionExample, packageContent: { value: "18", evidence: null } },
      extractionSource.text,
    ),
  ).toThrow("evidence");
  expect(() =>
    validateExtraction(
      { ...extractionExample, currency: { value: "EUR", evidence: "S/" } },
      extractionSource.text,
    ),
  ).toThrow();
});

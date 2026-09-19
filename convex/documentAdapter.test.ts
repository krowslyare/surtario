import { expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { extractDocument, validateDocument } from "./lib/documentExtraction";
import { extractionExample, extractionSource } from "../fixtures/extraction";
import files from "../fixtures/documentFiles.json";
import type { ActionCtx } from "./_generated/server";
const mocks = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("@convex-dev/agent", () => ({
  Agent: class {
    generateObject = mocks.generateObject;
  },
}));
test("adapter sends binary image/PDF parts, bounds generation and validates the result", async () => {
  const result = validateDocument({
    documentType: "quotation",
    transcript: extractionSource.text,
    offer: extractionExample,
  });
  mocks.generateObject.mockResolvedValue({ object: result });
  for (const kind of ["image", "pdf", "image_us", "pdf_us"] as const) {
    expect(
      await extractDocument(
        {} as ActionCtx,
        files[kind],
        "fake-key",
        "fake-model",
      ),
    ).toEqual(result);
    const options = mocks.generateObject.mock.lastCall![2];
    expect(options.maxRetries).toBe(0);
    expect(options.maxOutputTokens).toBe(5000);
    const part = options.messages[0].content[1];
    expect(part.type).toBe(
      files[kind].mediaType === "application/pdf" ? "file" : "image",
    );
    expect(part.mediaType).toBe(files[kind].mediaType);
    const bytes = part.image ?? part.data;
    expect(Buffer.from(bytes)).toEqual(
      readFileSync(`public${files[kind].url}`),
    );
  }
}, 15000);

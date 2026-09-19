import { describe, expect, test } from "vitest";
import {
  productSourceForUrl,
  sourcesForQuery,
  syntheticReplyTextForMail,
} from "./server.mjs";

describe("rehearsal provider fixtures", () => {
  test("preserves the legacy Peru rice scenario and child links", () => {
    const sources = sourcesForQuery("Arroz extra proveedores Lima, Peru");
    expect(sources).toHaveLength(3);
    expect(sources.map((source) => source.markdown).join(" ")).toContain(
      "S/ 50",
    );
    expect(sources.map((source) => source.markdown).join(" ")).toContain(
      "S/ 110",
    );
    expect(sources[2].markdown).toContain("No publica precio");
    expect(
      productSourceForUrl(`${sources[0].url}/${sources[0].productPath}`),
    ).toBe(sources[0]);
  });

  test("returns three explicit synthetic US sources with USD/lb facts", () => {
    const sources = sourcesForQuery(
      "long-grain white rice wholesale restaurant suppliers Portland, OR, US",
    );
    expect(sources).toHaveLength(3);
    expect(sources[0].markdown).toContain("25 lb bag");
    expect(sources[0].markdown).toContain("USD 20.00");
    expect(sources[1].markdown).toContain("50 lb bag");
    expect(sources[1].markdown).toContain("USD 35.00");
    expect(sources[2].markdown).toContain("No price or package is published");
    expect(sources.every((source) => source.markdown.includes("SYNTHETIC"))).toBe(
      true,
    );
    expect(
      productSourceForUrl(`${sources[1].url}/${sources[1].productPath}`),
    ).toBe(sources[1]);
  });

  test("unknown searches and unowned child URLs remain unsupported", () => {
    expect(sourcesForQuery("olive oil Seattle")).toEqual([]);
    expect(productSourceForUrl("https://example.com/rehearsal/unowned")).toBe(
      undefined,
    );
  });

  test("explicit delivery rehearsal returns only a freight confirmation", () => {
    const reply = syntheticReplyTextForMail({ subject: "[rehearsal:delivery] Rice freight confirmation" });
    expect(reply).toContain("Freight is USD 4 per order.");
    expect(reply).toContain("SYNTHETIC");
    expect(reply).not.toMatch(/bag|lb|price per/);
  });

  test("matches the synthetic reply language and units to the inquiry", () => {
    const us = syntheticReplyTextForMail({
      subject: "Rice quote for Portland",
      text: "Please quote a 25 lb bag in USD.",
    });
    expect(us).toContain("SYNTHETIC REHEARSAL REPLY");
    expect(us).toContain("25 lb bag at USD 19.00");
    expect(us).not.toMatch(/PEN|kg|arroz/i);

    const peru = syntheticReplyTextForMail({
      subject: "Cotización de arroz",
      text: "Precio por saco para Lima",
    });
    expect(peru).toContain("RESPUESTA SINTÉTICA DE ENSAYO");
    expect(peru).toContain("10 kg a S/ 47 PEN");
  });
});

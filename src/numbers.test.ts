import { describe, it, expect } from "vitest";
import { parseCents, parseDecimal } from "./numbers";
describe("Entrada manual sin conversiones ambiguas", () => {
  it("acepta punto o coma decimal sin perder centavos", () => {
    expect(parseCents("80,25")).toBe(8025);
    expect(parseCents("0.29")).toBe(29);
    expect(parseDecimal("0,125")).toBe(0.125);
    expect(parseDecimal("1", 0)).toBe(1);
    expect(parseDecimal("1.5", 0)).toBeNaN();
  });
  it("no convierte vacío en cero ni interpreta separadores de miles", () => {
    expect(parseCents("")).toBeNull();
    for (const value of ["1,000", "1.000", "1,234.00", "1e3", "-5", "Infinity"])
      expect(parseCents(value)).toBeNaN();
    expect(parseCents("0")).toBe(0);
  });
});

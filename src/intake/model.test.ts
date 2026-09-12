import { describe, expect, it } from "vitest";
import {
  fileKind,
  manualRows,
  normalizeSheet,
  parseCsv,
  rowsFromColumn,
  validateRows,
  MAX_FILE_BYTES,
} from "./model";

describe("entrada local de insumos", () => {
  it("conserva decimales, ceros y comas dentro de comillas como texto", () => {
    const sheet = parseCsv(
      '\uFEFFInsumo;Precio;Código\r\n"Arroz, extra";4,50;0012\r\nAceite;;0013\r\n',
    );
    expect(sheet.rows).toEqual([
      ["Insumo", "Precio", "Código"],
      ["Arroz, extra", "4,50", "0012"],
      ["Aceite", "", "0013"],
    ]);
    expect(rowsFromColumn(sheet, 0, true)[0]).toEqual({
      id: "1",
      ingredient: "Arroz, extra",
      original: ["Arroz, extra", "4,50", "0012"],
      line: 2,
    });
  });
  it("no elimina silenciosamente filas con insumo vacío pero otros datos", () => {
    const rows = rowsFromColumn(
      parseCsv("Insumo,Precio\n,80\n\nArroz,5"),
      0,
      true,
    );
    expect(rows.map((row) => [row.line, row.ingredient])).toEqual([
      [2, ""],
      [4, "Arroz"],
    ]);
    expect(() => validateRows(rows)).toThrow("Complete or remove");
  });
  it("permite listas sin encabezado, no deduplica y conserva original al editar", () => {
    const rows = manualRows("Arroz\n\nArroz\nAceite");
    expect(rows.map((row) => row.line)).toEqual([1, 3, 4]);
    rows[0].ingredient = "Arroz extra";
    expect(rows[0].original).toEqual(["Arroz"]);
    expect(() => validateRows(rows)).not.toThrow();
  });
  it("rechaza CSV mal formado, tamaños, formatos y límites sin truncar", () => {
    expect(() => parseCsv('a,b\n"sin cierre,b')).toThrow("CSV");
    expect(() => fileKind({ name: "old.xls", size: 100 })).toThrow("XLSX");
    expect(() =>
      fileKind({ name: "data.csv", size: MAX_FILE_BYTES + 1 }),
    ).toThrow("3 MB");
    expect(() => fileKind({ name: "data.csv", size: 0 })).toThrow("empty");
    expect(() =>
      normalizeSheet(
        "large",
        Array.from({ length: 102 }, () => ["Arroz"]),
      ),
    ).toThrow("100");
    expect(() => normalizeSheet("wide", [Array(21).fill("x")])).toThrow("20");
    expect(() => normalizeSheet("long", [["a".repeat(2001)]])).toThrow("2000");
  });
  it("exige revisión válida y no ejecuta contenido de documento", () => {
    const rows = manualRows(
      '<script>alert(1)</script>\n=IMPORTXML("https://example.test")',
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].ingredient).toBe('=IMPORTXML("https://example.test")');
    expect(() => validateRows([])).toThrow("at least");
    expect(() => validateRows(manualRows("x".repeat(121)))).toThrow("120");
    expect(() => rowsFromColumn(parseCsv("Arroz"), -1, false)).toThrow(
      "ingredient column",
    );
  });
});

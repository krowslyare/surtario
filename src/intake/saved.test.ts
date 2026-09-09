import { describe, expect, it } from "vitest";
import { batchFromSavedList } from "./saved";

describe("batchFromSavedList", () => {
  it("rebuilds the local queue from names without inventing file data", () => {
    const batch = batchFromSavedList({
      id: "list-id" as never,
      ingredients: ["Arroz", "Aceite vegetal"],
      sourceKind: "spreadsheet",
      sourceLabel: "XLSX o CSV revisado",
      updatedAt: 1,
    });

    expect(batch).toEqual({
      rows: [
        { id: "0", ingredient: "Arroz", original: ["Arroz"], line: 1 },
        {
          id: "1",
          ingredient: "Aceite vegetal",
          original: ["Aceite vegetal"],
          line: 2,
        },
      ],
      file: null,
      sheet: "",
      column: null,
      hasHeader: false,
      method: "spreadsheet",
      sourceLabel: "Lista guardada · XLSX o CSV revisado",
    });
  });
});

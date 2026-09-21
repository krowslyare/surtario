import type { SavedIngredientList } from "../components/SavedIngredientLists";
import type { IntakeBatch } from "./model";

export function batchFromSavedList(list: SavedIngredientList): IntakeBatch {
  return {
    rows: list.rows ? list.rows.map((row, index) => ({ ...row, original: [row.original], line: index + 1 })) : list.ingredients.map((ingredient, index) => ({
      id: String(index),
      ingredient,
      original: [ingredient],
      line: index + 1,
    })),
    file: null,
    sheet: "",
    column: null,
    hasHeader: false,
    method: list.sourceKind,
    sourceLabel: `Saved list · ${list.sourceLabel}`,
  };
}

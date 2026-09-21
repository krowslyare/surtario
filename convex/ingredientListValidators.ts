import { listRow } from "./ingredientResearchValidators";
import { v } from "convex/values";

export const ingredientListSourceKind = v.union(
  v.literal("manual"),
  v.literal("spreadsheet"),
  v.literal("ai"),
  v.literal("transcription"),
);

export const savedIngredientListValidator = v.object({
  id: v.id("ingredientLists"),
  ingredients: v.array(v.string()),
  rows: v.optional(v.array(listRow)),
  sourceKind: ingredientListSourceKind,
  sourceLabel: v.string(),
  updatedAt: v.number(),
});

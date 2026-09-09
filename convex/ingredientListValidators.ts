import { v } from "convex/values";

export const ingredientListSourceKind = v.union(
  v.literal("manual"),
  v.literal("spreadsheet"),
);

export const savedIngredientListValidator = v.object({
  id: v.id("ingredientLists"),
  ingredients: v.array(v.string()),
  sourceKind: ingredientListSourceKind,
  sourceLabel: v.string(),
  updatedAt: v.number(),
});

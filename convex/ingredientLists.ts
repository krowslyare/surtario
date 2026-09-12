import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  ingredientListSourceKind,
  savedIngredientListValidator,
} from "./ingredientListValidators";
import { ownerHash } from "./lib/demoSession";

const MAX_INGREDIENTS = 100;
const MAX_INGREDIENT_LENGTH = 120;
const MAX_PER_SESSION = 10;
const MAX_GLOBAL = 100;

function sourceLabel(sourceKind: "manual" | "spreadsheet") {
  return sourceKind === "manual"
    ? "Entrada manual revisada"
    : "XLSX o CSV revisado";
}

function publicList(list: Doc<"ingredientLists">) {
  return {
    id: list._id,
    ingredients: list.ingredients,
    sourceKind: list.sourceKind,
    sourceLabel: sourceLabel(list.sourceKind),
    updatedAt: list.updatedAt,
  };
}

function reviewedIngredients(values: string[]) {
  if (values.length < 1 || values.length > MAX_INGREDIENTS)
    throw new ConvexError("Guarda entre 1 y 100 insumos revisados.");
  const ingredients = values.map((value) => value.trim());
  if (
    ingredients.some(
      (value) => value.length < 1 || value.length > MAX_INGREDIENT_LENGTH,
    )
  ) {
    throw new ConvexError("Cada insumo debe tener entre 1 y 120 caracteres.");
  }
  return ingredients;
}

export const list = query({
  args: { token: v.string() },
  returns: v.array(savedIngredientListValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const lists = await ctx.db
      .query("ingredientLists")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    return lists.map(publicList).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    ingredients: v.array(v.string()),
    sourceKind: ingredientListSourceKind,
  },
  returns: savedIngredientListValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!/^[a-f0-9-]{36}$/.test(args.clientId))
      throw new ConvexError("Invalid request.");
    const ingredients = reviewedIngredients(args.ingredients);
    const existing = await ctx.db
      .query("ingredientLists")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.sourceKind !== args.sourceKind ||
        existing.ingredients.length !== ingredients.length ||
        ingredients.some(
          (value, index) => existing.ingredients[index] !== value,
        )
      ) {
        throw new ConvexError(
          "The previous request saved a different list. Review saved lists before trying again.",
        );
      }
      return publicList(existing);
    }
    const own = await ctx.db
      .query("ingredientLists")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError("This session supports up to 10 saved lists.");
    const all = await ctx.db
      .query("ingredientLists")
      .withIndex("by_creation_time")
      .take(MAX_GLOBAL);
    if (all.length >= MAX_GLOBAL)
      throw new ConvexError("The demo list capacity has been reached.");
    const id = await ctx.db.insert("ingredientLists", {
      ownerHash: hash,
      clientId: args.clientId,
      ingredients,
      sourceKind: args.sourceKind,
      updatedAt: Date.now(),
    });
    return publicList((await ctx.db.get("ingredientLists", id))!);
  },
});

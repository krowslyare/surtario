import { listRow } from "./ingredientResearchValidators";
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

function sourceLabel(sourceKind: "manual" | "spreadsheet" | "ai" | "transcription") {
  if (sourceKind === "ai") return "Reviewed AI list reading";
  if (sourceKind === "transcription") return "Reviewed document transcript";
  return sourceKind === "manual"
    ? "Reviewed manual input"
    : "Reviewed XLSX or CSV";
}

function publicList(list: Doc<"ingredientLists">) {
  return {
    id: list._id,
    ingredients: list.ingredients,
    ...(list.rows ? { rows: list.rows } : {}),
    sourceKind: list.sourceKind,
    sourceLabel: sourceLabel(list.sourceKind),
    updatedAt: list.updatedAt,
  };
}

function reviewedIngredients(values: string[]) {
  if (values.length < 1 || values.length > MAX_INGREDIENTS)
    throw new ConvexError("Save between 1 and 100 reviewed ingredients.");
  const ingredients = values.map((value) => value.trim());
  if (
    ingredients.some(
      (value) => value.length < 1 || value.length > MAX_INGREDIENT_LENGTH,
    )
  ) {
    throw new ConvexError("Each ingredient must be between 1 and 120 characters.");
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
    rows: v.optional(v.array(listRow)),
  },
  returns: savedIngredientListValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!/^[a-f0-9-]{36}$/.test(args.clientId))
      throw new ConvexError("Invalid request.");
    const ingredients = reviewedIngredients(args.ingredients);
    if (args.rows && (args.rows.length !== ingredients.length || args.rows.some((r, i) => r.ingredient !== ingredients[i] || r.needsReview || r.original.length > 2000 || r.reference.length > 200 || (r.documentHash !== undefined && !/^[a-f0-9]{64}$/.test(r.documentHash)) || r.id.length > 80))) throw new ConvexError("Review the source rows before saving.");
    const existing = await ctx.db
      .query("ingredientLists")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        JSON.stringify(existing.rows) !== JSON.stringify(args.rows) ||
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
      ...(args.rows ? { rows: args.rows } : {}),
      sourceKind: args.sourceKind,
      updatedAt: Date.now(),
    });
    return publicList((await ctx.db.get("ingredientLists", id))!);
  },
});

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { savedProspect } from "./prospectValidators";
import { ownerHash } from "./lib/demoSession";
import type { Doc } from "./_generated/dataModel";
import { inspectSource } from "./lib/sourceQuality";
const view = ({
  _id,
  ownerHash: _owner,
  _creationTime: _created,
  ...fields
}: Doc<"webProspects">) => ({ id: _id, ...fields });
export const list = query({
  args: { token: v.string() },
  returns: v.array(savedProspect),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    return (
      await ctx.db
        .query("webProspects")
        .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
        .order("desc")
        .take(10)
    ).map(view);
  },
});
export const save = mutation({
  args: {
    token: v.string(),
    runId: v.id("researchRuns"),
    sourceIndex: v.number(),
    supplier: v.string(),
    contact: v.string(),
    confirmed: v.literal(true),
  },
  returns: savedProspect,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    const supplier = args.supplier.trim(),
      contact = args.contact.trim() || null;
    if (
      !supplier ||
      supplier.length > 120 ||
      /[\r\n]/.test(supplier) ||
      (contact !== null && (contact.length > 300 || /[\r\n]/.test(contact)))
    )
      throw new ConvexError(
        "Review the name and contact; use one line.",
      );
    if (!Number.isSafeInteger(args.sourceIndex) || args.sourceIndex < 0)
      throw new ConvexError("Invalid source.");
    const run = await ctx.db.get(args.runId);
    if (!run || run.ownerHash !== hash)
      throw new ConvexError("Research unavailable in this session.");
    if (run.status !== "complete")
      throw new ConvexError("Research is not complete.");
    const source = run.sources[args.sourceIndex];
    if (!source) throw new ConvexError("Invalid source.");
    const inspection = inspectSource(source, run.ingredient);
    if (
      ["blocked", "unrelated"].includes(inspection.state) ||
      source.analysis?.kind === "irrelevant" ||
      (source.readStatus && source.readStatus !== "complete")
    )
      throw new ConvexError(
        "Esta fuente no aporta un distribuidor revisable para el insumo.",
      );
    const url = new URL(source.url);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new ConvexError("Source has no valid link.");
    const existing = await ctx.db
      .query("webProspects")
      .withIndex("by_ownerHash_and_runId_and_sourceIndex", (q) =>
        q
          .eq("ownerHash", hash)
          .eq("runId", args.runId)
          .eq("sourceIndex", args.sourceIndex),
      )
      .unique();
    if (existing) {
      if (existing.supplier !== supplier || existing.contact !== contact)
        throw new ConvexError(
          "The source was already saved with different data. Keep the original record.",
        );
      return view(existing);
    }
    if (
      (
        await ctx.db
          .query("webProspects")
          .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
          .take(10)
      ).length >= 10
    )
      throw new ConvexError("Up to 10 distributor candidates per session.");
    if (
      (
        await ctx.db
          .query("webProspects")
          .withIndex("by_creation_time")
          .take(100)
      ).length >= 100
    )
      throw new ConvexError("The demo candidate limit has been reached.");
    const id = await ctx.db.insert("webProspects", {
      ownerHash: hash,
      runId: args.runId,
      sourceIndex: args.sourceIndex,
      supplier,
      contact,
      ingredient: run.ingredient,
      region: run.region,
      sourceTitle: source.title,
      sourceUrl: source.url,
      observedAt: source.observedAt ?? run.observedAt,
      createdAt: Date.now(),
      simulated: run.simulated ?? false,
    });
    return view((await ctx.db.get(id))!);
  },
});

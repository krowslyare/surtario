import { ConvexError, v, type Infer } from "convex/values";
import { action, env, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ownerHash } from "./lib/demoSession";
import {
  documentKind,
  documentResult,
  documentRun,
} from "./documentValidators";
import { extractDocument, validateDocument } from "./lib/documentExtraction";
import files from "../fixtures/documentFiles.json";
import type { Doc } from "./_generated/dataModel";
const enabled = () =>
  env.DOCUMENT_EXTRACTION_ENABLED === "true" &&
  !!env.OPENAI_API_KEY?.trim() &&
  !!env.OPENAI_EXTRACTION_MODEL?.trim();
const view = ({
  _id,
  kind,
  createdAt,
  status,
  result,
  error,
}: Doc<"documentRuns">) => ({
  id: _id,
  kind,
  createdAt,
  status,
  result,
  error,
});
export const status = query({
  args: {},
  returns: v.boolean(),
  handler: async () => enabled(),
});
export const list = query({
  args: { token: v.string() },
  returns: v.array(documentRun),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    return (
      await ctx.db
        .query("documentRuns")
        .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
        .order("desc")
        .take(10)
    ).map(view);
  },
});
export const reserve = internalMutation({
  args: { token: v.string(), clientId: v.string(), kind: documentKind },
  returns: v.object({ fresh: v.boolean(), run: documentRun }),
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        args.clientId,
      )
    )
      throw new ConvexError("Invalid request.");
    const existing = await ctx.db
      .query("documentRuns")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (existing.kind !== args.kind)
        throw new ConvexError("The request belongs to a different file.");
      return { fresh: false, run: view(existing) };
    }
    if (!enabled())
      throw new ConvexError("Document reading is not enabled.");
    const own = await ctx.db
      .query("documentRuns")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .order("desc")
      .take(10);
    if (own.length >= 10)
      throw new ConvexError("Limit: 10 document reads per session.");
    if (own[0] && Date.now() - own[0].createdAt < 30000)
      throw new ConvexError("Wait 30 seconds before another document read.");
    if (
      (
        await ctx.db
          .query("documentRuns")
          .withIndex("by_creation_time")
          .take(100)
      ).length >= 100
    )
      throw new ConvexError("The demo document-reading limit has been reached.");
    const id = await ctx.db.insert("documentRuns", {
      ownerHash: hash,
      clientId: args.clientId,
      kind: args.kind,
      createdAt: Date.now(),
      status: "running",
      result: null,
      error: null,
    });
    return { fresh: true, run: view((await ctx.db.get(id))!) };
  },
});
export const finish = internalMutation({
  args: { id: v.id("documentRuns"), result: v.union(documentResult, v.null()) },
  returns: documentRun,
  handler: async (ctx, { id, result }) => {
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Missing document run");
    if (doc.status !== "running") return view(doc);
    if (result) validateDocument(result);
    await ctx.db.patch(id, {
      status: result ? "complete" : "failed",
      result,
      error: result
        ? null
        : "The document could not be read. Review the file or use manual transcription. It will not retry automatically.",
    });
    return view((await ctx.db.get(id))!);
  },
});
/** Public demo accepts only server-owned synthetic files, never user bytes or URLs. */
export const extract = action({
  args: { token: v.string(), clientId: v.string(), kind: documentKind },
  returns: documentRun,
  handler: async (ctx, args): Promise<Infer<typeof documentRun>> => {
    const reservation = await ctx.runMutation(internal.documents.reserve, args);
    if (!reservation.fresh) return reservation.run;
    let result: Infer<typeof documentResult> | null = null;
    try {
      result = await extractDocument(
        ctx,
        files[args.kind],
        env.OPENAI_API_KEY!,
        env.OPENAI_EXTRACTION_MODEL!,
      );
    } catch {
      /* Provider details may contain secrets or source text. */
    }
    // A failed commit must leave the reservation intact; do not repeat the paid call.
    return await ctx.runMutation(internal.documents.finish, {
      id: reservation.run.id,
      result,
    });
  },
});

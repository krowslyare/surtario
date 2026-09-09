import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { savedStudyValidator } from "./studyValidators";
import { marketExamples } from "../fixtures/market";
import type { Doc } from "./_generated/dataModel";

const MAX_PER_SESSION = 10;
const MAX_DEMO_STUDIES = 500;

import { ownerHash } from "./lib/demoSession";
function publicStudy(study: Doc<"studies">) {
  const { _id, term, region, results, selectedIds, revision, updatedAt } =
    study;
  return { id: _id, term, region, results, selectedIds, revision, updatedAt };
}
export const list = query({
  args: { token: v.string() },
  returns: v.array(savedStudyValidator),
  handler: async (ctx, { token }) => {
    const hash = await ownerHash(token);
    const studies = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    return studies.map(publicStudy).sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
export const save = mutation({
  args: {
    token: v.string(),
    clientId: v.string(),
    id: v.union(v.id("studies"), v.null()),
    expectedRevision: v.number(),
    term: v.string(),
    region: v.string(),
    selectedIds: v.array(v.string()),
  },
  returns: savedStudyValidator,
  handler: async (ctx, args) => {
    const hash = await ownerHash(args.token);
    if (!/^[a-f0-9-]{36}$/.test(args.clientId))
      throw new ConvexError("Solicitud no válida.");
    if (
      !Number.isSafeInteger(args.expectedRevision) ||
      args.expectedRevision < 0
    )
      throw new ConvexError("Revisión no válida.");
    // An anonymous caller cannot store arbitrary documents, names, prices or contacts.
    const term = args.term.trim();
    if (
      !["arroz", "abarrotes", "abarrotes secos"].includes(term.toLowerCase()) ||
      args.region !== "Lima"
    ) {
      throw new ConvexError(
        "Por ahora solo se guardan estudios del ejemplo de arroz y abarrotes en Lima.",
      );
    }
    const selectedIds = [...new Set(args.selectedIds)];
    if (
      args.selectedIds.length > 4 ||
      !selectedIds.length ||
      selectedIds.some((id) => !marketExamples.some((item) => item.id === id))
    ) {
      throw new ConvexError(
        "Selecciona entre una y cuatro opciones del ejemplo.",
      );
    }
    if (args.id) {
      const study = await ctx.db.get("studies", args.id);
      if (!study || study.ownerHash !== hash)
        throw new ConvexError("Estudio no disponible en esta sesión.");
      if (study.revision !== args.expectedRevision)
        throw new ConvexError(
          "El estudio cambió en otra vista. Ábrelo desde Guardados antes de actualizar.",
        );
      // Preserve the original source snapshot when updating selection.
      await ctx.db.patch("studies", study._id, {
        term,
        region: args.region,
        selectedIds,
        revision: study.revision + 1,
        updatedAt: Date.now(),
      });
      return publicStudy((await ctx.db.get("studies", study._id))!);
    }
    if (args.expectedRevision !== 0)
      throw new ConvexError("Revisión no válida.");
    const existing = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash_and_clientId", (q) =>
        q.eq("ownerHash", hash).eq("clientId", args.clientId),
      )
      .unique();
    if (existing) {
      if (
        existing.term !== term ||
        existing.region !== args.region ||
        existing.selectedIds.length !== selectedIds.length ||
        selectedIds.some((id) => !existing.selectedIds.includes(id))
      ) {
        throw new ConvexError(
          "La solicitud anterior ya fue guardada con otra selección. Abre el estudio desde Guardados antes de actualizar.",
        );
      }
      return publicStudy(existing);
    }
    const own = await ctx.db
      .query("studies")
      .withIndex("by_ownerHash", (q) => q.eq("ownerHash", hash))
      .take(MAX_PER_SESSION);
    if (own.length >= MAX_PER_SESSION)
      throw new ConvexError("Esta sesión admite hasta 10 estudios de ejemplo.");
    const all = await ctx.db
      .query("studies")
      .withIndex("by_creation_time")
      .take(MAX_DEMO_STUDIES);
    if (all.length >= MAX_DEMO_STUDIES)
      throw new ConvexError("Se alcanzó la capacidad de esta demo local.");
    const id = await ctx.db.insert("studies", {
      ownerHash: hash,
      clientId: args.clientId,
      term,
      region: args.region,
      results: marketExamples,
      selectedIds,
      revision: 1,
      updatedAt: Date.now(),
    });
    return publicStudy((await ctx.db.get("studies", id))!);
  },
});

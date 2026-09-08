import { v } from "convex/values";

const nullableNumber = v.union(v.number(), v.null());
const nullableString = v.union(v.string(), v.null());
const source = v.object({
  title: v.string(),
  url: nullableString,
  observedAt: v.string(),
  publishedAt: nullableString,
  evidence: v.string(),
  simulated: v.boolean(),
});
const common = {
  id: v.string(),
  supplier: v.string(),
  ingredient: v.string(),
  description: v.string(),
  region: v.string(),
  source,
};
export const marketResultValidator = v.union(
  v.object({
    ...common,
    kind: v.literal("catalog"),
    specification: v.string(),
    packageContent: nullableNumber,
    packageUnit: v.union(v.literal("kg"), v.literal("L"), v.literal("unit")),
    priceCents: v.number(),
    currency: v.union(v.literal("PEN"), v.literal("USD")),
    minimumPackages: nullableNumber,
  }),
  v.object({
    ...common,
    kind: v.literal("distributor"),
    contact: v.union(
      v.null(),
      v.object({
        channel: v.union(
          v.literal("email"),
          v.literal("phone"),
          v.literal("website"),
        ),
        value: v.string(),
        verified: v.boolean(),
      }),
    ),
  }),
  v.object({ ...common, kind: v.literal("reference"), note: v.string() }),
);
export const studyContent = {
  term: v.string(),
  region: v.string(),
  results: v.array(marketResultValidator),
  selectedIds: v.array(v.string()),
  revision: v.number(),
  updatedAt: v.number(),
};
export const savedStudyValidator = v.object({
  id: v.id("studies"),
  ...studyContent,
});

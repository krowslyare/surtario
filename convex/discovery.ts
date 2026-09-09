import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { discoverSources } from "./lib/firecrawl";

/** Operator-only integration probe. No public paid endpoint or writes to demo studies. */
export const probe = internalAction({
  args: { ingredient: v.string(), region: v.string() },
  returns: v.object({
    observedAt: v.string(),
    discarded: v.number(),
    warning: v.boolean(),
    sources: v.array(
      v.object({
        url: v.string(),
        title: v.string(),
        description: v.string(),
        markdown: v.union(v.string(), v.null()),
        contentTruncated: v.boolean(),
      }),
    ),
  }),
  handler: async (_ctx, input) => {
    const result = await discoverSources(input, process.env.FIRECRAWL_API_KEY);
    return { ...result, observedAt: new Date().toISOString() };
  },
});

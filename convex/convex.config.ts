import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config";
const app = defineApp({
  env: {
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_EXTRACTION_MODEL: v.optional(v.string()),
    FIRECRAWL_API_KEY: v.optional(v.string()),
    LIVE_RESEARCH_ENABLED: v.optional(v.string()),
  },
});
app.use(agent);
export default app;

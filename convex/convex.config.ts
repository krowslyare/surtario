import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";
const app = defineApp({
  env: {
    REHEARSAL_BRIDGE_URL: v.optional(v.string()),
    REHEARSAL_BRIDGE_TOKEN: v.optional(v.string()),
    ADVISOR_ENABLED: v.optional(v.string()),
    OPENAI_ADVISOR_MODEL: v.optional(v.string()),
    OPENAI_API_KEY: v.optional(v.string()),
    OPENAI_EXTRACTION_MODEL: v.optional(v.string()),
    FIRECRAWL_API_KEY: v.optional(v.string()),
    DOCUMENT_EXTRACTION_ENABLED: v.optional(v.string()),
    LIVE_RESEARCH_ENABLED: v.optional(v.string()),
    AGENTMAIL_ENABLED: v.optional(v.string()),
    AGENTMAIL_API_KEY: v.optional(v.string()),
    AGENTMAIL_INBOX_ID: v.optional(v.string()),
    AGENTMAIL_TEST_RECIPIENT: v.optional(v.string()),
    AGENTMAIL_WEBHOOK_SECRET: v.optional(v.string()),
  },
});
app.use(agent);
// HTTP serving stays app-owned so the existing AgentMail webhook keeps its URL.
app.use(staticHosting);
export default app;

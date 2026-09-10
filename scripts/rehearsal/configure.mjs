import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";

// Intentionally requires a dedicated, already-running anonymous local deployment.
const run = promisify(execFile);
const local = JSON.parse(
  await readFile(".convex/local/default/config.json", "utf8"),
);
const envText = await readFile(".env.local", "utf8");
let extraEnv = "";
try {
  extraEnv = await readFile(".env", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const selectors = [
  ...envText.matchAll(/^\s*(?:export\s+)?CONVEX_DEPLOYMENT=(.*)$/gm),
].map((match) => match[1].trim());
const urls = [
  ...envText.matchAll(/^\s*(?:export\s+)?VITE_CONVEX_URL=(.*)$/gm),
].map((match) => match[1].trim());
const cloudUrl = `http://127.0.0.1:${local.ports.cloud}`;
if (
  process.env.CONVEX_DEPLOY_KEY ||
  process.env.CONVEX_DEPLOYMENT ||
  process.env.CONVEX_SELF_HOSTED_URL ||
  /CONVEX_DEPLOY_KEY|CONVEX_SELF_HOSTED_URL/.test(envText) ||
  extraEnv
    .split(/\r?\n/)
    .some((line) => line.trim() && !line.trim().startsWith("#")) ||
  selectors.length !== 1 ||
  selectors[0] !== `anonymous:${local.deploymentName}` ||
  urls.length !== 1 ||
  urls[0] !== cloudUrl
)
  throw new Error("Refusing ambiguous or non-anonymous deployment selectors.");
await mkdir(".local/rehearsal", { recursive: true });
let config;
try {
  config = JSON.parse(await readFile(".local/rehearsal/bridge.json", "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
config ??= {
  port: 8789,
  token: randomBytes(32).toString("hex"),
  siteUrl: `http://127.0.0.1:${local.ports.site}`,
  webhookSecret: `whsec_${randomBytes(32).toString("base64")}`,
  recipient: "proveedor@example.com",
};
if (config.siteUrl !== `http://127.0.0.1:${local.ports.site}`)
  throw new Error("Rehearsal backend changed; inspect configuration first.");
// Normalize existing, empty or duplicate flags before enabling simulated providers.
const rehearsalEnv = envText.replace(
  /^\s*(?:export\s+)?VITE_REHEARSAL\s*=.*$/gm,
  "",
);
await writeFile(
  ".env.local",
  rehearsalEnv.trimEnd() + "\nVITE_REHEARSAL=true\n",
);
await writeFile(
  ".local/rehearsal/bridge.json",
  JSON.stringify(config, null, 2),
  { mode: 0o600 },
);
console.log(
  `Configuring LOCAL anonymous rehearsal: ${cloudUrl}. Provider keys are dummy values.`,
);
const values = {
  REHEARSAL_BRIDGE_URL: `http://127.0.0.1:${config.port}`,
  REHEARSAL_BRIDGE_TOKEN: config.token,
  OPENAI_API_KEY: "local-rehearsal-only",
  OPENAI_EXTRACTION_MODEL: "gpt-5.6-luna",
  OPENAI_ADVISOR_MODEL: "gpt-5.6-luna",
  FIRECRAWL_API_KEY: "local-rehearsal-only",
  AGENTMAIL_API_KEY: "local-rehearsal-only",
  DOCUMENT_EXTRACTION_ENABLED: "true",
  LIVE_RESEARCH_ENABLED: "true",
  ADVISOR_ENABLED: "true",
  AGENTMAIL_ENABLED: "true",
  AGENTMAIL_INBOX_ID: "rehearsal@example.com",
  AGENTMAIL_TEST_RECIPIENT: config.recipient,
  AGENTMAIL_WEBHOOK_SECRET: config.webhookSecret,
};
for (const [key, value] of Object.entries(values)) {
  // Capture CLI output: no token or key values in the terminal.
  try {
    await run("npx", ["convex", "env", "set", key, value], { timeout: 20000 });
  } catch {
    throw new Error(`Could not configure ${key} on the local backend.`);
  }
}
console.log(
  "Local rehearsal configured. Start the bridge and Vite in separate terminals.",
);

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
const deployment = "incredible-wolverine-122";

export function readiness(values) {
  const requirements = {
    search: ["FIRECRAWL_API_KEY", "LIVE_RESEARCH_ENABLED"],
    sourcing: [
      "FIRECRAWL_API_KEY",
      "LIVE_RESEARCH_ENABLED",
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "SOURCING_ENABLED",
    ],
    extraction: [
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "LIVE_RESEARCH_ENABLED",
    ],
    documents: [
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "DOCUMENT_EXTRACTION_ENABLED",
    ],
    advisor: ["OPENAI_API_KEY", "OPENAI_ADVISOR_MODEL", "ADVISOR_ENABLED"],
    reply: [
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "REPLY_EXTRACTION_ENABLED",
    ],
    draft: [
      "OPENAI_API_KEY",
      "OPENAI_EXTRACTION_MODEL",
      "QUOTATION_DRAFT_ENABLED",
    ],
    mail: [
      "AGENTMAIL_API_KEY",
      "AGENTMAIL_INBOX_ID",
      "AGENTMAIL_TEST_RECIPIENT",
      "AGENTMAIL_WEBHOOK_SECRET",
      "AGENTMAIL_ENABLED",
    ],
  };
  return Object.fromEntries(
    Object.entries(requirements).map(([name, keys]) => [
      name,
      {
        missing: keys.filter((key) =>
          key.endsWith("_ENABLED")
            ? values[key] !== "true"
            : !values[key]?.trim() || values[key] === "local-rehearsal-only",
        ),
      },
    ]),
  );
}

// Message-scoped keys intentionally cannot read administrative inbox metadata.
export async function checkAgentMail(values, request = fetch) {
  const response = await request(
    `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(values.AGENTMAIL_INBOX_ID)}/messages?limit=1`,
    {
      headers: { Authorization: `Bearer ${values.AGENTMAIL_API_KEY}` },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) return {
    status: response.status === 403 ? "blocked" : "failed",
    httpStatus: response.status,
    reason: "Message read request rejected; send and delivery are unverified",
  };
  const result = await response.json();
  return {
    status: Array.isArray(result.messages) ? "passed" : "failed",
    httpStatus: response.status,
    proves: "Message read access only; no send, delivery or webhook round trip",
  };
}

async function convex(args) {
  try {
    const { stdout } = await run(
      "npx",
      ["convex", ...args, "--deployment", deployment],
      {
        encoding: "utf8",
        timeout: 240_000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    return stdout;
  } catch {
    // Child-process errors contain stdout/stderr, potentially including secrets.
    throw new Error("Convex command failed; raw output withheld.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--live") || args.length > 1)
    throw new Error("Usage: npm run check:providers -- [--live]");
  if (
    [
      "CONVEX_DEPLOY_KEY",
      "CONVEX_SELF_HOSTED_URL",
      "CONVEX_SELF_HOSTED_ADMIN_KEY",
    ].some((key) => process.env[key])
  )
    throw new Error(
      "Use CLI login with the fixed development target; conflicting credentials refused.",
    );
  console.log(
    `target: dev (${deployment}); no deployment or environment changes`,
  );
  const raw = await convex(["env", "list"]);
  const values = Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter((line) => line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
  if (values.REHEARSAL_BRIDGE_URL)
    throw new Error(
      "Rehearsal transport detected; cannot certify direct providers.",
    );
  const report = {
    observedAt: new Date().toISOString(),
    deployment,
    scope:
      "Deployed development integrations; not the local PR build or full E2E acceptance",
    configuration: readiness(values),
    checks: {},
    integratedJourney: "not_executed",
  };
  async function check(name, operation) {
    const start = Date.now();
    try {
      report.checks[name] = {
        ...(await operation()),
        durationMs: Date.now() - start,
      };
    } catch {
      report.checks[name] = {
        status: "failed",
        durationMs: Date.now() - start,
        reason: "Request failed; raw provider output withheld",
      };
    }
  }
  if (args.includes("--live")) {
    if (!report.configuration.search.missing.length) {
      console.log(
        "Running one bounded real discovery probe through the deployed app (provider credits apply).",
      );
      await check("firecrawl", async () => {
        const result = JSON.parse(
          await convex([
            "run",
            "discovery:probe",
            JSON.stringify({
              ingredient: "long grain white rice",
              region: "Portland, OR, US",
            }),
          ]),
        );
        if (!Array.isArray(result.sources))
          throw new Error("Invalid probe response");
        const sources = result.sources.map((source) => ({
          // Keep no query strings, credentials, raw bodies or personal contacts.
          domain: new URL(source.url).hostname,
          textCharacters: source.markdown?.length ?? 0,
          sha256: source.markdown
            ? createHash("sha256").update(source.markdown).digest("hex")
            : null,
        }));
        return {
          status:
            result.warning ||
            !sources.some((source) => source.textCharacters > 0)
              ? "partial"
              : "passed",
          warning: result.warning,
          sources,
          proves:
            "Live discovery and recovered text only; prices/equivalence/delivery not validated",
        };
      });
    } else report.checks.firecrawl = { status: "blocked" };
    if (values.AGENTMAIL_API_KEY && values.AGENTMAIL_INBOX_ID) {
      await check("agentmail", () => checkAgentMail(values));
    } else report.checks.agentmail = { status: "blocked" };
  }
  report.checks.openai = {
    status: values.OPENAI_API_KEY ? "not_executed" : "blocked",
    reason: values.OPENAI_API_KEY
      ? "Run application extraction/advisor/reply acceptance; a configured key is insufficient"
      : "OPENAI_API_KEY is absent on the target",
  };
  await mkdir(".local/provider-checks", { recursive: true });
  const path = `.local/provider-checks/${report.observedAt.replace(/[:.]/g, "-")}.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(JSON.stringify(report, null, 2));
  console.log(`Evidence: ${path}`);
  // Configuration/probe checks never certify the integrated journey.
  process.exitCode =
    Object.values(report.configuration).some((value) => value.missing.length) ||
    Object.values(report.checks).some((value) =>
      ["failed", "blocked", "partial"].includes(value.status),
    )
      ? 2
      : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

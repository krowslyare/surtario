// Development-only receiver. Hosted deployments keep their signed webhook.
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify, parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import WebSocket from "ws";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export function assertLocalTarget(values, config, environment = process.env) {
  if (["CONVEX_DEPLOY_KEY", "CONVEX_SELF_HOSTED_URL", "CONVEX_SELF_HOSTED_ADMIN_KEY", "CONVEX_DEPLOYMENT", "VITE_CONVEX_URL"].some(key => environment[key]))
    throw new Error("Conflicting deployment overrides refused.");
  if (!config.deploymentName?.startsWith("anonymous-") ||
      values.CONVEX_DEPLOYMENT !== `anonymous:${config.deploymentName}` ||
      values.VITE_CONVEX_URL !== `http://127.0.0.1:${config.ports?.cloud}` ||
      !config.adminKey)
    throw new Error("Receiver requires the matching anonymous localhost backend.");
  return values.VITE_CONVEX_URL;
}

export function receivedReply(event, inboxId, recipient) {
  if (event?.event_type !== "message.received") return null;
  const m = event.message;
  if (!m || m.inbox_id !== inboxId || typeof m.from !== "string") return null;
  const sender = (m.from.match(/<([^<>]+)>/)?.[1] ?? m.from).trim().toLowerCase();
  if (sender !== recipient.trim().toLowerCase()) return null;
  const fields = [event.event_id, m.message_id, m.inbox_id, m.thread_id, m.from, m.timestamp];
  const limits = [300, 500, 300, 500, 500, 100];
  if (fields.some((value, i) => typeof value !== "string" || !value.length || value.length > limits[i]) ||
      (m.text !== undefined && typeof m.text !== "string")) return null;
  const text = m.text ?? "";
  const notice = "\n[Reply truncated: see the original email for the full text.]";
  return {
    eventId: event.event_id, messageId: m.message_id, inboxId: m.inbox_id,
    threadId: m.thread_id, from: m.from, receivedAt: m.timestamp,
    text: text.length > 20_000 ? text.slice(0, 20_000 - notice.length) + notice : text,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => arg !== "--check"))
    throw new Error("Usage: npm run dev:mail -- [--check]");
  const checkOnly = args.includes("--check");
  const values = parseEnv(await readFile(".env.local", "utf8"));
  const config = JSON.parse(await readFile(".convex/local/default/config.json", "utf8"));
  const url = assertLocalTarget(values, config);
  console.log(`Target: local-anonymous (${config.deploymentName}); ${checkOnly ? "subscription check only" : "inbound replies only"}.`);
  let raw;
  try {
    ({ stdout: raw } = await promisify(execFile)("npx", ["convex", "env", "list"], { timeout: 30_000, maxBuffer: 1_000_000 }));
  } catch { throw new Error("Cannot read local server configuration; details withheld."); }
  const env = parseEnv(raw);
  const keys = ["AGENTMAIL_API_KEY", "AGENTMAIL_INBOX_ID", "AGENTMAIL_TEST_RECIPIENT"];
  if (keys.some(key => !env[key]?.trim()) || env.REHEARSAL_BRIDGE_URL)
    throw new Error("Direct AgentMail configuration is incomplete.");
  const client = new ConvexHttpClient(url, { logger: false });
  client.setAdminAuth(config.adminKey);
  // AgentMail's official WebSocket endpoint and subscribe protocol:
  // https://docs.agentmail.to/websockets . Credentials stay in headers.
  const socket = new WebSocket("wss://ws.agentmail.to/v0", {
    headers: { Authorization: `Bearer ${env.AGENTMAIL_API_KEY}` },
    handshakeTimeout: 15_000, maxPayload: 1_000_000,
  });
  let stopping = false;
  let subscribed = false;
  let pending = 0;
  let queue = Promise.resolve();
  const stop = (failed = false) => {
    if (stopping) return;
    stopping = true;
    clearTimeout(timeout);
    clearInterval(heartbeat);
    if (failed) process.exitCode = 1;
    socket.close();
  };
  const timeout = setTimeout(() => {
    console.error("AgentMail did not confirm the subscription; receiver stopped.");
    stop(true);
  }, 20_000);
  const heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.ping(); }, 20_000);
  socket.on("open", () => socket.send(JSON.stringify({
    type: "subscribe", inbox_ids: [env.AGENTMAIL_INBOX_ID], event_types: ["message.received"],
  })));
  socket.on("message", rawMessage => {
    let event;
    try { event = JSON.parse(rawMessage.toString()); }
    catch { console.error("Invalid AgentMail event ignored."); return; }
    if (event.type === "subscribed" && event.inbox_ids?.length === 1 && event.inbox_ids[0] === env.AGENTMAIL_INBOX_ID) {
      subscribed = true;
      clearTimeout(timeout);
      console.log("AgentMail subscription confirmed for the configured inbox. No email sent.");
      if (checkOnly) stop();
      return;
    }
    if (stopping || checkOnly || !subscribed) return;
    const reply = receivedReply(event, env.AGENTMAIL_INBOX_ID, env.AGENTMAIL_TEST_RECIPIENT);
    if (!reply) return;
    if (++pending > 20) { console.error("Receiver queue full; stopped."); stop(true); return; }
    queue = queue.then(async () => {
      const result = await client.mutation(makeFunctionReference("quotationMail:recordReceived"), reply);
      console.log(`Reply recorded: ${result}.`);
    }).catch(() => {
      console.error("Local reply persistence failed; details withheld. Restart and check the original inbox.");
      stop(true);
    }).finally(() => { pending--; });
  });
  socket.on("error", () => { console.error("AgentMail connection failed; details withheld."); stop(true); });
  socket.on("close", () => {
    if (!stopping) { console.error("AgentMail disconnected. Restart dev:mail before testing replies."); stop(true); }
  });
  process.once("SIGINT", () => stop());
  process.once("SIGTERM", () => stop());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error("Local mail setup failed; check target and server configuration. Raw details withheld."); process.exitCode = 1; });

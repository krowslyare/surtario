import type { BrowserContext } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DEFAULT_DEPLOYMENT = "anonymous:anonymous-convexhackaton";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:3210";
const DEFAULT_FRONTEND_URL = "http://127.0.0.1:5173";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function envLocalValue(name: "CONVEX_DEPLOYMENT" | "VITE_CONVEX_URL") {
  let contents = "";
  try {
    contents = readFileSync(".env.local", "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const prefix = `${name}=`;
  return contents
    .split(/\r?\n/)
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

function localHttpOrigin(raw: string, setting: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${setting} must be an explicit local HTTP URL.`);
  }
  if (
    url.protocol !== "http:" ||
    !LOCAL_HOSTS.has(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      `${setting} must be an explicit localhost HTTP origin with a port.`,
    );
  return url;
}

export function localBackendTarget() {
  if ("CONVEX_DEPLOY_KEY" in process.env)
    throw new Error("Local E2E refuses CONVEX_DEPLOY_KEY.");
  const deployment =
    process.env.E2E_LOCAL_DEPLOYMENT ??
    envLocalValue("CONVEX_DEPLOYMENT") ??
    DEFAULT_DEPLOYMENT;
  if (!/^anonymous:[a-z0-9][a-z0-9-]*$/i.test(deployment))
    throw new Error(
      "E2E_LOCAL_DEPLOYMENT must select an anonymous local deployment.",
    );
  if (
    process.env.CONVEX_DEPLOYMENT &&
    process.env.CONVEX_DEPLOYMENT !== deployment
  )
    throw new Error(
      "CONVEX_DEPLOYMENT conflicts with the verified local E2E deployment.",
    );
  const backend = localHttpOrigin(
    process.env.E2E_LOCAL_BACKEND_URL ??
      envLocalValue("VITE_CONVEX_URL") ??
      DEFAULT_BACKEND_URL,
    "E2E_LOCAL_BACKEND_URL",
  );
  return { deployment, backendUrl: backend.origin, backend };
}

export function localFrontendTarget() {
  const frontend = localHttpOrigin(
    process.env.E2E_LOCAL_FRONTEND_URL ?? DEFAULT_FRONTEND_URL,
    "E2E_LOCAL_FRONTEND_URL",
  );
  return {
    url: frontend.origin,
    hostname: frontend.hostname,
    port: frontend.port,
  };
}

export function runLocalConvex(args: string[]) {
  const target = localBackendTarget();
  const inherited = { ...process.env };
  delete inherited.CONVEX_DEPLOY_KEY;
  delete inherited.CONVEX_ADMIN_KEY;
  delete inherited.CONVEX_URL;
  return execFileSync("npx", ["convex", ...args], {
    encoding: "utf8",
    env: {
      ...inherited,
      CONVEX_DEPLOYMENT: target.deployment,
      VITE_CONVEX_URL: target.backendUrl,
    },
  });
}

export async function connectOnlyToLocalBackend(context: BrowserContext) {
  const { backend } = localBackendTarget();
  await context.routeWebSocket(/.*/, (socket) => {
    const url = new URL(socket.url());
    if (
      url.protocol !== "ws:" ||
      url.hostname !== backend.hostname ||
      url.port !== backend.port
    )
      throw new Error(
        "Browser WebSocket does not match the verified local backend host and port.",
      );
    socket.connectToServer();
  });
}

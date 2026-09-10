import { env } from "../_generated/server";

type RehearsalConfig = { cloudUrl: string; bridgeUrl?: string; token?: string };

function loopback(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Provider rehearsal requires an HTTP loopback origin.");
  return url;
}

export function providerRehearsalConfigured(config: RehearsalConfig): boolean {
  if (!config.bridgeUrl) return false;
  loopback(config.cloudUrl);
  loopback(config.bridgeUrl);
  if (!config.token || config.token.length < 32)
    throw new Error("Provider rehearsal requires a local bridge token.");
  return true;
}

export const providerRehearsalEnabled = () =>
  providerRehearsalConfigured({
    cloudUrl: env.CONVEX_CLOUD_URL,
    bridgeUrl: env.REHEARSAL_BRIDGE_URL,
    token: env.REHEARSAL_BRIDGE_TOKEN,
  });

/** Local-only transport substitution; ownership, validation and tools still run in Convex. */
export function createProviderTransport(
  config: RehearsalConfig,
  request: typeof fetch = fetch,
): typeof fetch {
  if (!providerRehearsalConfigured(config)) return request;
  const bridge = loopback(config.bridgeUrl!);
  return async (input, init) => {
    const original = new Request(input, init);
    const source = new URL(original.url);
    const prefix =
      source.origin === "https://api.openai.com" &&
      source.pathname === "/v1/responses"
        ? "openai"
        : source.origin === "https://api.firecrawl.dev" &&
            source.pathname === "/v2/search"
          ? "firecrawl"
          : source.origin === "https://api.agentmail.to" &&
              /^\/v0\/inboxes\/[^/]+\/messages\/send$/.test(source.pathname)
            ? "agentmail"
            : null;
    if (
      !prefix ||
      source.search ||
      source.username ||
      source.password ||
      original.method !== "POST"
    )
      throw new Error("Unsupported provider rehearsal request.");
    // Never forward provider credentials, cookies or other headers to the bridge.
    const headers = new Headers({
      "Content-Type": "application/json",
      "X-Rehearsal-Token": config.token!,
    });
    const idempotencyKey = original.headers.get("Idempotency-Key");
    if (prefix === "agentmail" && idempotencyKey)
      headers.set("Idempotency-Key", idempotencyKey);
    return request(new URL(`/${prefix}${source.pathname}`, bridge), {
      method: "POST",
      headers,
      body: await original.text(),
      signal: original.signal,
      redirect: "error",
    });
  };
}

export const providerFetch: typeof fetch = (input, init) =>
  createProviderTransport({
    cloudUrl: env.CONVEX_CLOUD_URL,
    bridgeUrl: env.REHEARSAL_BRIDGE_URL,
    token: env.REHEARSAL_BRIDGE_TOKEN,
  })(input, init);

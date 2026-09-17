import { describe, expect, it, vi } from "vitest";
import {
  createProviderTransport,
  providerRehearsalConfigured,
} from "./lib/providerTransport";

const local = {
  cloudUrl: "http://127.0.0.1:3240",
  bridgeUrl: "http://127.0.0.1:8789",
  token: "t".repeat(64),
};
describe("local provider rehearsal transport", () => {
  it("reports rehearsal only for a fully validated loopback configuration", () => {
    expect(providerRehearsalConfigured(local)).toBe(true);
    expect(
      providerRehearsalConfigured({ cloudUrl: local.cloudUrl }),
    ).toBe(false);
  });
  it("preserves the default provider transport without opt-in", () => {
    const request = vi.fn();
    expect(
      createProviderTransport(
        { cloudUrl: "https://app.convex.cloud" },
        request,
      ),
    ).toBe(request);
  });
  it.each([
    { ...local, cloudUrl: "https://app.convex.cloud" },
    { ...local, bridgeUrl: "https://attacker.example" },
    { ...local, bridgeUrl: "http://127.0.0.1:8789/path" },
    { ...local, bridgeUrl: "http://user@127.0.0.1:8789" },
    { ...local, token: "short" },
  ])("refuses a nonlocal or incomplete configuration", (config) => {
    expect(() => createProviderTransport(config)).toThrow();
  });
  it("strips provider credentials and preserves body, cancellation and idempotency", async () => {
    const request = vi.fn(async () => new Response("{}"));
    const controller = new AbortController();
    const transport = createProviderTransport(local, request);
    await transport(
      "https://api.agentmail.to/v0/inboxes/rehearsal/messages/send",
      {
        method: "POST",
        body: '{"to":["test@example.com"]}',
        signal: controller.signal,
        headers: {
          Authorization: "Bearer private",
          Cookie: "private",
          "OpenAI-Project": "private",
          "Idempotency-Key": "stable",
        },
      },
    );
    const [url, init] = request.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe(
      "http://127.0.0.1:8789/agentmail/v0/inboxes/rehearsal/messages/send",
    );
    expect([...new Headers(init.headers).entries()]).toEqual([
      ["content-type", "application/json"],
      ["idempotency-key", "stable"],
      ["x-rehearsal-token", local.token],
    ]);
    expect(init.body).toBe('{"to":["test@example.com"]}');
    expect(init.redirect).toBe("error");
    controller.abort();
    expect(init.signal?.aborted).toBe(true);
  });
  it.each([
    "https://other.example/v1/responses",
    "https://api.openai.com/v1/files",
    "https://api.firecrawl.dev/v2/search?redirect=x",
  ])("does not become an arbitrary proxy: %s", async (url) => {
    const request = vi.fn();
    await expect(
      createProviderTransport(local, request)(url, { method: "POST" }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});

it("live Firecrawl stays direct in local hybrid mode while OpenAI secrets stay out of the CLI bridge", async () => {
  const request=vi.fn(async()=>Response.json({}));
  const transport=createProviderTransport({...local,liveFirecrawl:true},request);
  await transport("https://api.firecrawl.dev/v2/search",{method:"POST",body:"{}",headers:{Authorization:"Bearer live-test"}});
  const direct=(request.mock.calls as unknown as [Request][])[0][0];
  expect(direct.url).toBe("https://api.firecrawl.dev/v2/search");
  expect(direct.headers.get("Authorization")).toBe("Bearer live-test");
  await transport("https://api.openai.com/v1/responses",{method:"POST",body:"{}",headers:{Authorization:"Bearer dummy"}});
  const [url,init]=request.mock.calls[1] as unknown as [URL,RequestInit];
  expect(url.origin).toBe("http://127.0.0.1:8789");
  expect(new Headers(init.headers).has("Authorization")).toBe(false);
  expect(()=>createProviderTransport({...local,cloudUrl:"https://cloud.convex.cloud",liveFirecrawl:true},request)).toThrow();
});

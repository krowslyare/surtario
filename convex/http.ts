import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { Webhook } from "svix";
import { env, httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = env.AGENTMAIL_WEBHOOK_SECRET?.trim();
    if (!secret) return new Response("Webhook disabled", { status: 503 });
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > 1_000_000)
      return new Response("Payload too large", { status: 413 });
    if (!request.body) return new Response("Invalid event", { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        return new Response("Payload too large", { status: 413 });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const raw = new TextDecoder().decode(body);
    let payload: unknown;
    try {
      new Webhook(secret).verify(raw, {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      });
      payload = JSON.parse(raw) as unknown;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      !("event_type" in payload) ||
      payload.event_type !== "message.received"
    )
      return new Response("Ignored", { status: 200 });
    const event = payload as Record<string, unknown>;
    const message = event.message;
    if (!message || typeof message !== "object")
      return new Response("Invalid event", { status: 400 });
    const value = message as Record<string, unknown>;
    const fields = [
      event.event_id,
      value.message_id,
      value.inbox_id,
      value.thread_id,
      value.from,
    ];
    if (
      fields.some((field) => typeof field !== "string") ||
      (value.text !== undefined && typeof value.text !== "string")
    )
      return new Response("Invalid event", { status: 400 });
    const receivedAt =
      typeof value.timestamp === "string"
        ? value.timestamp
        : new Date().toISOString();
    const text = (value.text as string | undefined) ?? "";
    const truncationNotice = "\n[Reply truncated: see the original email for the full text.]";
    await ctx.runMutation(internal.quotationMail.recordReceived, {
      eventId: event.event_id as string,
      messageId: value.message_id as string,
      inboxId: value.inbox_id as string,
      threadId: value.thread_id as string,
      from: value.from as string,
      text: text.length > 20_000
        ? text.slice(0, 20_000 - truncationNotice.length) + truncationNotice
        : text,
      receivedAt,
    });
    return new Response("Accepted", { status: 200 });
  }),
});

// Exact application routes must be registered before the SPA fallback.
registerStaticRoutes(http, components.staticHosting);

export default http;

import { describe, expect, it } from "vitest";
import { assertLocalTarget, receivedReply } from "./local-agentmail.mjs";

const config = { deploymentName: "anonymous-test", ports: { cloud: 3230 }, adminKey: "test" };
const values = { CONVEX_DEPLOYMENT: "anonymous:anonymous-test", VITE_CONVEX_URL: "http://127.0.0.1:3230" };
const event = {
  type: "event", event_type: "message.received", event_id: "event-1",
  message: { inbox_id: "inbox", message_id: "message-1", thread_id: "thread-1", from: "Test <reply@example.test>", timestamp: "2026-09-19T12:00:00Z", text: "Delivery is USD 8." },
};

describe("local AgentMail receiver boundary", () => {
  it("only accepts the matching anonymous backend and refuses environment overrides", () => {
    expect(assertLocalTarget(values, config, {})).toBe(values.VITE_CONVEX_URL);
    expect(() => assertLocalTarget({ ...values, VITE_CONVEX_URL: "https://example.convex.cloud" }, config, {})).toThrow();
    expect(() => assertLocalTarget(values, config, { CONVEX_DEPLOY_KEY: "secret" })).toThrow();
    expect(() => assertLocalTarget(values, { ...config, deploymentName: "other" }, {})).toThrow();
  });
  it("routes genuine received event fields without converting them into approved terms", () => {
    expect(receivedReply(event, "inbox", "reply@example.test")).toEqual({
      eventId: "event-1", messageId: "message-1", threadId: "thread-1", inboxId: "inbox",
      from: "Test <reply@example.test>", receivedAt: "2026-09-19T12:00:00Z", text: "Delivery is USD 8.",
    });
  });
  it("ignores other inboxes, senders, sent/spam events and malformed fields", () => {
    expect(receivedReply(event, "other", "reply@example.test")).toBeNull();
    expect(receivedReply(event, "inbox", "other@example.test")).toBeNull();
    for (const event_type of ["message.sent", "message.received.spam"])
      expect(receivedReply({ ...event, event_type }, "inbox", "reply@example.test")).toBeNull();
    expect(receivedReply({ ...event, message: { ...event.message, thread_id: null } }, "inbox", "reply@example.test")).toBeNull();
  });
  it("bounds long reply text and retains the truncation warning", () => {
    const reply = receivedReply({ ...event, message: { ...event.message, text: "a".repeat(25_000) } }, "inbox", "reply@example.test");
    expect(reply.text).toHaveLength(20_000);
    expect(reply.text).toContain("Reply truncated");
  });
});

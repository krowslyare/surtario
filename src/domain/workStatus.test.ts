import { expect, test } from "vitest";
import { hasObservedChanges, mailAttention, workStatus } from "./workStatus";
const base = { requests: [], reviewedReplyIds: [], blocker: null, pendingEvidence: 0, running: false, failed: false, hasComparison: false };
test("attention, research and supplier waiting overlap without counting a case twice", () => {
  const status = workStatus({ ...base, running: true, requests: [
    { id: "waiting", state: "sent", replies: [] }, { id: "replied", state: "sent", replies: [{ messageId: "reply" }] },
  ] });
  expect(status).toMatchObject({ attention: true, researching: true, waiting: true, target: "mail", requestId: "replied" });
  expect(workStatus({ ...base, hasComparison: true })).toMatchObject({ attention: false, action: "Open comparison" });
});
test("uncertain sends outrank replies, exact persisted replies clear, oldest draft wins stably", () => {
  const messages = [{ id: "reply", state: "sent", replies: [{ messageId: "m" }] }, { id: "uncertain", state: "uncertain", replies: [] }];
  expect(mailAttention(messages, [])?.requestId).toBe("uncertain");
  expect(mailAttention([messages[0]], ["reply:another:m"])?.requestId).toBe("reply");
  expect(mailAttention([messages[0]], ["reply:reply:m"])).toBeNull();
  expect(mailAttention([{ id: "b", state: "draft", replies: [], updatedAt: 1 }, { id: "a", state: "draft", replies: [], updatedAt: 1 }], [])?.requestId).toBe("a");
});
test("comparison blockers outrank evidence; reviewed research is not a permanent pending task", () => {
  expect(workStatus({ ...base, blocker: "Delivery pending", pendingEvidence: 3 })).toMatchObject({ target: "comparison", attention: true });
  expect(workStatus({ ...base, pendingEvidence: 3 })).toMatchObject({ target: "evidence", attention: true });
  expect(workStatus({ ...base, failed: true })).toMatchObject({ title: "Research interrupted", attention: true });
  expect(workStatus(base).attention).toBe(false);
});

test("an omitted currency does not claim changed terms; an explicit new price does", () => {
  const baseline = JSON.stringify({ price: "25.69", currency: "usd", packageContent: "50" });
  expect(hasObservedChanges(baseline, JSON.stringify({ price: "25.69", currency: null, packageContent: "50" }))).toBe(false);
  expect(hasObservedChanges(baseline, JSON.stringify({ price: "27", currency: null, packageContent: "50" }))).toBe(true);
});

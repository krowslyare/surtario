import { expect, test } from "vitest";
import { caseProgress, type CaseProgressInput } from "./caseProgress";
const base: CaseProgressInput = {
  status: "complete",
  liveEnabled: true,
  hasComparison: false,
  hasEvidence: false,
  watches: [],
  requests: [],
  reviewedReplyIds: [],
};
test("a reply needs review until its exact message is in saved evidence", () => {
  const input = {
    ...base,
    hasComparison: true,
    requests: [{ id: "q", state: "sent", replies: [{ messageId: "m" }] }],
  };
  expect(caseProgress(input).target).toBe("mail");
  expect(
    caseProgress({ ...input, reviewedReplyIds: ["reply:q:m"] }).target,
  ).toBe("comparison");
});
test("sent mail is a durable wait, not active AI work or a send retry", () => {
  const input = {
    ...base,
    requests: [{ id: "q", state: "sent", replies: [] }],
  };
  expect(caseProgress(input).title).toBe("Waiting for the supplier");
  expect(
    caseProgress({
      ...input,
      requests: [{ id: "q", state: "uncertain", replies: [] }],
    }).title,
  ).toBe("Check the message outcome");
});
test("human review takes priority over more research and research completion is not a buying decision", () => {
  expect(
    caseProgress({ ...base, status: "running", hasEvidence: true }).target,
  ).toBe("evidence");
  expect(
    caseProgress({
      ...base,
      hasEvidence: true,
      requests: [{ id: "q", state: "draft", replies: [] }],
    }).title,
  ).toBe("Your message needs review");
  expect(caseProgress(base).title).toBe("Research finished");
});
test("failed observations preserve the decision and stopped watches do not masquerade as active checks", () => {
  const input = {
    ...base,
    hasComparison: true,
    watches: [{ status: "active", lastOutcome: "unverified" }],
  };
  expect(caseProgress(input).target).toBe("watch");
  expect(
    caseProgress({
      ...input,
      watches: [{ status: "stopped", lastOutcome: "unverified" }],
    }).target,
  ).toBe("comparison");
  expect(caseProgress({ ...base, liveEnabled: false }).action).toBeNull();
});

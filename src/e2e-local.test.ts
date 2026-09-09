// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { assertLocalWebSocketUrl } from "../tests/e2e-local";

describe("local E2E target safeguards", () => {
  beforeEach(() => {
    vi.stubEnv("CONVEX_DEPLOY_KEY", undefined);
    vi.stubEnv("CONVEX_DEPLOYMENT", "anonymous:review-tests");
    vi.stubEnv("E2E_LOCAL_DEPLOYMENT", "anonymous:review-tests");
    vi.stubEnv("E2E_LOCAL_BACKEND_URL", "http://127.0.0.1:3210");
    vi.stubEnv("E2E_LOCAL_FRONTEND_URL", "http://127.0.0.1:5173");
  });
  afterEach(() => vi.unstubAllEnvs());

  test("rejects a WebSocket on the wrong localhost port", () => {
    expect(() =>
      assertLocalWebSocketUrl("ws://127.0.0.1:3999/api/1.0/sync"),
    ).toThrow(/verified local backend host and port/);
  });

  test("allows the selected data socket and Vite HMR without allowing data on the frontend port", () => {
    expect(() =>
      assertLocalWebSocketUrl("ws://127.0.0.1:3210/api/1.0/sync"),
    ).not.toThrow();
    expect(() =>
      assertLocalWebSocketUrl("ws://127.0.0.1:5173/?token=synthetic"),
    ).not.toThrow();
    expect(() =>
      assertLocalWebSocketUrl("ws://127.0.0.1:5173/api/1.0/sync"),
    ).toThrow(/verified local backend host and port/);
  });
});

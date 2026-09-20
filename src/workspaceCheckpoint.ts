import { useEffect, useRef, type MouseEvent } from "react";

const SESSION_KEY = "surtario-workspace-history-v1";
const ENTRY_KEY = "surtario-workspace-entry-v1";
const SCROLL_KEY = "surtario-workspace-scroll-v1";

/** Tab-local recovery, separate from explicitly saving a study to Convex. */
export function readWorkspaceCheckpoint<T>(key: string): T | undefined {
  try {
    const session = sessionStorage.getItem(SESSION_KEY);
    return session && session === history.state?.workspaceSession
      ? history.state.workspaceCheckpoint?.[key] : undefined;
  } catch { return undefined; }
}

export function writeWorkspaceCheckpoint<T>(key: string, value: T) {
  try {
    const session = sessionStorage.getItem(SESSION_KEY) ?? crypto.randomUUID();
    const current = history.state?.workspaceSession === session ? history.state.workspaceCheckpoint : {};
    sessionStorage.setItem(SESSION_KEY, session);
    history.replaceState({ ...history.state, workspaceSession: session,
      workspaceCheckpoint: { ...current, [key]: value } }, "");
  } catch { /* Browsers may disable storage; explicit saving still works. */ }
}

export function markWorkspaceEntry(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  try { sessionStorage.setItem(ENTRY_KEY, "landing"); } catch { /* Optional entrance only. */ }
}

export function consumeWorkspaceEntry() {
  try {
    const requested = sessionStorage.getItem(ENTRY_KEY) === "landing";
    sessionStorage.removeItem(ENTRY_KEY);
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return requested && navigation?.type === "navigate";
  } catch { return false; }
}

/** Restore only after asynchronous content can support the previous position. */
export function useWorkspaceScrollRecovery() {
  const initial = useRef(readReloadScroll());
  useEffect(() => {
    let restoring = Boolean(initial.current && initial.current.url === location.href && initial.current.y > 0);
    const saved = initial.current;
    const previousRestoration = history.scrollRestoration;
    if (restoring) history.scrollRestoration = "manual";
    let observer: ResizeObserver | undefined;
    let timeout: number | undefined;
    function stop() {
      restoring = false;
      observer?.disconnect();
      clearTimeout(timeout);
    }
    function restore() {
      if (!restoring || !saved || saved.url !== location.href) { stop(); return; }
      if (document.documentElement.scrollHeight - innerHeight >= saved.y) {
        window.scrollTo({ top: saved.y, behavior: "instant" });
        stop();
      }
    }
    function record() {
      if (restoring) return;
      // History has already been captured by some browsers at pagehide.
      try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: location.href, y: window.scrollY })); } catch { /* Optional scroll recovery. */ }
    }
    function visibility() { if (document.visibilityState === "hidden") record(); }
    function key(event: KeyboardEvent) {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Tab"].includes(event.key)) stop();
    }
    if (restoring) {
      observer = new ResizeObserver(restore);
      observer.observe(document.body);
      timeout = window.setTimeout(stop, 5000);
      restore();
    }
    window.addEventListener("pagehide", record);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("popstate", stop);
    return () => {
      stop();
      history.scrollRestoration = previousRestoration;
      window.removeEventListener("pagehide", record);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", key);
      window.removeEventListener("popstate", stop);
    };
  }, []);
}

function readReloadScroll(): { url: string; y: number } | undefined {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== "reload") return undefined;
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "null");
    return saved && typeof saved.url === "string" && Number.isFinite(saved.y) && saved.y >= 0 ? saved : undefined;
  } catch { return undefined; }
}

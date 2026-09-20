import type { MouseEvent } from "react";

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
}

/** Move focus without letting it jump ahead of the visible scroll. */
export function scrollToContent(target: HTMLElement | null, focusTarget = target) {
  if (!target) return;
  focusTarget?.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
}

export function scrollToPageStart() {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}

/** Preserve native fragment history and modified-link behavior. */
export function scrollToAnchor(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const hash = event.currentTarget.hash;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return;
  event.preventDefault();
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  scrollToContent(target);
}

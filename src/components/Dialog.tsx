import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<number | null>(null);
  const pointerDownOutside = useRef<boolean | null>(null);
  const [closing, setClosing] = useState(false);
  const id = useId().replace(/:/g, "");
  const titleId = `dialog-title-${id}`;

  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!element) return;
    if (!element.open) element.showModal();
    const focusFrame = requestAnimationFrame(() => {
      const candidates = element.querySelectorAll<HTMLElement>(
        "[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      const target = [...candidates].find(
        (candidate) =>
          !candidate.matches(":disabled, [hidden]") &&
          !candidate.closest("[hidden]") &&
          candidate.getClientRects().length > 0,
      );
      (target ?? element).focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      if (element.open) element.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(
      () => {
        closeTimer.current = null;
        onClose();
      },
      reducedMotion ? 0 : 200,
    );
  }

  return (
    <dialog
      ref={dialog}
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        // Radix Select may prevent this native cancel event after consuming Escape.
        if (event.defaultPrevented) return;
        event.preventDefault();
        requestClose();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerDownOutside.current =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
      }}
      onPointerCancel={() => {
        pointerDownOutside.current = null;
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const endedOutside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        const startedOutside = pointerDownOutside.current === true;
        pointerDownOutside.current = null;
        if (
          event.target === event.currentTarget &&
          startedOutside &&
          endedOutside
        )
          requestClose();
      }}
      className={wide ? "dialog wide" : "dialog"}
      aria-labelledby={titleId}
    >
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Cerrar"
          onClick={requestClose}
          disabled={closing}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

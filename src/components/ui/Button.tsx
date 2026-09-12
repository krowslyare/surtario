import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text";
  busy?: boolean;
  busyLabel?: string;
};

/** Native button semantics, with one shared visual and pending-state contract. */
export function Button({
  variant = "secondary",
  busy = false,
  busyLabel,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`button ui-button ${variant === "text" ? "text-button" : variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      <span className="button-content" aria-hidden={busy || undefined}>
        {children}
      </span>
      {busy && (
        <span className="button-progress">
          <LoaderCircle size={16} aria-hidden="true" />
          {busyLabel ?? "Procesando…"}
        </span>
      )}
    </button>
  );
}

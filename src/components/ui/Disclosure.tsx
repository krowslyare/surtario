import { useId, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

type DisclosureProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** A compact, state-preserving disclosure for secondary workspace details. */
export function Disclosure({
  title,
  description,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
  ...props
}: DisclosureProps) {
  const generatedId = useId().replace(/:/g, "");
  const triggerId = `disclosure-trigger-${generatedId}`;
  const panelId = `disclosure-panel-${generatedId}`;
  const titleId = `disclosure-title-${generatedId}`;
  const descriptionId = `disclosure-description-${generatedId}`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const shouldReduceMotion = useReducedMotion();

  function toggle() {
    const nextOpen = !isOpen;
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  return (
    <div
      {...props}
      className={className ? `disclosure ${className}` : "disclosure"}
      data-state={isOpen ? "open" : "closed"}
    >
      <button
        id={triggerId}
        className="disclosure-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={toggle}
      >
        <span className="disclosure-trigger-copy">
          <span id={titleId}>{title}</span>
          {description ? (
            <span id={descriptionId} className="disclosure-trigger-description">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown aria-hidden="true" size={18} />
      </button>
      <motion.div
        id={panelId}
        className="disclosure-panel"
        role="region"
        aria-labelledby={triggerId}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.2,
          ease: [0.2, 0.7, 0.2, 1],
        }}
      >
        <div className="disclosure-panel-inner">{children}</div>
      </motion.div>
    </div>
  );
}

export default Disclosure;

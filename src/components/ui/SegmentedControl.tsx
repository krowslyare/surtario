import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

type Choice<T extends string> = { value: T; label: string };

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string;
  options: readonly Choice<T>[];
  value: T;
  onValueChange: (value: T) => void;
}) {
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onValueChange(option.value)}
        >
          {value === option.value && (
            <motion.span
              className="segment-indicator"
              aria-hidden="true"
              layoutId={reduced ? undefined : `segment-${id}`}
              transition={{
                duration: reduced ? 0 : 0.18,
                ease: [0.2, 0.7, 0.2, 1],
              }}
            />
          )}
          <span className="segment-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

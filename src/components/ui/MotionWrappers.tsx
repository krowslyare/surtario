import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function FadeIn({
  children,
  className = "",
  delay = 0,
  duration = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration,
        delay,
        ease: [0.2, 0.7, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export function CardMotion({
  children,
  className = "",
  onClick,
  role,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  ariaLabel?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className} onClick={onClick} role={role} aria-label={ariaLabel}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

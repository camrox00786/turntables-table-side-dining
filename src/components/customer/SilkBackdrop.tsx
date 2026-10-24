import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

/**
 * A restrained, CSS-based silk backdrop inspired by 21st.dev's black/red/white
 * shader reference. It intentionally avoids WebGL so unsupported devices get
 * the same readable static gradient without extra dependencies.
 */
export function SilkBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();
  const animate = isInView && !prefersReducedMotion;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="customer-silk-backdrop pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.span
        className="customer-silk-backdrop__ribbon customer-silk-backdrop__ribbon--silver"
        animate={
          animate
            ? { x: ["-8%", "12%", "-8%"], y: ["4%", "-5%", "4%"], rotate: [-8, 2, -8] }
            : undefined
        }
        transition={
          animate ? { duration: 20, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }
        }
      />
      <motion.span
        className="customer-silk-backdrop__ribbon customer-silk-backdrop__ribbon--red"
        animate={
          animate
            ? { x: ["10%", "-10%", "10%"], y: ["-8%", "8%", "-8%"], rotate: [10, -4, 10] }
            : undefined
        }
        transition={
          animate ? { duration: 24, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }
        }
      />
      <span className="customer-silk-backdrop__highlight" />
    </div>
  );
}

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type CSSProperties, type ReactNode } from "react";

interface ScrollExpansionHeroProps {
  children: ReactNode;
  image: string;
  imageAlt: string;
}

/**
 * A landing-page-only scroll expansion effect.
 * The document remains the scroll container; this component only maps the
 * section's scroll progress to the media panel's size and position.
 */
export function ScrollExpansionHero({ children, image, imageAlt }: ScrollExpansionHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const mediaWidth = useTransform(scrollYProgress, [0, 0.65], ["52%", "100%"]);
  const mediaRadius = useTransform(scrollYProgress, [0, 0.65], ["1.5rem", "0rem"]);
  const mediaScale = useTransform(scrollYProgress, [0, 0.65], [1, 1.04]);

  return (
    <section
      ref={sectionRef}
      aria-label="Turntables introduction"
      className="landing-scroll-hero relative min-h-[118svh] overflow-hidden px-5 md:min-h-[138svh]"
    >
      <div className="sticky top-0 mx-auto flex min-h-svh max-w-6xl items-center py-10 md:py-20">
        <motion.div
          className="landing-scroll-hero__media absolute inset-y-0 right-0 overflow-hidden md:inset-y-10"
          style={
            {
              "--landing-hero-width": prefersReducedMotion ? "100%" : mediaWidth,
              "--landing-hero-radius": prefersReducedMotion ? "1.5rem" : mediaRadius,
            } as CSSProperties
          }
        >
          <motion.img
            src={image}
            alt={imageAlt}
            width={1280}
            height={832}
            className="h-full w-full object-cover"
            style={prefersReducedMotion ? undefined : { scale: mediaScale }}
            fetchPriority="high"
          />
          <div className="landing-scroll-hero__scrim absolute inset-0" />
        </motion.div>

        <div className="relative z-10 w-full">{children}</div>
      </div>
    </section>
  );
}

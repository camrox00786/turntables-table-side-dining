import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function LiquidMetalButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "liquid-metal-button group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-white/30 bg-zinc-800 p-4 text-left text-white shadow-[0_12px_35px_-18px_rgba(255,255,255,0.8)] outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden="true"
        className="liquid-metal-button__shine absolute inset-0 opacity-70 transition-opacity group-hover:opacity-100"
      />
    </button>
  );
}

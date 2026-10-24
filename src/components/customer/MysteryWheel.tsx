import { useState } from "react";
import { motion } from "framer-motion";
import { Dices, Gift } from "lucide-react";
import { Btn, Sheet } from "@/components/kit";
import { IMAGES } from "@/lib/images";
import { formatINR, mysteryPool } from "@/lib/pricing";
import type { MenuItem } from "@/lib/types";
import type { TableCtx } from "./useTable";

const COLORS = ["var(--primary)", "var(--accent)", "var(--secondary)", "var(--chart-3)"];

export function MysteryWheel({ ctx, open, onClose }: { ctx: TableCtx; open: boolean; onClose: () => void }) {
  const pool = mysteryPool(ctx.menu);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pick, setPick] = useState<MenuItem | undefined>();
  const reward = ctx.menu.find((m) => m.id === ctx.config?.mystery.rewardItemId);
  const rewardOn = ctx.config?.mystery.enabled && ctx.config.mystery.redeemed < ctx.config.mystery.maxRedemptions;
  const seg = 360 / Math.max(pool.length, 1);

  function spin() {
    const p = ctx.actions.spin();
    if (!p) return;
    const idx = pool.findIndex((x) => x.id === p.id);
    // Land the chosen segment under the top pointer.
    const target = 360 * 5 + (360 - (idx * seg + seg / 2));
    setPick(undefined);
    setSpinning(true);
    setRotation((r) => r - (r % 360) + target);
    setTimeout(() => {
      setSpinning(false);
      setPick(p);
    }, 2600);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Mystery Tap">
      {pool.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No mystery items are available right now. Check back soon!</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Can't decide? Spin the wheel of {pool.length} picks chosen by the venue.
            {rewardOn && reward && <> Order your mystery pick and get a <b className="text-primary">free {reward.name}</b>.</>}
          </p>
          <div className="relative mx-auto aspect-square w-64">
            <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[18px] border-x-transparent border-t-foreground" />
            <motion.svg
              viewBox="-100 -100 200 200"
              className="h-full w-full drop-shadow-[0_0_30px_var(--ring)]"
              animate={{ rotate: rotation }}
              transition={{ duration: 2.5, ease: [0.15, 0.85, 0.25, 1] }}
            >
              {pool.map((m, i) => {
                const a0 = ((i * seg - 90) * Math.PI) / 180;
                const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
                const mid = (((i + 0.5) * seg - 90) * Math.PI) / 180;
                const large = seg > 180 ? 1 : 0;
                return (
                  <g key={m.id}>
                    <path
                      d={`M0 0 L${95 * Math.cos(a0)} ${95 * Math.sin(a0)} A95 95 0 ${large} 1 ${95 * Math.cos(a1)} ${95 * Math.sin(a1)} Z`}
                      fill={COLORS[i % COLORS.length]}
                      stroke="var(--background)"
                      strokeWidth="2"
                    />
                    <text
                      x={58 * Math.cos(mid)}
                      y={58 * Math.sin(mid)}
                      fontSize="8"
                      fontWeight="700"
                      textAnchor="middle"
                      fill={i % COLORS.length === 2 ? "var(--foreground)" : "var(--background)"}
                      transform={`rotate(${(i + 0.5) * seg} ${58 * Math.cos(mid)} ${58 * Math.sin(mid)})`}
                    >
                      {m.name.split(" ").slice(0, 2).join(" ")}
                    </text>
                  </g>
                );
              })}
              <circle r="14" fill="var(--background)" />
            </motion.svg>
          </div>
          {!pick && (
            <Btn size="lg" className="mt-6 w-full" onClick={spin} disabled={spinning}>
              <Dices className="h-5 w-5" /> {spinning ? "Spinning…" : "Spin the wheel"}
            </Btn>
          )}
          {pick && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-primary/40 bg-card p-4" data-testid="mystery-result">
              <div className="flex gap-3">
                <img src={IMAGES[pick.image]} alt={pick.name} className="h-20 w-20 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{pick.name}</p>
                  <p className="text-sm text-muted-foreground">{pick.description}</p>
                  <p className="mt-1 font-semibold">{formatINR(pick.price * 100)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm"><span className="text-primary">Why this?</span> {pick.mysteryReason || "Picked by the venue for the wheel."}</p>
              {rewardOn && reward && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-accent"><Gift className="h-4 w-4" /> Free {reward.name} with this order (one per order)</p>
              )}
              <div className="mt-4 flex gap-2">
                <Btn className="flex-1" onClick={() => { ctx.actions.addItem(pick.id, [], 1, "mystery"); onClose(); setPick(undefined); }}>Add to cart</Btn>
                <Btn variant="ghost" onClick={spin}>Try again</Btn>
              </div>
            </motion.div>
          )}
          <p className="mt-3 text-center text-[11px] text-muted-foreground">Picks come from the venue's selected list — not AI or sales data.</p>
        </>
      )}
    </Sheet>
  );
}

import { useState } from "react";
import { Coffee, Stamp } from "lucide-react";
import { toast } from "sonner";
import { Btn, Sheet, SimBadge, Switch } from "@/components/kit";
import { DEMO_OTP, DEMO_PHONE } from "@/lib/demo-data";
import type { TableCtx } from "./useTable";
import { cn } from "@/lib/utils";

export function LoyaltySheet({ ctx, open, onClose }: { ctx: TableCtx; open: boolean; onClose: () => void }) {
  const { venue, config, account, reward, set, menu, state, now } = ctx;
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  if (!venue || !config) return null;
  const L = config.loyalty;
  const rewardItem = menu.find((m) => m.id === L.rewardItemId);

  function signIn(p: string, name: string) {
    set((d) => {
      const k = `${venue!.id}:${p}`;
      d.loyalty[k] ??= { venueId: venue!.id, phone: p, name, stamps: 0, stampedOrderIds: [], rewards: [] };
      d.customer.phone = p;
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Frequent Sipper">
      {!L.enabled ? (
        <p className="py-8 text-center text-muted-foreground">{venue.name} isn't running a loyalty card right now.</p>
      ) : !account ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Collect {L.stampsNeeded} stamps (orders over ₹{L.minSpend}) and get a free {rewardItem?.name}. No app needed.
          </p>
          <input aria-label="Phone number" inputMode="tel" className="h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="+91 98xxx xxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {!otpSent ? (
            <Btn className="w-full" disabled={phone.replace(/\D/g, "").length < 10} onClick={() => setOtpSent(true)}>Send code</Btn>
          ) : (
            <>
              <SimBadge>Demo: no SMS sent · use code {DEMO_OTP}</SimBadge>
              <input aria-label="Verification code" inputMode="numeric" className="h-11 w-full rounded-xl border border-input bg-background px-3" placeholder="4-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} />
              <Btn className="w-full" onClick={() => (otp === DEMO_OTP ? signIn(phone.trim(), "Guest") : toast.error("That code doesn't match"))}>Verify & join</Btn>
            </>
          )}
          <div className="border-t border-border pt-3">
            <Btn variant="outline" className="w-full" onClick={() => signIn(DEMO_PHONE, "Demo Customer")}>Use demo customer ({DEMO_PHONE})</Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{account.phone}{account.demo && <SimBadge className="ml-2">Demo customer</SimBadge>}</p>
              <Stamp className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 font-display text-2xl font-black" data-testid="stamp-count">{account.stamps} of {L.stampsNeeded} stamps collected</p>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: L.stampsNeeded }, (_, i) => (
                <div key={i} className={cn("grid h-10 flex-1 place-items-center rounded-full border-2", i < account.stamps ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-input")}>
                  <Coffee className="h-4 w-4" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Stamps are added when staff mark a qualifying order (₹{L.minSpend}+) as served. One stamp per order.</p>
          </div>
          <div>
            <p className="mb-2 font-semibold">Rewards</p>
            {account.rewards.length === 0 && <p className="text-sm text-muted-foreground">No rewards yet — keep sipping.</p>}
            <ul className="space-y-2">
              {account.rewards.map((r) => {
                const it = menu.find((m) => m.id === r.itemId);
                const status = r.redeemedAt ? "Redeemed" : r.expiresAt <= now ? "Expired" : `Valid until ${new Date(r.expiresAt).toLocaleDateString("en-IN")}`;
                return (
                  <li key={r.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <span>Free {it?.name}</span>
                    <span className={r.redeemedAt || r.expiresAt <= now ? "text-muted-foreground" : "text-primary"}>{status}</span>
                  </li>
                );
              })}
            </ul>
            {reward && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary p-3">
                <span className="text-sm">Apply free {rewardItem?.name} to my next order<br /><span className="text-xs text-muted-foreground">Needs one {rewardItem?.name} in your cart</span></span>
                <Switch label="Apply loyalty reward" checked={state.customer.useLoyaltyReward} onChange={ctx.actions.setLoyaltyUse} />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-dashed border-accent/40 p-3">
            <SimBadge />
            <p className="mt-2 text-sm text-muted-foreground">Fast-forward the demo with a simulated qualifying purchase (₹{Math.max(L.minSpend, 250)}, already served).</p>
            <Btn variant="accent" size="sm" className="mt-2" onClick={ctx.actions.simulatePurchase}>Simulate qualifying purchase</Btn>
          </div>
          <Btn variant="ghost" className="w-full" onClick={() => set((d) => { d.customer.phone = undefined; d.customer.useLoyaltyReward = false; })}>Sign out of loyalty</Btn>
        </div>
      )}
    </Sheet>
  );
}

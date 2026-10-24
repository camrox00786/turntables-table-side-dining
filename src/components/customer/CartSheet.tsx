import { Gift, Minus, Plus, AlertTriangle } from "lucide-react";
import { Btn, Sheet, SimBadge } from "@/components/kit";
import { formatINR, unitPrice } from "@/lib/pricing";
import type { TableCtx } from "./useTable";
import { SplitPanel } from "./SplitPanel";

export function CartSheet({ ctx, open, onClose, onPlaced }: { ctx: TableCtx; open: boolean; onClose: () => void; onPlaced: (id: string) => void }) {
  const { lines, menu, totals, squad, venue, reward, state } = ctx;
  return (
    <Sheet open={open} onClose={onClose} title={squad ? `Squad cart · ${squad.code}` : "Your order"}>
      {lines.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Your cart is empty. Add something tasty!</p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {lines.map((l) => {
              const it = menu.find((m) => m.id === l.itemId);
              if (!it) return null;
              const mods = it.modifiers.filter((m) => l.modifierIds.includes(m.id)).map((m) => m.name);
              return (
                <li key={l.lineId} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {it.name}
                      {l.source === "mystery" && <span className="ml-2 text-xs text-primary">Mystery pick</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[l.owner && `for ${l.owner}`, ...mods].filter(Boolean).join(" · ")}
                    </p>
                    {!it.available && <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Sold out — remove to order</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button aria-label={`Decrease ${it.name}`} className="rounded-full bg-secondary p-1.5" onClick={() => ctx.actions.changeQty(l.lineId, -1)}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-4 text-center text-sm">{l.qty}</span>
                    <button aria-label={`Increase ${it.name}`} className="rounded-full bg-secondary p-1.5" onClick={() => ctx.actions.changeQty(l.lineId, 1)}><Plus className="h-3.5 w-3.5" /></button>
                    <span className="w-16 text-right text-sm tabular-nums">{formatINR(unitPrice(it, l.modifierIds) * l.qty)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {totals.freebies.map((f) => (
            <p key={f} className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary"><Gift className="h-4 w-4" /> Mystery reward: free {f} (₹0)</p>
          ))}
          {reward && !totals.loyaltyApplied && state.customer.useLoyaltyReward && (
            <p className="text-xs text-accent">Add a {menu.find((m) => m.id === reward.itemId)?.name} to use your loyalty reward.</p>
          )}
          <dl className="space-y-1.5 border-t border-border pt-3 text-sm">
            <Row k="Item total" v={formatINR(totals.subtotal)} />
            {totals.discounts.map((d) => <Row key={d.label} k={d.label} v={`−${formatINR(d.amount)}`} accent />)}
            <Row k="GST (5%)" v={formatINR(totals.tax)} />
            <Row k="Total" v={formatINR(totals.total)} bold />
          </dl>
          {squad && venue && (
            <SplitPanel lines={lines} menu={menu} participants={squad.participants} total={totals.total} venueName={venue.name} table={ctx.table?.number ?? 0} />
          )}
          <Btn
            size="lg"
            className="w-full"
            disabled={totals.unavailable.length > 0}
            onClick={() => {
              const o = ctx.actions.placeOrder();
              if (o) onPlaced(o.id);
            }}
          >
            Place order · {formatINR(totals.total)}
          </Btn>
          <p className="text-center text-[11px] text-muted-foreground">
            <SimBadge className="mr-1">Demo</SimBadge> Pay at the counter. Kitchen notification is simulated; no online payment is taken.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function Row({ k, v, bold, accent }: { k: string; v: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "pt-1 text-base font-bold" : ""} ${accent ? "text-accent" : ""}`}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

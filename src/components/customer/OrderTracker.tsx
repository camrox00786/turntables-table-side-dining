import { Check, Gift } from "lucide-react";
import { Sheet, SimBadge } from "@/components/kit";
import { formatINR } from "@/lib/pricing";
import type { TableCtx } from "./useTable";
import { SplitPanel } from "./SplitPanel";
import { cn } from "@/lib/utils";

const STEPS = ["placed", "preparing", "ready", "served"] as const;
const PAY: Record<string, string> = {
  unpaid: "Unpaid — pay at the counter",
  requested: "Payment requested — not yet confirmed",
  paid_at_counter: "Paid (confirmed by staff)",
};

export function OrderTracker({ ctx, orderId, onClose }: { ctx: TableCtx; orderId: string | null; onClose: () => void }) {
  const order = ctx.state.orders.find((o) => o.id === orderId);
  const idx = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;
  return (
    <Sheet open={!!order} onClose={onClose} title={order ? `Order #${order.id.slice(-5)}` : ""}>
      {order && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-primary/10 p-4 text-center">
            <p className="font-display text-2xl font-black text-primary">{order.status === "cancelled" ? "Order cancelled" : order.status === "placed" ? "Order sent!" : `Order ${order.status}`}</p>
            <p className="text-sm text-muted-foreground">Table {order.table} · {formatINR(order.total)}</p>
            <SimBadge className="mt-2">Kitchen notification simulated</SimBadge>
          </div>
          <ol className="flex justify-between">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 flex-col items-center gap-1 text-xs capitalize">
                <span className={cn("grid h-8 w-8 place-items-center rounded-full border-2", i <= idx ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground")}>
                  {i <= idx ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <p className="text-center text-xs text-muted-foreground">Status updates when staff change it in the owner dashboard (try it in another tab).</p>
          <dl className="space-y-1 text-sm">
            {order.discounts.map((d) => (
              <div key={d.label} className="flex justify-between text-accent"><dt>{d.label}</dt><dd>−{formatINR(d.amount)}</dd></div>
            ))}
            {order.freebies.map((f) => <p key={f} className="flex items-center gap-1 text-primary"><Gift className="h-4 w-4" /> Free {f}</p>)}
            <div className="flex justify-between"><dt>GST</dt><dd>{formatINR(order.tax)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
          </dl>
          <p className="rounded-xl bg-secondary p-3 text-sm" data-testid="payment-status">Payment: <b>{PAY[order.payment]}</b></p>
          {order.participants && order.participants.length > 1 && ctx.venue && (
            <SplitPanel
              lines={order.lines}
              menu={ctx.menu}
              participants={order.participants}
              total={order.total}
              venueName={ctx.venue.name}
              table={order.table}
              onRequest={() => ctx.set((d) => { const o = d.orders.find((x) => x.id === order.id)!; if (o.payment === "unpaid") o.payment = "requested"; })}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}

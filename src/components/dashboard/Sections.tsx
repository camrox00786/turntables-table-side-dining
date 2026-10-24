import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Btn, Card, SimBadge, Switch } from "@/components/kit";
import { useStore, uid } from "@/lib/store";
import { applyStamp, formatINR, unitPrice } from "@/lib/pricing";
import { CATEGORY_LABEL } from "@/lib/images";
import type { Category, OrderStatus, Weather } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputCls = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

/* ---------------- Analytics ---------------- */
export function Analytics({ venueId }: { venueId: string }) {
  const { state } = useStore();
  const orders = state.orders.filter((o) => o.venueId === venueId && o.status !== "cancelled" && o.lines.length > 0);
  const menu = state.menu.filter((m) => m.venueId === venueId);
  const sales = orders.reduce((a, o) => a + o.total, 0);
  const aov = orders.length ? Math.round(sales / orders.length) : 0;
  const phones = orders.filter((o) => o.phone).map((o) => o.phone!);
  const counts = phones.reduce<Record<string, number>>((a, p) => ((a[p] = (a[p] ?? 0) + 1), a), {});
  const repeat = Object.values(counts).filter((c) => c > 1).length;
  const known = Object.keys(counts).length;
  const accounts = Object.values(state.loyalty).filter((a) => a.venueId === venueId);
  const stamps = accounts.reduce((a, x) => a + x.stampedOrderIds.length, 0);
  const redeemed = accounts.reduce((a, x) => a + x.rewards.filter((r) => r.redeemedAt).length, 0);
  const cfg = state.configs[venueId];

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    [...orders].sort((a, b) => a.createdAt - b.createdAt).forEach((o) => {
      const k = new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      m.set(k, (m.get(k) ?? 0) + o.total / 100);
    });
    return [...m].map(([day, total]) => ({ day, total: Math.round(total) }));
  }, [orders]);
  const popular = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) => o.lines.forEach((l) => m.set(l.itemId, (m.get(l.itemId) ?? 0) + l.qty)));
    return [...m].map(([id, qty]) => ({ name: menu.find((x) => x.id === id)?.name.split(" ").slice(0, 2).join(" ") ?? id, qty })).sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [orders, menu]);

  if (orders.length === 0) return <Card><p className="py-10 text-center text-muted-foreground">No orders yet. Share a table QR to get started.</p></Card>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sales" value={formatINR(sales)} />
        <Kpi label="Orders" value={String(orders.length)} />
        <Kpi label="Avg order value" value={formatINR(aov)} />
        <Kpi label="Repeat customers" value={`${repeat} of ${known}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 font-bold">Sales by day (₹)</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line dataKey="total" stroke="var(--chart-1)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="mb-3 font-bold">Popular items</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={popular} layout="vertical">
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" width={100} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} cursor={{ fill: "var(--secondary)" }} />
                <Bar dataKey="qty" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Loyalty stamps issued" value={String(stamps)} />
        <Kpi label="Loyalty rewards redeemed" value={String(redeemed)} />
        <Kpi label="Mystery rewards given" value={`${cfg.mystery.redeemed}/${cfg.mystery.maxRedemptions}`} />
        <Kpi label="Weather offer redemptions" value={String(cfg.campaigns.reduce((a, c) => a + c.redeemed, 0))} />
      </div>
      <p className="text-xs text-muted-foreground">Includes sample history for the demo.</p>
    </div>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-black">{value}</p>
    </Card>
  );
}

/* ---------------- Orders ---------------- */
const NEXT: Record<string, OrderStatus | undefined> = { placed: "preparing", preparing: "ready", ready: "served" };
export function OrdersBoard({ venueId }: { venueId: string }) {
  const { state, set } = useStore();
  const [showDone, setShowDone] = useState(false);
  const menu = state.menu.filter((m) => m.venueId === venueId);
  const orders = state.orders
    .filter((o) => o.venueId === venueId && o.lines.length > 0 && (showDone ? true : !["served", "cancelled"].includes(o.status)))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 40);
  const byTable = orders.reduce<Record<number, typeof orders>>((a, o) => ((a[o.table] ??= []).push(o), a), {});

  function advance(id: string, status: OrderStatus) {
    let msg = `Order marked ${status}`;
    set((d) => {
      const o = d.orders.find((x) => x.id === id)!;
      o.status = status;
      if (status === "served" && o.phone) {
        const k = `${venueId}:${o.phone}`;
        const acc = d.loyalty[k];
        if (acc) {
          const res = applyStamp(acc, o, d.configs[venueId].loyalty, Date.now());
          d.loyalty[k] = res.account;
          if (res.stamped) msg += " · loyalty stamp issued";
          if (res.unlocked) msg += " · reward unlocked";
        }
      }
    });
    toast.success(msg);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show served & cancelled
      </label>
      {orders.length === 0 && <Card><p className="py-8 text-center text-muted-foreground">No open orders. New table orders appear here instantly.</p></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(byTable).map(([table, list]) => (
          <Card key={table}>
            <p className="mb-3 font-display text-xl font-black">Table {table}</p>
            <div className="space-y-3">
              {list.map((o) => {
                const owners = o.participants ?? [];
                return (
                  <div key={o.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">#{o.id.slice(-5)} · {new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold capitalize", o.status === "served" ? "bg-success/20 text-success" : o.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-accent/20 text-accent")}>{o.status}</span>
                    </div>
                    {o.squadCode && <p className="mt-1 text-xs text-primary">SquadTab {o.squadCode}</p>}
                    {owners.length > 0 ? (
                      owners.map((p) => {
                        const mine = o.lines.filter((l) => l.owner === p);
                        const sub = mine.reduce((a, l) => { const it = menu.find((m) => m.id === l.itemId); return it ? a + unitPrice(it, l.modifierIds) * l.qty : a; }, 0);
                        return (
                          <div key={p} className="mt-2 text-sm">
                            <div className="flex justify-between font-medium"><span>{p}</span><span>{formatINR(sub)}</span></div>
                            <p className="text-xs text-muted-foreground">{mine.map((l) => `${l.qty}× ${menu.find((m) => m.id === l.itemId)?.name}`).join(", ") || "—"}</p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{o.lines.map((l) => `${l.qty}× ${menu.find((m) => m.id === l.itemId)?.name}`).join(", ")}</p>
                    )}
                    {o.freebies.length > 0 && <p className="mt-1 text-xs text-primary">+ Free {o.freebies.join(", ")}</p>}
                    {o.discounts.map((d) => <p key={d.label} className="text-xs text-accent">{d.label}: −{formatINR(d.amount)}</p>)}
                    <div className="mt-2 flex justify-between text-sm font-bold"><span>Total incl. GST</span><span>{formatINR(o.total)}</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment: {o.payment === "paid_at_counter" ? "Paid (staff confirmed)" : o.payment === "requested" ? "Requested by guests — not confirmed" : "Unpaid"}
                      {o.phone && ` · Loyalty ${o.phone}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {NEXT[o.status] && <Btn size="sm" onClick={() => advance(o.id, NEXT[o.status]!)}>Mark {NEXT[o.status]}</Btn>}
                      {o.payment !== "paid_at_counter" && o.status !== "cancelled" && (
                        <Btn size="sm" variant="ghost" onClick={() => set((d) => { d.orders.find((x) => x.id === o.id)!.payment = "paid_at_counter"; })}>Mark paid at counter</Btn>
                      )}
                      {["placed", "preparing"].includes(o.status) && <Btn size="sm" variant="outline" onClick={() => advance(o.id, "cancelled")}>Cancel</Btn>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Menu ---------------- */
export function MenuEditor({ venueId }: { venueId: string }) {
  const { state, set } = useStore();
  const items = state.menu.filter((m) => m.venueId === venueId);
  const upd = (id: string, fn: (m: (typeof items)[number]) => void) => set((d) => fn(d.menu.find((m) => m.id === id)!));
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <Card key={m.id} className={cn(!m.available && "opacity-70")}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-40 flex-1">
              <p className="font-bold">{m.name}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[m.category]}</p>
            </div>
            <label className="text-xs text-muted-foreground">Price ₹
              <input aria-label={`Price of ${m.name}`} type="number" min={0} className={cn(inputCls, "ml-1 w-20")} value={m.price} onChange={(e) => upd(m.id, (x) => (x.price = Math.max(0, Number(e.target.value) || 0)))} />
            </label>
            <label className="text-xs text-muted-foreground">Prep min
              <input aria-label={`Prep time of ${m.name}`} type="number" min={1} className={cn(inputCls, "ml-1 w-16")} value={m.prepMins} onChange={(e) => upd(m.id, (x) => (x.prepMins = Math.max(1, Number(e.target.value) || 1)))} />
            </label>
            <Toggle label="Available" checked={m.available} onChange={(v) => upd(m.id, (x) => (x.available = v))} name={m.name} />
            <Toggle label="Quick" checked={m.quick} onChange={(v) => upd(m.id, (x) => (x.quick = v))} name={m.name} />
            <Toggle label="Mystery" checked={m.mysteryEligible} onChange={(v) => upd(m.id, (x) => (x.mysteryEligible = v))} name={m.name} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Modifiers:</span>
            {m.modifiers.map((mod) => (
              <span key={mod.id} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
                {mod.name} +₹
                <input aria-label={`${mod.name} price`} type="number" min={0} className="w-12 bg-transparent" value={mod.price} onChange={(e) => upd(m.id, (x) => (x.modifiers.find((y) => y.id === mod.id)!.price = Math.max(0, Number(e.target.value) || 0)))} />
                <button aria-label={`Remove ${mod.name}`} onClick={() => upd(m.id, (x) => (x.modifiers = x.modifiers.filter((y) => y.id !== mod.id)))}><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
            <button className="flex items-center gap-1 text-primary" onClick={() => { const n = prompt("Modifier name"); if (n) upd(m.id, (x) => x.modifiers.push({ id: uid("mod"), name: n, price: 0 })); }}><Plus className="h-3 w-3" /> Add</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
function Toggle({ label, checked, onChange, name }: { label: string; checked: boolean; onChange: (v: boolean) => void; name: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">{label}<Switch label={`${label}: ${name}`} checked={checked} onChange={onChange} /></span>
  );
}

/* ---------------- Tables & QR ---------------- */
export function TablesQR({ venueId, onVenueCreated }: { venueId: string; onVenueCreated: (id: string) => void }) {
  const { state, set } = useStore();
  const venue = state.venues.find((v) => v.id === venueId)!;
  const tables = state.tables.filter((t) => t.venueId === venueId).sort((a, b) => a.number - b.number);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [name, setName] = useState("");

  function addVenue() {
    const n = name.trim();
    if (!n) return;
    const slug = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (state.venues.some((v) => v.slug === slug)) return toast.error("A venue with that name already exists");
    const id = uid("v");
    set((d) => {
      d.venues.push({ id, slug, name: n, kind: "Restaurant", area: "Bengaluru", tagline: "" });
      d.menu.push(...d.menu.filter((m) => m.venueId === "v1").map((m) => ({ ...m, id: m.id.replace("v1-", `${id}-`), venueId: id })));
      for (let i = 1; i <= 4; i++) d.tables.push({ id: `${id}-t${i}`, venueId: id, number: i, seats: 4 });
      const c = structuredClone(d.configs.v1);
      c.campaigns.forEach((x) => { x.id = x.id.replace("v1-", `${id}-`); x.itemIds = x.itemIds.map((y) => y.replace("v1-", `${id}-`)); x.redeemed = 0; });
      c.mystery.rewardItemId = c.mystery.rewardItemId.replace("v1-", `${id}-`);
      c.mystery.redeemed = 0;
      c.loyalty.rewardItemId = c.loyalty.rewardItemId.replace("v1-", `${id}-`);
      d.configs[id] = c;
    });
    setName("");
    onVenueCreated(id);
    toast.success(`${n} created with a starter menu and 4 tables`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => set((d) => { const max = Math.max(0, ...d.tables.filter((t) => t.venueId === venueId).map((t) => t.number)); d.tables.push({ id: uid("t"), venueId, number: max + 1, seats: 4 }); })}>
          <Plus className="h-4 w-4" /> Add table
        </Btn>
        <input aria-label="New venue name" className={cn(inputCls, "h-10")} placeholder="New venue name" value={name} onChange={(e) => setName(e.target.value)} />
        <Btn variant="ghost" onClick={addVenue}>Create venue</Btn>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => {
          const url = `${origin}/v/${venue.slug}/t/${t.number}`;
          return (
            <Card key={t.id} className="text-center">
              <p className="font-display text-lg font-black">Table {t.number}</p>
              <div className="mx-auto my-3 w-fit rounded-xl bg-foreground p-2">
                <QRCodeSVG value={url} size={110} bgColor="transparent" fgColor="var(--background)" />
              </div>
              <a href={`/v/${venue.slug}/t/${t.number}`} target="_blank" rel="noreferrer" className="break-all text-[11px] text-primary underline">/v/{venue.slug}/t/{t.number}</a>
              <div className="mt-2 flex justify-center gap-2">
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => window.print()}>Print</button>
                <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => set((d) => { d.tables = d.tables.filter((x) => x.id !== t.id); })}>Remove</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Promotions & loyalty ---------------- */
export function Promotions({ venueId }: { venueId: string }) {
  const { state, set } = useStore();
  const cfg = state.configs[venueId];
  const menu = state.menu.filter((m) => m.venueId === venueId);
  const accounts = Object.values(state.loyalty).filter((a) => a.venueId === venueId);
  const cats = Array.from(new Set(menu.map((m) => m.category)));
  const upd = (fn: (c: typeof cfg) => void) => set((d) => fn(d.configs[venueId]));
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <p className="font-display text-xl font-bold">WFH / Client Call Mode</p>
        <p className="mb-3 text-xs text-muted-foreground">Items marked "Quick" in the menu tab appear when their category is enabled and prep time fits.</p>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <label key={c} className="flex items-center gap-1.5 rounded-full border border-input px-3 py-1 text-sm">
              <input type="checkbox" checked={cfg.quick.categories.includes(c)} onChange={(e) => upd((x) => { x.quick.categories = e.target.checked ? [...x.quick.categories, c] : x.quick.categories.filter((y) => y !== c) as Category[]; })} />
              {CATEGORY_LABEL[c]}
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm">Max prep time (min) <input aria-label="Max quick prep minutes" type="number" className={cn(inputCls, "ml-2 w-20")} value={cfg.quick.maxPrepMins} onChange={(e) => upd((x) => (x.quick.maxPrepMins = num(e.target.value, 1)))} /></label>
      </Card>

      <Card>
        <div className="flex items-center justify-between"><p className="font-display text-xl font-bold">Mystery Tap</p><Switch label="Mystery Tap enabled" checked={cfg.mystery.enabled} onChange={(v) => upd((x) => (x.mystery.enabled = v))} /></div>
        <p className="mb-3 text-xs text-muted-foreground">Wheel items (sold-out items are excluded automatically):</p>
        <div className="flex flex-wrap gap-2">
          {menu.map((m) => (
            <label key={m.id} className={cn("flex items-center gap-1.5 rounded-full border border-input px-3 py-1 text-xs", !m.available && "opacity-50")}>
              <input type="checkbox" checked={m.mysteryEligible} onChange={(e) => set((d) => { d.menu.find((y) => y.id === m.id)!.mysteryEligible = e.target.checked; })} />
              {m.name}{m.isNew && " ★"}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <label>Reward <select aria-label="Mystery reward item" className={inputCls} value={cfg.mystery.rewardItemId} onChange={(e) => upd((x) => (x.mystery.rewardItemId = e.target.value))}>{menu.map((m) => <option key={m.id} value={m.id}>Free {m.name}</option>)}</select></label>
          <label>Max redemptions <input aria-label="Mystery max redemptions" type="number" className={cn(inputCls, "w-20")} value={cfg.mystery.maxRedemptions} onChange={(e) => upd((x) => (x.mystery.maxRedemptions = num(e.target.value)))} /></label>
          <span className="self-center text-muted-foreground">Used {cfg.mystery.redeemed} · one reward per order</span>
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <div className="mb-3 flex items-center gap-2"><p className="font-display text-xl font-bold">Monsoon Mode campaigns</p><SimBadge>Weather is simulated until a weather API is connected</SimBadge></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {cfg.campaigns.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <input aria-label="Campaign title" className={cn(inputCls, "flex-1 font-bold")} value={c.title} onChange={(e) => upd((x) => (x.campaigns[i].title = e.target.value))} />
                <Switch label={`${c.title} enabled`} checked={c.enabled} onChange={(v) => upd((x) => (x.campaigns[i].enabled = v))} />
              </div>
              <input aria-label="Campaign message" className={cn(inputCls, "mt-2 w-full")} value={c.message} onChange={(e) => upd((x) => (x.campaigns[i].message = e.target.value))} />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <label>When <select aria-label="Weather condition" className={inputCls} value={c.condition} onChange={(e) => upd((x) => (x.campaigns[i].condition = e.target.value as Weather))}><option value="rainy">Rainy</option><option value="hot">Hot</option><option value="sunny">Sunny</option></select></label>
                <label>% off <input aria-label="Discount percent" type="number" className={cn(inputCls, "w-16")} value={c.pct} onChange={(e) => upd((x) => (x.campaigns[i].pct = Math.min(100, num(e.target.value))))} /></label>
                <label>Minutes <input aria-label="Offer duration minutes" type="number" className={cn(inputCls, "w-16")} value={c.durationMin} onChange={(e) => upd((x) => (x.campaigns[i].durationMin = num(e.target.value, 1)))} /></label>
                <label>Max uses <input aria-label="Max redemptions" type="number" className={cn(inputCls, "w-16")} value={c.maxRedemptions} onChange={(e) => upd((x) => (x.campaigns[i].maxRedemptions = num(e.target.value)))} /></label>
                <span className="self-center text-muted-foreground">Used {c.redeemed}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {menu.map((m) => (
                  <label key={m.id} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                    <input type="checkbox" checked={c.itemIds.includes(m.id)} onChange={(e) => upd((x) => { x.campaigns[i].itemIds = e.target.checked ? [...x.campaigns[i].itemIds, m.id] : x.campaigns[i].itemIds.filter((y) => y !== m.id); })} />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="xl:col-span-2">
        <div className="flex items-center justify-between"><p className="font-display text-xl font-bold">Frequent Sipper loyalty</p><Switch label="Loyalty enabled" checked={cfg.loyalty.enabled} onChange={(v) => upd((x) => (x.loyalty.enabled = v))} /></div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <label>Stamps needed <input aria-label="Stamps needed" type="number" className={cn(inputCls, "w-16")} value={cfg.loyalty.stampsNeeded} onChange={(e) => upd((x) => (x.loyalty.stampsNeeded = num(e.target.value, 1)))} /></label>
          <label>Min order ₹ <input aria-label="Minimum spend" type="number" className={cn(inputCls, "w-20")} value={cfg.loyalty.minSpend} onChange={(e) => upd((x) => (x.loyalty.minSpend = num(e.target.value)))} /></label>
          <label>Reward <select aria-label="Loyalty reward item" className={inputCls} value={cfg.loyalty.rewardItemId} onChange={(e) => upd((x) => (x.loyalty.rewardItemId = e.target.value))}>{menu.map((m) => <option key={m.id} value={m.id}>Free {m.name}</option>)}</select></label>
          <label>Expires after (days) <input aria-label="Reward expiry days" type="number" className={cn(inputCls, "w-16")} value={cfg.loyalty.rewardExpiryDays} onChange={(e) => upd((x) => (x.loyalty.rewardExpiryDays = num(e.target.value, 1)))} /></label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">A stamp is issued once per order, when staff mark a qualifying order served.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Customer</th><th>Stamps</th><th>Orders stamped</th><th>Rewards</th></tr></thead>
            <tbody>
              {accounts.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No members yet.</td></tr>}
              {accounts.map((a) => (
                <tr key={a.phone} className="border-t border-border">
                  <td className="py-2">{a.phone}{a.demo && <SimBadge className="ml-2">Demo</SimBadge>}</td>
                  <td>{a.stamps}/{cfg.loyalty.stampsNeeded}</td>
                  <td>{a.stampedOrderIds.length}</td>
                  <td>{a.rewards.map((r) => (r.redeemedAt ? "Redeemed" : r.expiresAt < Date.now() ? "Expired" : "Available")).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

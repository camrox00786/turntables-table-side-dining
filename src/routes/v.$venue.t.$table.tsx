import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, CloudRain, Coffee, Dices, Laptop, ShoppingBag, Stamp, Sun, ThermometerSun, Users, X, Zap, Plus } from "lucide-react";
import { Btn, Pill, SimBadge, Switch } from "@/components/kit";
import { useTable } from "@/components/customer/useTable";
import { ItemSheet } from "@/components/customer/ItemSheet";
import { CartSheet } from "@/components/customer/CartSheet";
import { MysteryWheel } from "@/components/customer/MysteryWheel";
import { SquadSheet } from "@/components/customer/SquadSheet";
import { LoyaltySheet } from "@/components/customer/LoyaltySheet";
import { OrderTracker } from "@/components/customer/OrderTracker";
import { CATEGORY_LABEL, IMAGES } from "@/lib/images";
import { formatINR, quickItems } from "@/lib/pricing";
import type { MenuItem, Vibe, Weather } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/v/$venue/t/$table")({
  validateSearch: (s: Record<string, unknown>) => ({ squad: typeof s.squad === "string" ? s.squad : undefined }),
  head: ({ params }) => ({
    meta: [
      { title: `Table ${params.table} menu · Turntables` },
      { name: "description", content: `Scan-to-order menu for table ${params.table}. Browse, customise and order from your phone.` },
      { property: "og:title", content: `Table ${params.table} menu · Turntables` },
      { property: "og:description", content: "Order from your table — no app download needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

const VIBES: { id: Vibe; label: string }[] = [
  { id: "focus", label: "🎧 Focus" },
  { id: "chill", label: "🌿 Chill" },
  { id: "party", label: "🎉 Party" },
  { id: "date", label: "🕯️ Date night" },
];
const WEATHER: { id: Weather; label: string; icon: typeof Sun }[] = [
  { id: "sunny", label: "Sunny", icon: Sun },
  { id: "rainy", label: "Rainy", icon: CloudRain },
  { id: "hot", label: "Hot", icon: ThermometerSun },
];

function MenuPage() {
  const { venue: slug, table } = Route.useParams();
  const search = Route.useSearch();
  const ctx = useTable(slug, Number(table));
  const { venue, menu, config, totals, lines, campaign, offer, squad, state, now } = ctx;
  const [wfh, setWfh] = useState(false);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [cat, setCat] = useState<string>("all");
  const [item, setItem] = useState<MenuItem | null>(null);
  const [sheet, setSheet] = useState<null | "cart" | "mystery" | "squad" | "loyalty">(search.squad ? "squad" : null);
  const [tracking, setTracking] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category))), [menu]);
  const quick = config ? quickItems(menu, config.quick) : [];
  const visible = (wfh ? quick : menu)
    .filter((m) => (vibe ? m.vibes.includes(vibe) : true))
    .filter((m) => (cat === "all" ? true : m.category === cat));
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const myOrders = state.orders.filter((o) => state.customer.myOrderIds.includes(o.id) && o.venueId === venue?.id && o.table === Number(table));

  if (!venue || !ctx.table) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-black">Table not found</h1>
          <p className="mt-2 text-muted-foreground">This QR code doesn't match an active table. Please ask the staff for help.</p>
          <Link to="/" className="mt-6 inline-block text-primary underline">Go to Turntables</Link>
        </div>
      </div>
    );
  }

  const coffee5 = quick.filter((m) => ["coffee", "cold-brew"].includes(m.category) && m.prepMins <= 5);
  const bites = quick.filter((m) => m.category === "bites");
  const cartTarget = (m: MenuItem) => (campaign && offer && campaign.itemIds.includes(m.id) ? campaign.pct : 0);

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-32">
      {/* Header */}
      <header className="relative overflow-hidden">
        <img src={IMAGES.hero} alt="" className="h-48 w-full object-cover opacity-60" width={1280} height={832} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{venue.kind} · {venue.area}</p>
          <h1 className="text-4xl font-black">{venue.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="rounded-full bg-primary px-2.5 py-0.5 font-bold text-primary-foreground">Table {table}</span>
            {squad && <span className="rounded-full bg-accent px-2.5 py-0.5 font-bold text-accent-foreground">{squad.code} · {squad.participants.length} in squad</span>}
          </div>
        </div>
        <div className="absolute right-4 top-4 flex gap-2">
          <button aria-label="Frequent Sipper loyalty" onClick={() => setSheet("loyalty")} className="rounded-full bg-background/70 p-2.5 backdrop-blur"><Stamp className="h-5 w-5" /></button>
          <button aria-label="SquadTab" onClick={() => setSheet("squad")} className="rounded-full bg-background/70 p-2.5 backdrop-blur"><Users className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="space-y-5 px-4">
        {/* WFH mode */}
        <div className={cn("flex items-center justify-between gap-3 rounded-2xl border p-4 transition", wfh ? "border-primary glow-lime bg-primary/5" : "border-border bg-card")}>
          <div className="flex items-center gap-3">
            <Laptop className={cn("h-6 w-6", wfh ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="font-bold">WFH / Client Call Mode</p>
              <p className="text-xs text-muted-foreground">Low-mess picks ready in ~{config!.quick.maxPrepMins} min or less (estimates)</p>
            </div>
          </div>
          <Switch label="WFH / Client Call Mode" checked={wfh} onChange={(v) => { setWfh(v); setCat("all"); }} />
        </div>

        <AnimatePresence>
          {wfh && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-2 gap-3 overflow-hidden">
              <QuickBox title="Coffee in ~5 min" icon={<Coffee className="h-4 w-4" />} items={coffee5} onAdd={(id) => ctx.actions.addItem(id, [], 1, "quick")} />
              <QuickBox title="Quick Bites" icon={<Zap className="h-4 w-4" />} items={bites} onAdd={(id) => ctx.actions.addItem(id, [], 1, "quick")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weather simulator + offer */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">Monsoon Mode</p>
            <SimBadge>Simulated weather</SimBadge>
          </div>
          <div className="flex gap-2">
            {WEATHER.map((w) => (
              <Pill key={w.id} active={state.customer.weather === w.id} onClick={() => ctx.actions.setWeather(w.id)}>
                <w.icon className="mr-1 inline h-4 w-4" />{w.label}
              </Pill>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {campaign && offer ? (
              <motion.div key={campaign.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl bg-gradient-to-br from-accent/25 to-primary/10 p-4" data-testid="weather-offer">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-bold">{campaign.message} {campaign.pct}% off</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Ends in {fmtLeft(offer.expiresAt - now)} · {campaign.maxRedemptions - campaign.redeemed} left</p>
                  </div>
                  <button aria-label="Dismiss offer" onClick={() => ctx.actions.dismissOffer(campaign.id)}><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 space-y-2">
                  {campaign.itemIds.map((id) => menu.find((m) => m.id === id)).filter(Boolean).map((m) => (
                    <div key={m!.id} className="flex items-center justify-between text-sm">
                      <span className={cn(!m!.available && "text-muted-foreground line-through")}>{m!.name}</span>
                      <span className="flex items-center gap-2">
                        <s className="text-muted-foreground">{formatINR(m!.price * 100)}</s>
                        <b>{formatINR(Math.round(m!.price * 100 * (1 - campaign.pct / 100)))}</b>
                        <Btn size="sm" disabled={!m!.available} onClick={() => ctx.actions.addItem(m!.id, [], 1, "monsoon")}>{m!.available ? "Add" : "Sold out"}</Btn>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Discount applies to eligible items at checkout while the timer runs. One use per customer; not combinable with cash refunds.</p>
              </motion.div>
            ) : state.customer.weather ? (
              <p className="mt-3 text-sm text-muted-foreground">No live offer for {state.customer.weather} weather right now.</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Pick a weather condition to preview the venue's weather offers.</p>
            )}
          </AnimatePresence>
        </div>

        {/* Mystery Tap */}
        {config!.mystery.enabled && (
          <button onClick={() => setSheet("mystery")} className="group flex w-full items-center justify-between rounded-2xl bg-primary p-4 text-left text-primary-foreground glow-lime">
            <div>
              <p className="font-display text-2xl font-black">Mystery Tap</p>
              <p className="text-sm opacity-80">Spin for a blind date with the menu</p>
            </div>
            <Dices className="h-10 w-10 transition group-hover:rotate-45" />
          </button>
        )}

        {/* My orders */}
        {myOrders.length > 0 && (
          <div className="space-y-2">
            {myOrders.slice(-2).map((o) => (
              <button key={o.id} onClick={() => setTracking(o.id)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
                <span>Order #{o.id.slice(-5)} · {formatINR(o.total)}</span>
                <span className="font-bold capitalize text-primary">{o.status}</span>
              </button>
            ))}
          </div>
        )}

        {/* Vibe menu */}
        <div>
          <p className="mb-2 font-bold">Vibe Menu</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {VIBES.map((v) => (
              <Pill key={v.id} active={vibe === v.id} onClick={() => setVibe(vibe === v.id ? null : v.id)}>{v.label}</Pill>
            ))}
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
          <Pill active={cat === "all"} onClick={() => setCat("all")}>All</Pill>
          {categories.map((c) => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</Pill>
          ))}
        </div>

        {wfh && <p className="text-xs text-muted-foreground">Showing {visible.length} quick items. Prep times are estimates set by the venue.</p>}
        <div className="grid gap-3 sm:grid-cols-2" data-testid="menu-grid">
          {visible.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">Nothing matches these filters. Try another vibe.</p>}
          {visible.map((m) => (
            <motion.div layout key={m.id} className={cn("flex gap-3 rounded-2xl border border-border bg-card p-3", !m.available && "opacity-50")}>
              <button className="shrink-0" onClick={() => setItem(m)} aria-label={`View ${m.name}`}>
                <img src={IMAGES[m.image]} alt={m.name} loading="lazy" width={816} height={816} className="h-24 w-24 rounded-xl object-cover" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <button onClick={() => setItem(m)} className="text-left">
                  <p className="font-bold leading-tight">
                    <span className={cn("mr-1.5 inline-block h-2.5 w-2.5 rounded-sm border", m.veg ? "border-success bg-success/60" : "border-destructive bg-destructive/60")} />
                    {m.name}
                    {m.isNew && <span className="ml-1.5 rounded bg-accent px-1 text-[10px] font-bold text-accent-foreground">NEW</span>}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                </button>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div>
                    <p className="font-semibold">
                      {cartTarget(m) ? (
                        <><s className="mr-1 text-xs text-muted-foreground">{formatINR(m.price * 100)}</s>{formatINR(Math.round(m.price * 100 * (1 - cartTarget(m) / 100)))}</>
                      ) : formatINR(m.price * 100)}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" />~{m.prepMins} min est.</p>
                  </div>
                  {m.available ? (
                    <button aria-label={`Add ${m.name}`} onClick={() => (m.modifiers.length ? setItem(m) : ctx.actions.addItem(m.id))} className="rounded-full bg-primary p-2 text-primary-foreground">
                      <Plus className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold uppercase text-destructive">Sold out</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart bar */}
      <AnimatePresence>
        {count > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl p-4">
            <button onClick={() => setSheet("cart")} className="flex w-full items-center justify-between rounded-full bg-primary px-5 py-4 font-bold text-primary-foreground glow-lime">
              <span className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> {count} item{count > 1 ? "s" : ""}</span>
              <span>View cart · {formatINR(totals.total)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemSheet item={item} onClose={() => setItem(null)} discountPct={item ? cartTarget(item) : 0} onAdd={(mods, qty) => { ctx.actions.addItem(item!.id, mods, qty); setItem(null); }} />
      <CartSheet ctx={ctx} open={sheet === "cart"} onClose={() => setSheet(null)} onPlaced={(id) => { setSheet(null); setTracking(id); }} />
      <MysteryWheel ctx={ctx} open={sheet === "mystery"} onClose={() => setSheet(null)} />
      <SquadSheet ctx={ctx} open={sheet === "squad"} onClose={() => setSheet(null)} initialCode={search.squad} />
      <LoyaltySheet ctx={ctx} open={sheet === "loyalty"} onClose={() => setSheet(null)} />
      <OrderTracker ctx={ctx} orderId={tracking} onClose={() => setTracking(null)} />
    </div>
  );
}

function QuickBox({ title, icon, items, onAdd }: { title: string; icon: React.ReactNode; items: MenuItem[]; onAdd: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">{icon}{title}</p>
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing quick available</p>}
      <ul className="space-y-1.5">
        {items.slice(0, 3).map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-1 text-xs">
            <span className="truncate">{m.name} <span className="text-muted-foreground">~{m.prepMins}m</span></span>
            <button aria-label={`Quick add ${m.name}`} onClick={() => onAdd(m.id)} className="rounded-full bg-primary/15 px-2 py-0.5 font-bold text-primary">+{m.price}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

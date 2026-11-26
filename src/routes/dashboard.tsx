import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ClipboardList, Megaphone, QrCode, RotateCcw, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Analytics, MenuEditor, OrdersBoard, Promotions, TablesQR } from "@/components/dashboard/Sections";
import { ProductionDashboard } from "@/components/dashboard/ProductionDashboard";
import { dataMode } from "@/lib/supabase";

type Tab = "overview" | "orders" | "menu" | "tables" | "promos";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (["overview", "orders", "menu", "tables", "promos"].includes(s.tab as string) ? s.tab : "overview") as Tab,
  }),
  head: () => ({
    meta: [
      { title: "Owner dashboard · Turntables" },
      { name: "description", content: "Manage venues, tables, QR codes, menus, orders, promotions and loyalty." },
      { property: "og:title", content: "Owner dashboard · Turntables" },
      { property: "og:description", content: "Run your tables, menu and offers from one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Analytics", icon: BarChart3 },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "tables", label: "Tables & QR", icon: QrCode },
  { id: "promos", label: "Promotions & loyalty", icon: Megaphone },
];

function Dashboard() {
  if (dataMode === "supabase") return <ProductionDashboard />;
  return <DemoDashboard />;
}

function DemoDashboard() {
  const { tab } = Route.useSearch();
  const { state, reset } = useStore();
  const [venueId, setVenueId] = useState("v1");
  const venue = state.venues.find((v) => v.id === venueId) ?? state.venues[0];
  const live = state.orders.filter((o) => o.venueId === venue.id && !["served", "cancelled"].includes(o.status)).length;

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <Link to="/" className="font-display text-2xl font-black">turn<span className="text-primary">tables</span></Link>
        <label className="mt-5 block text-xs text-muted-foreground">
          Venue
          <select aria-label="Venue" value={venue.id} onChange={(e) => setVenueId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-input bg-card px-2 text-sm text-foreground">
            {state.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          {TABS.map((t) => (
            <Link key={t.id} to="/dashboard" search={{ tab: t.id }} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
              <t.icon className="h-4 w-4" /> {t.label}
              {t.id === "orders" && live > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{live}</span>}
            </Link>
          ))}
        </nav>
        <button onClick={() => confirm("Reset all demo data?") && reset()} className="mt-6 hidden items-center gap-2 text-xs text-muted-foreground hover:text-foreground md:flex">
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{venue.kind} · {venue.area}</p>
          <h1 className="text-3xl font-black">{venue.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Demo workspace — data is stored in this browser only.</p>
        </div>
        {tab === "overview" && <Analytics venueId={venue.id} />}
        {tab === "orders" && <OrdersBoard venueId={venue.id} />}
        {tab === "menu" && <MenuEditor venueId={venue.id} />}
        {tab === "tables" && <TablesQR venueId={venue.id} onVenueCreated={setVenueId} />}
        {tab === "promos" && <Promotions venueId={venue.id} />}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, Pill } from "@/components/kit";
import { loadPublishedMenu, type BranchMenuItem } from "@/lib/backend/turntables-service";
import { formatINR } from "@/lib/pricing";

export function ProductionMenuPage({ slug, table }: { slug: string; table: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPublishedMenu>>>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPublishedMenu(slug)
      .then(setData)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load the published menu"),
      );
  }, [slug]);

  const visible = useMemo(() => {
    if (!data) return [];
    return category === "all"
      ? data.items
      : data.items.filter(
          (item) => data.categories.find((x) => x.id === item.category_id)?.name === category,
        );
  }, [category, data]);
  const count = Object.values(cart).reduce((total, qty) => total + qty, 0);

  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <Card>
          <h1 className="text-xl font-bold">Menu unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Go to Turntables
          </Link>
        </Card>
      </div>
    );
  if (!data)
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <p className="text-sm text-muted-foreground">Loading persisted menu…</p>
      </div>
    );

  const categories = data.categories.map((item) => item.name);
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="border-b border-border px-5 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Published menu · Table {table}
        </p>
        <h1 className="mt-2 text-4xl font-black">{data.restaurant.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.branch.name} · Live Supabase data
        </p>
      </header>
      <main className="space-y-5 px-4 py-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Pill active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Pill>
          {categories.map((name) => (
            <Pill key={name} active={category === name} onClick={() => setCategory(name)}>
              {name}
            </Pill>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2" data-testid="production-menu-grid">
          {visible.map((item) => (
            <ProductionItem
              key={item.id}
              item={item}
              onAdd={() =>
                setCart((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))
              }
            />
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No published menu items yet.
            </p>
          )}
        </div>
      </main>
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-4">
          <div className="rounded-full border border-primary/40 bg-card px-5 py-4 text-center text-sm font-bold shadow-xl">
            {count} item{count === 1 ? "" : "s"} selected · Customer ordering RPC will be enabled in
            the next milestone
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionItem({ item, onAdd }: { item: BranchMenuItem; onAdd: () => void }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{item.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.description || ""}</p>
        </div>
        <span className="shrink-0 font-semibold">{formatINR(item.price_minor)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{item.prep_minutes ? `~${item.prep_minutes} min` : "Made to order"}</span>
        <button
          className="rounded-full bg-primary px-3 py-2 font-bold text-primary-foreground disabled:opacity-50"
          disabled={!item.available}
          onClick={onAdd}
        >
          {item.available ? "Add" : "Sold out"}
        </button>
      </div>
    </article>
  );
}

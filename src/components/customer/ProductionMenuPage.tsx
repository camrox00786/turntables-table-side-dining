import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, Pill } from "@/components/kit";
import {
  addCustomerCartItem,
  loadBranchMenu,
  loadCustomerCart,
  openCustomerSession,
  placeCustomerOrder,
  type BranchMenuItem,
  type CustomerCartLine,
  type CustomerSessionContext,
} from "@/lib/backend/turntables-service";
import { formatINR } from "@/lib/pricing";

function tokenFor(slug: string, branchSlug: string | undefined, table: number) {
  const key = `turntables:customer-token:${slug}:${branchSlug ?? "default"}:${table}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, token);
  return token;
}

export function ProductionMenuPage({
  slug,
  branchSlug,
  table,
}: {
  slug: string;
  branchSlug?: string;
  table: number;
}) {
  const [context, setContext] = useState<CustomerSessionContext | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadBranchMenu>> | null>(null);
  const [cart, setCart] = useState<CustomerCartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState<{
    order_number: number;
    total_minor?: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = tokenFor(slug, branchSlug, table);
    setError(null);
    setContext(null);
    setData(null);
    setCart([]);
    openCustomerSession({
      restaurantSlug: slug,
      branchSlug,
      tableNumber: table,
      customerToken: token,
    })
      .then(async (nextContext) => {
        const [nextMenu, nextCart] = await Promise.all([
          loadBranchMenu(nextContext.branch_id),
          loadCustomerCart(token, nextContext.session_id),
        ]);
        if (cancelled) return;
        setContext(nextContext);
        setData(nextMenu);
        setCart(nextCart);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : "Could not validate this table");
      });
    return () => {
      cancelled = true;
    };
  }, [branchSlug, slug, table]);

  const visible = useMemo(() => {
    if (!data) return [];
    return category === "all"
      ? data.items
      : data.items.filter(
          (item) => data.categories.find((x) => x.id === item.category_id)?.name === category,
        );
  }, [category, data]);
  const count = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cart.reduce((total, line) => total + line.price_minor * line.quantity, 0);

  async function addItem(item: BranchMenuItem) {
    if (!context) return;
    setBusyItem(item.id);
    try {
      const next = await addCustomerCartItem({
        customerToken: tokenFor(slug, branchSlug, table),
        sessionId: context.session_id,
        menuItemId: item.id,
      });
      setCart(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this item");
    } finally {
      setBusyItem(null);
    }
  }

  async function placeOrder() {
    if (!context || count === 0) return;
    setPlacing(true);
    try {
      const nextOrder = await placeCustomerOrder(
        tokenFor(slug, branchSlug, table),
        context.session_id,
        crypto.randomUUID(),
      );
      setOrder(nextOrder);
      setCart([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not place this order");
    } finally {
      setPlacing(false);
    }
  }

  if (error)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <Card>
          <h1 className="text-xl font-bold">Menu unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.includes("not_found") || error.includes("branch_required")
              ? "This QR code does not match an active restaurant, branch, or table."
              : error}
          </p>
          <Link to="/" className="mt-4 inline-block text-primary underline">
            Go to Turntables
          </Link>
        </Card>
      </div>
    );
  if (!context || !data)
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <p className="text-sm text-muted-foreground">
          Validating table and loading persisted menu…
        </p>
      </div>
    );

  const categories = data.categories.map((item) => item.name);
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
      <header className="border-b border-border px-5 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Published menu · Table {context.table_number}
        </p>
        <h1 className="mt-2 text-4xl font-black">{context.restaurant_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {context.branch_name} · Live Supabase data
        </p>
      </header>
      <main className="space-y-5 px-4 py-5">
        {order && (
          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Order received
            </p>
            <h2 className="mt-1 text-xl font-black">Order #{order.order_number}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sent to the restaurant. Payment is not enabled in this milestone.
            </p>
          </Card>
        )}
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
              busy={busyItem === item.id}
              onAdd={() => addItem(item)}
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
          <div className="flex items-center justify-between gap-4 rounded-full border border-primary/40 bg-card px-5 py-3 shadow-xl">
            <div className="text-sm font-bold">
              {count} item{count === 1 ? "" : "s"} · {formatINR(cartTotal)}
            </div>
            <button
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              disabled={placing}
              onClick={placeOrder}
            >
              {placing ? "Sending…" : "Place order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionItem({
  item,
  busy,
  onAdd,
}: {
  item: BranchMenuItem;
  busy: boolean;
  onAdd: () => void;
}) {
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
          disabled={!item.available || busy}
          onClick={onAdd}
        >
          {busy ? "Adding…" : item.available ? "Add" : "Sold out"}
        </button>
      </div>
    </article>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Pill } from "@/components/kit";
import {
  addCustomerCartItem,
  loadBranchMenu,
  loadCustomerCart,
  loadCustomerSessionOrders,
  openCustomerSession,
  placeCustomerOrder,
  removeCustomerCartItem,
  updateCustomerCartItem,
  type BranchMenuItem,
  type CustomerCartLine,
  type CustomerSessionContext,
  type CustomerSessionOrder,
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

const STATUS_LABEL: Record<CustomerSessionOrder["status"], string> = {
  pending_payment: "Order received",
  partially_paid: "Partially paid",
  paid: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

function statusTone(status: CustomerSessionOrder["status"]) {
  return status === "cancelled"
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : status === "ready" || status === "served"
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-secondary text-foreground";
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
  const [orders, setOrders] = useState<CustomerSessionOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [busyCartItem, setBusyCartItem] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const customerToken = useMemo(() => tokenFor(slug, branchSlug, table), [slug, branchSlug, table]);

  const refreshOrders = useCallback(async (sessionId: string) => {
    const next = await loadCustomerSessionOrders(customerToken, sessionId);
    setOrders(next);
  }, [customerToken]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setContext(null);
    setData(null);
    setCart([]);
    setOrders([]);
    openCustomerSession({
      restaurantSlug: slug,
      branchSlug,
      tableNumber: table,
      customerToken,
    })
      .then(async (nextContext) => {
        const [nextMenu, nextCart, nextOrders] = await Promise.all([
          loadBranchMenu(nextContext.branch_id),
          loadCustomerCart(customerToken, nextContext.session_id),
          loadCustomerSessionOrders(customerToken, nextContext.session_id),
        ]);
        if (cancelled) return;
        setContext(nextContext);
        setData(nextMenu);
        setCart(nextCart);
        setOrders(nextOrders);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not validate this table");
      });
    return () => { cancelled = true; };
  }, [branchSlug, customerToken, slug, table]);

  // Poll the session-scoped order feed so every phone at this table sees updates,
  // including orders placed by other guests. No client can query another session.
  useEffect(() => {
    if (!context) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await loadCustomerSessionOrders(customerToken, context.session_id);
        if (active) setOrders(next);
      } catch {
        // Keep the last confirmed status visible during a temporary network issue.
      }
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [context, customerToken]);

  const visible = useMemo(() => {
    if (!data) return [];
    return category === "all" ? data.items : data.items.filter(
      (item) => data.categories.find((x) => x.id === item.category_id)?.name === category,
    );
  }, [category, data]);
  const count = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cart.reduce((total, line) => total + line.price_minor * line.quantity, 0);

  async function addItem(item: BranchMenuItem) {
    if (!context) return;
    setBusyItem(item.id);
    try {
      setCart(await addCustomerCartItem({ customerToken, sessionId: context.session_id, menuItemId: item.id }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add this item");
    } finally { setBusyItem(null); }
  }

  async function changeQuantity(line: CustomerCartLine, quantity: number) {
    if (!context) return;
    setBusyCartItem(line.id);
    try {
      const next = quantity <= 0
        ? await removeCustomerCartItem({ customerToken, sessionId: context.session_id, cartItemId: line.id })
        : await updateCustomerCartItem({ customerToken, sessionId: context.session_id, cartItemId: line.id, quantity });
      setCart(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your cart");
    } finally { setBusyCartItem(null); }
  }

  async function placeOrder() {
    if (!context || count === 0) return;
    setPlacing(true);
    try {
      await placeCustomerOrder(customerToken, context.session_id, crypto.randomUUID());
      setCart([]);
      setShowCart(false);
      await refreshOrders(context.session_id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not place this order");
    } finally { setPlacing(false); }
  }

  if (error && !context) return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <Card>
        <h1 className="text-xl font-bold">Menu unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.includes("not_found") || error.includes("branch_required")
            ? "This QR code does not match an active restaurant, branch, or table."
            : error}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Please ask the restaurant team to check the table QR.</p>
      </Card>
    </div>
  );
  if (!context || !data) return (
    <div className="grid min-h-screen place-items-center p-6">
      <p className="text-sm text-muted-foreground">Validating your table and loading its menu…</p>
    </div>
  );

  const categories = data.categories.map((item) => item.name);
  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-36">
      <header className="border-b border-border px-5 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Table {context.table_number} · {context.branch_name}
        </p>
        <h1 className="mt-2 text-4xl font-black">{context.restaurant_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your table's shared dining session</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">Group ordering active</span>
          <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"} this visit</span>
        </div>
      </header>

      <main className="space-y-7 px-4 py-5">
        {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <section aria-label="Menu" className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Pill active={category === "all"} onClick={() => setCategory("all")}>All</Pill>
            {categories.map((name) => <Pill key={name} active={category === name} onClick={() => setCategory(name)}>{name}</Pill>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2" data-testid="production-menu-grid">
            {visible.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                {item.image_url && <img src={item.image_url} alt="" loading="lazy" className="mb-3 h-36 w-full rounded-xl object-cover" />}
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-bold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.description || ""}</p></div>
                  <span className="shrink-0 font-semibold">{formatINR(item.price_minor)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.prep_minutes ? `~${item.prep_minutes} min` : "Made to order"}</span>
                  <button className="rounded-full bg-primary px-3 py-2 font-bold text-primary-foreground disabled:opacity-50" disabled={!item.available || busyItem === item.id} onClick={() => void addItem(item)}>
                    {busyItem === item.id ? "Adding…" : item.available ? "Add" : "Sold out"}
                  </button>
                </div>
              </article>
            ))}
            {visible.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No published menu items in this category.</p>}
          </div>
        </section>

        <section aria-labelledby="session-orders-heading" className="space-y-3">
          <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Live table activity</p><h2 id="session-orders-heading" className="text-2xl font-black">Your orders</h2></div><span className="text-xs text-muted-foreground">Updates every 5 sec</span></div>
          {orders.length === 0 ? <Card><p className="text-sm text-muted-foreground">No orders yet. Add something from the menu to get started.</p></Card> : orders.map((order) => (
            <article key={order.order_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Order #{order.order_number}</p><p className="mt-1 font-bold">{new Date(order.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(order.status)}`}>{STATUS_LABEL[order.status]}</span></div>
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-3"><span>{item.quantity} × {item.item_name}</span><span className="tabular-nums">{formatINR(item.line_total_minor)}</span></li>)}</ul>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-bold"><span>Order total</span><span>{formatINR(order.total_minor)}</span></div>
              {order.status === "cancelled" && <p className="mt-2 text-xs text-destructive">This order was cancelled by the restaurant.</p>}
            </article>
          ))}
        </section>
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl p-4">
          <button onClick={() => setShowCart(true)} className="flex w-full items-center justify-between rounded-full border border-primary/40 bg-card px-5 py-4 font-bold shadow-xl">
            <span>{count} item{count === 1 ? "" : "s"} in your cart</span><span>{formatINR(cartTotal)} · View cart</span>
          </button>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => setShowCart(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="cart-heading" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 id="cart-heading" className="text-2xl font-black">Your cart</h2><button className="rounded-full px-3 py-2 text-sm" onClick={() => setShowCart(false)}>Close</button></div>
            <p className="mt-1 text-xs text-muted-foreground">Your cart is private to you. Submitted orders join the table's shared session.</p>
            <div className="mt-4 space-y-3">
              {cart.map((line) => <div key={line.id} className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="min-w-0"><p className="font-semibold">{line.name}</p><p className="text-sm text-muted-foreground">{formatINR(line.price_minor)} each</p></div>
                <div className="flex items-center gap-2"><button aria-label={`Remove one ${line.name}`} disabled={busyCartItem === line.id} onClick={() => void changeQuantity(line, line.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full border">−</button><span className="w-5 text-center tabular-nums">{line.quantity}</span><button aria-label={`Add one ${line.name}`} disabled={busyCartItem === line.id} onClick={() => void changeQuantity(line, line.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full border">+</button><button aria-label={`Remove ${line.name}`} disabled={busyCartItem === line.id} onClick={() => void changeQuantity(line, 0)} className="ml-1 text-xs text-destructive">Remove</button></div>
              </div>)}
            </div>
            <div className="mt-5 flex justify-between text-lg font-black"><span>Subtotal</span><span>{formatINR(cartTotal)}</span></div>
            <button disabled={placing || count === 0} onClick={() => void placeOrder()} className="mt-5 w-full rounded-full bg-primary px-5 py-4 font-bold text-primary-foreground disabled:opacity-50">{placing ? "Sending order…" : "Send order to kitchen"}</button>
          </section>
        </div>
      )}
    </div>
  );
}

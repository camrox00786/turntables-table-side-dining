import { useEffect, useMemo } from "react";
import { cartKey, uid, useNow, useStore } from "@/lib/store";
import { applyStamp, availableReward, computeTotals, mysteryPick, mysteryPool } from "@/lib/pricing";
import type { CartLine, Order, Weather } from "@/lib/types";
import { toast } from "sonner";

export function useTable(slug: string, tableNo: number) {
  const { state, set, hydrated } = useStore();
  const now = useNow(1000);
  const venue = state.venues.find((v) => v.slug === slug);
  const table = venue ? state.tables.find((t) => t.venueId === venue.id && t.number === tableNo) : undefined;
  const menu = useMemo(() => (venue ? state.menu.filter((m) => m.venueId === venue.id) : []), [state.menu, venue]);
  const config = venue ? state.configs[venue.id] : undefined;
  const c = state.customer;
  const squadRaw = c.squadCode ? state.squads[c.squadCode] : undefined;
  const squad = squadRaw && venue && squadRaw.venueId === venue.id && squadRaw.table === tableNo ? squadRaw : undefined;
  const key = venue ? cartKey(venue.id, tableNo, squad?.code) : "";
  const lines = state.carts[key] ?? [];

  // Weather offer: active only while the simulated weather matches and the timer is live.
  const campaign = config?.campaigns.find(
    (x) => x.condition === c.weather && x.enabled && x.redeemed < x.maxRedemptions && !c.offerHistory[x.id] && (c.offerTimers[x.id] ?? 0) > now,
  );
  const offer = campaign ? { campaignId: campaign.id, expiresAt: c.offerTimers[campaign.id] } : undefined;

  const account = venue && c.phone ? state.loyalty[`${venue.id}:${c.phone}`] : undefined;
  const reward = availableReward(account, now);
  const totals = computeTotals({
    lines,
    menu,
    now,
    campaign,
    offer,
    mystery: config?.mystery,
    loyalty: config ? { config: config.loyalty, redeem: c.useLoyaltyReward, hasReward: !!reward } : undefined,
  });

  // Expire offers whose timer ran out so they are never shown again.
  useEffect(() => {
    if (!config) return;
    const expired = config.campaigns.filter((x) => c.offerTimers[x.id] && c.offerTimers[x.id] <= now && !c.offerHistory[x.id]);
    if (expired.length) {
      set((d) => expired.forEach((x) => (d.customer.offerHistory[x.id] = "expired")));
      toast(`${expired[0].title} has expired`);
    }
  }, [now, config, c.offerTimers, c.offerHistory, set]);

  const owner = squad ? c.myName : undefined;

  const actions = {
    addItem(itemId: string, modifierIds: string[] = [], qty = 1, source?: CartLine["source"], forOwner?: string) {
      const item = menu.find((m) => m.id === itemId);
      if (!item || !item.available) {
        toast.error(`${item?.name ?? "Item"} is sold out`);
        return;
      }
      set((d) => {
        const arr = (d.carts[key] ??= []);
        const who = forOwner ?? owner;
        const same = arr.find((l) => l.itemId === itemId && l.owner === who && l.source === source && l.modifierIds.join() === [...modifierIds].sort().join());
        if (same) same.qty += qty;
        else arr.push({ lineId: uid("ln"), itemId, qty, modifierIds: [...modifierIds].sort(), owner: who, source });
      });
      toast.success(`${item.name} added`);
    },
    changeQty(lineId: string, delta: number) {
      set((d) => {
        const arr = d.carts[key] ?? [];
        const l = arr.find((x) => x.lineId === lineId);
        if (!l) return;
        l.qty += delta;
        d.carts[key] = arr.filter((x) => x.qty > 0);
      });
    },
    setWeather(w: Weather) {
      set((d) => {
        d.customer.weather = w;
        const match = config?.campaigns.find((x) => x.condition === w && x.enabled && x.redeemed < x.maxRedemptions && !d.customer.offerHistory[x.id]);
        // Start the timer once; switching weather back and forth never restarts it.
        if (match && !d.customer.offerTimers[match.id]) d.customer.offerTimers[match.id] = Date.now() + match.durationMin * 60000;
      });
    },
    dismissOffer(id: string) {
      set((d) => (d.customer.offerHistory[id] = "dismissed"));
    },
    spin() {
      const pool = mysteryPool(menu);
      const next = c.spinCount + 1;
      set((d) => (d.customer.spinCount = next));
      return mysteryPick(pool, next);
    },
    setLoyaltyUse(v: boolean) {
      set((d) => (d.customer.useLoyaltyReward = v));
    },
    placeOrder(): Order | undefined {
      if (!venue || !config) return;
      if (lines.length === 0) return void toast.error("Your cart is empty");
      if (totals.unavailable.length) return void toast.error(`Remove sold-out items: ${totals.unavailable.join(", ")}`);
      const t = computeTotals({
        lines,
        menu,
        now: Date.now(),
        campaign,
        offer,
        mystery: config.mystery,
        loyalty: { config: config.loyalty, redeem: c.useLoyaltyReward, hasReward: !!reward },
      });
      const order: Order = {
        id: uid("ord"),
        venueId: venue.id,
        table: tableNo,
        lines,
        subtotal: t.subtotal,
        discount: t.discount,
        tax: t.tax,
        total: t.total,
        discounts: t.discounts,
        freebies: t.freebies,
        status: "placed",
        payment: "unpaid",
        createdAt: Date.now(),
        phone: c.phone,
        squadCode: squad?.code,
        participants: squad?.participants,
        campaignId: t.monsoonApplied ? campaign?.id : undefined,
        usedMysteryReward: t.mysteryApplied,
        usedLoyaltyReward: t.loyaltyApplied,
      };
      set((d) => {
        d.orders.push(order);
        d.carts[key] = [];
        d.customer.myOrderIds.push(order.id);
        const cfg = d.configs[venue.id];
        if (t.monsoonApplied && campaign) {
          cfg.campaigns.find((x) => x.id === campaign.id)!.redeemed++;
          d.customer.offerHistory[campaign.id] = "used";
        }
        if (t.mysteryApplied) cfg.mystery.redeemed++;
        if (t.loyaltyApplied && reward && c.phone) {
          const acc = d.loyalty[`${venue.id}:${c.phone}`];
          const r = acc.rewards.find((x) => x.id === reward.id)!;
          r.redeemedAt = Date.now();
          r.orderId = order.id;
          d.customer.useLoyaltyReward = false;
        }
      });
      return order;
    },
    simulatePurchase() {
      if (!venue || !config || !account) return;
      const id = uid("demo");
      const total = Math.max(config.loyalty.minSpend, 250) * 100;
      const res = applyStamp(account, { id, total, status: "served" }, config.loyalty, Date.now());
      set((d) => {
        d.loyalty[`${venue.id}:${account.phone}`] = res.account;
        d.orders.push({
          id, venueId: venue.id, table: tableNo, lines: [], subtotal: total, discount: 0, tax: 0, total, discounts: [], freebies: [],
          status: "served", payment: "paid_at_counter", createdAt: Date.now(), phone: account.phone, demo: true,
        });
      });
      if (res.unlocked) toast.success("Reward unlocked! 🎉");
      else if (res.stamped) toast.success("Stamp added");
    },
  };

  return { state, hydrated, venue, table, menu, config, lines, totals, campaign, offer, account, reward, squad, now, actions, set };
}

export type TableCtx = ReturnType<typeof useTable>;

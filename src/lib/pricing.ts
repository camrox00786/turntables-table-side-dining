import type {
  ActiveOffer,
  Campaign,
  CartLine,
  LoyaltyAccount,
  LoyaltyConfig,
  MenuItem,
  MysteryConfig,
} from "./types";

export const GST_RATE = 0.05;

export function formatINR(paise: number) {
  const r = paise / 100;
  return "₹" + r.toLocaleString("en-IN", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function unitPrice(item: MenuItem, modifierIds: string[]) {
  const mods = item.modifiers.filter((m) => modifierIds.includes(m.id)).reduce((a, m) => a + m.price, 0);
  return (item.price + mods) * 100; // paise
}

export function isOfferLive(campaign: Campaign | undefined, offer: ActiveOffer | undefined, now: number) {
  return !!(
    campaign &&
    offer &&
    offer.campaignId === campaign.id &&
    campaign.enabled &&
    offer.expiresAt > now &&
    campaign.redeemed < campaign.maxRedemptions
  );
}

export interface TotalsInput {
  lines: CartLine[];
  menu: MenuItem[];
  now: number;
  campaign?: Campaign;
  offer?: ActiveOffer;
  mystery?: MysteryConfig;
  loyalty?: { config: LoyaltyConfig; redeem: boolean; hasReward: boolean };
}

export interface Totals {
  subtotal: number;
  discounts: { label: string; amount: number }[];
  discount: number;
  tax: number;
  total: number;
  freebies: string[];
  unavailable: string[];
  monsoonApplied: boolean;
  mysteryApplied: boolean;
  loyaltyApplied: boolean;
}

export function computeTotals(input: TotalsInput): Totals {
  const { lines, menu, now, campaign, offer, mystery, loyalty } = input;
  const byId = new Map(menu.map((m) => [m.id, m]));
  let subtotal = 0;
  let monsoon = 0;
  const unavailable: string[] = [];
  const live = isOfferLive(campaign, offer, now);

  for (const l of lines) {
    const item = byId.get(l.itemId);
    if (!item) continue;
    if (!item.available) unavailable.push(item.name);
    const lp = unitPrice(item, l.modifierIds) * l.qty;
    subtotal += lp;
    if (live && campaign!.itemIds.includes(item.id)) monsoon += Math.round((lp * campaign!.pct) / 100);
  }

  const discounts: { label: string; amount: number }[] = [];
  if (monsoon > 0) discounts.push({ label: `${campaign!.title} (${campaign!.pct}% off)`, amount: monsoon });

  let loyaltyApplied = false;
  if (loyalty?.redeem && loyalty.hasReward && loyalty.config.enabled) {
    const rewardItem = byId.get(loyalty.config.rewardItemId);
    const hasLine = lines.some((l) => l.itemId === loyalty.config.rewardItemId && l.qty > 0);
    if (rewardItem && hasLine) {
      let unit = rewardItem.price * 100;
      if (live && campaign!.itemIds.includes(rewardItem.id)) unit -= Math.round((unit * campaign!.pct) / 100);
      discounts.push({ label: `Loyalty reward: free ${rewardItem.name}`, amount: unit });
      loyaltyApplied = true;
    }
  }

  const freebies: string[] = [];
  let mysteryApplied = false;
  if (mystery?.enabled && mystery.redeemed < mystery.maxRedemptions) {
    const hasMystery = lines.some((l) => l.source === "mystery" && byId.get(l.itemId)?.available);
    const reward = byId.get(mystery.rewardItemId);
    if (hasMystery && reward) {
      freebies.push(reward.name); // exactly one per order, never duplicated
      mysteryApplied = true;
    }
  }

  const discount = Math.min(subtotal, discounts.reduce((a, d) => a + d.amount, 0));
  const tax = Math.round((subtotal - discount) * GST_RATE);
  return {
    subtotal,
    discounts,
    discount,
    tax,
    total: subtotal - discount + tax,
    freebies,
    unavailable,
    monsoonApplied: monsoon > 0,
    mysteryApplied,
    loyaltyApplied,
  };
}

/* ---------- SquadTab splits ---------- */

export function equalSplit(total: number, people: number): number[] {
  if (people <= 0) return [];
  const base = Math.floor(total / people);
  const rem = total - base * people;
  return Array.from({ length: people }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Allocates the final total (incl. tax & discounts) by each participant's item subtotal share. */
export function itemSplit(lines: CartLine[], menu: MenuItem[], participants: string[], total: number) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  const subs = participants.map((p) =>
    lines
      .filter((l) => l.owner === p)
      .reduce((a, l) => {
        const it = byId.get(l.itemId);
        return it ? a + unitPrice(it, l.modifierIds) * l.qty : a;
      }, 0),
  );
  const all = subs.reduce((a, b) => a + b, 0);
  if (all === 0) return participants.map((name) => ({ name, subtotal: 0, share: 0 }));
  const shares = subs.map((s) => Math.floor((s * total) / all));
  let rem = total - shares.reduce((a, b) => a + b, 0);
  for (let i = 0; rem > 0; i = (i + 1) % shares.length) {
    if (subs[i] > 0) {
      shares[i]++;
      rem--;
    }
  }
  return participants.map((name, i) => ({ name, subtotal: subs[i], share: shares[i] }));
}

export function customSplit(amounts: number[], total: number) {
  const assigned = amounts.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0);
  return { assigned, outstanding: total - assigned };
}

/* ---------- Frequent Sipper ---------- */

export function applyStamp(
  account: LoyaltyAccount,
  order: { id: string; total: number; status: string },
  config: LoyaltyConfig,
  now: number,
): { account: LoyaltyAccount; stamped: boolean; unlocked: boolean } {
  if (!config.enabled || order.status !== "served") return { account, stamped: false, unlocked: false };
  if (account.stampedOrderIds.includes(order.id)) return { account, stamped: false, unlocked: false };
  if (order.total < config.minSpend * 100) return { account, stamped: false, unlocked: false };
  let stamps = account.stamps + 1;
  const rewards = [...account.rewards];
  let unlocked = false;
  if (stamps >= config.stampsNeeded) {
    stamps = 0;
    unlocked = true;
    rewards.push({
      id: `rw-${order.id}`,
      itemId: config.rewardItemId,
      unlockedAt: now,
      expiresAt: now + config.rewardExpiryDays * 86400000,
    });
  }
  return {
    account: { ...account, stamps, stampedOrderIds: [...account.stampedOrderIds, order.id], rewards },
    stamped: true,
    unlocked,
  };
}

export function availableReward(account: LoyaltyAccount | undefined, now: number) {
  return account?.rewards.find((r) => !r.redeemedAt && r.expiresAt > now);
}

/* ---------- WFH / Client Call mode ---------- */

export function quickItems(menu: MenuItem[], cfg: { categories: string[]; maxPrepMins: number }) {
  return menu
    .filter((m) => m.available && m.quick && m.prepMins <= cfg.maxPrepMins && cfg.categories.includes(m.category))
    .sort((a, b) => a.prepMins - b.prepMins);
}

/* ---------- Mystery Tap ---------- */

export function mysteryPool(menu: MenuItem[]) {
  return menu.filter((m) => m.mysteryEligible && m.available);
}

/** Deterministic pick: same spin count always lands on the same item. */
export function mysteryPick(pool: MenuItem[], spin: number) {
  if (pool.length === 0) return undefined;
  return pool[(spin * 7 + 3) % pool.length];
}

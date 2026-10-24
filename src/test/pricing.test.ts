import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/demo-data";
import { applyStamp, computeTotals, customSplit, equalSplit, itemSplit, mysteryPick, mysteryPool, quickItems } from "@/lib/pricing";
import type { CartLine } from "@/lib/types";

const s = seedState();
const menu = s.menu.filter((m) => m.venueId === "v1");
const cfg = s.configs.v1;
const rain = cfg.campaigns.find((c) => c.condition === "rainy")!;
const now = 1_000_000;
const line = (itemId: string, qty = 1, extra: Partial<CartLine> = {}): CartLine => ({ lineId: itemId + qty, itemId, qty, modifierIds: [], ...extra });

describe("totals", () => {
  it("adds 5% GST to item total", () => {
    const t = computeTotals({ lines: [line("v1-fries", 2)], menu, now }); // 2 × ₹180
    expect(t.subtotal).toBe(36000);
    expect(t.tax).toBe(1800);
    expect(t.total).toBe(37800);
  });
  it("includes modifier prices", () => {
    const t = computeTotals({ lines: [line("v1-flat", 1, { modifierIds: ["oat", "shot"] })], menu, now }); // 190+40+50
    expect(t.subtotal).toBe(28000);
  });
  it("applies 10% monsoon discount only to eligible items while live", () => {
    const lines = [line("v1-filter"), line("v1-fries")]; // 120 eligible, 180 not
    const live = computeTotals({ lines, menu, now, campaign: rain, offer: { campaignId: rain.id, expiresAt: now + 1 } });
    expect(live.discount).toBe(1200);
    expect(live.total).toBe(Math.round((30000 - 1200) * 1.05));
    const expired = computeTotals({ lines, menu, now, campaign: rain, offer: { campaignId: rain.id, expiresAt: now } });
    expect(expired.discount).toBe(0);
  });
  it("stops monsoon discount once max redemptions are used", () => {
    const t = computeTotals({ lines: [line("v1-filter")], menu, now, campaign: { ...rain, redeemed: rain.maxRedemptions }, offer: { campaignId: rain.id, expiresAt: now + 1 } });
    expect(t.discount).toBe(0);
  });
  it("gives exactly one mystery freebie per order", () => {
    const t = computeTotals({ lines: [line("v1-ipa", 1, { source: "mystery" }), line("v1-stout", 2, { source: "mystery" })], menu, now, mystery: cfg.mystery });
    expect(t.freebies).toEqual(["Masala Fries"]);
    expect(t.total).toBe(Math.round((39000 + 84000) * 1.05));
  });
  it("gives no mystery freebie when limit reached", () => {
    const t = computeTotals({ lines: [line("v1-ipa", 1, { source: "mystery" })], menu, now, mystery: { ...cfg.mystery, redeemed: cfg.mystery.maxRedemptions } });
    expect(t.freebies).toEqual([]);
  });
  it("loyalty reward makes one cold brew free", () => {
    const t = computeTotals({ lines: [line("v1-coldbrew", 2)], menu, now, loyalty: { config: cfg.loyalty, redeem: true, hasReward: true } });
    expect(t.discount).toBe(22000);
    expect(t.total).toBe(Math.round(22000 * 1.05));
  });
  it("flags sold-out items", () => {
    const t = computeTotals({ lines: [line("v1-biryani")], menu, now });
    expect(t.unavailable).toEqual(["Donne Biryani Bowl"]);
  });
});

describe("SquadTab splits", () => {
  it("equal split sums exactly to total", () => {
    expect(equalSplit(10000, 3)).toEqual([3334, 3333, 3333]);
  });
  it("item split allocates total by each person's items", () => {
    const lines = [line("v1-coldbrew", 1, { owner: "A" }), line("v1-burger", 1, { owner: "B" })]; // 220 vs 420
    const r = itemSplit(lines, menu, ["A", "B"], 67200);
    expect(r.map((x) => x.share)).toEqual([23100, 44100]);
  });
  it("custom split reports outstanding balance", () => {
    expect(customSplit([20000, 10000], 37800).outstanding).toBe(7800);
  });
});

describe("loyalty stamps", () => {
  const acc = { venueId: "v1", phone: "x", name: "x", stamps: 4, stampedOrderIds: [], rewards: [] };
  it("unlocks reward on the 5th qualifying stamp", () => {
    const r = applyStamp(acc, { id: "o1", total: 30000, status: "served" }, cfg.loyalty, now);
    expect(r.unlocked).toBe(true);
    expect(r.account.stamps).toBe(0);
    expect(r.account.rewards[0].expiresAt).toBe(now + 30 * 86400000);
  });
  it("never stamps the same order twice", () => {
    const once = applyStamp({ ...acc, stamps: 1 }, { id: "o1", total: 30000, status: "served" }, cfg.loyalty, now).account;
    const twice = applyStamp(once, { id: "o1", total: 30000, status: "served" }, cfg.loyalty, now);
    expect(twice.stamped).toBe(false);
    expect(twice.account.stamps).toBe(2);
  });
  it("does not stamp unserved or below-minimum orders", () => {
    expect(applyStamp(acc, { id: "o2", total: 30000, status: "placed" }, cfg.loyalty, now).stamped).toBe(false);
    expect(applyStamp(acc, { id: "o3", total: 14999, status: "served" }, cfg.loyalty, now).stamped).toBe(false);
  });
});

describe("quick mode & mystery pool", () => {
  it("quick mode only shows available quick items within max prep", () => {
    const q = quickItems(menu, cfg.quick);
    expect(q.every((m) => m.available && m.quick && m.prepMins <= 7)).toBe(true);
    expect(q.map((m) => m.id)).not.toContain("v1-paneer"); // 9 min
  });
  it("mystery pool excludes sold-out items and picks deterministically", () => {
    const m2 = menu.map((m) => (m.id === "v1-ipa" ? { ...m, available: false } : m));
    const pool = mysteryPool(m2);
    expect(pool.map((m) => m.id)).not.toContain("v1-ipa");
    expect(mysteryPick(pool, 1)?.id).toBe(mysteryPick(pool, 1)?.id);
  });
});

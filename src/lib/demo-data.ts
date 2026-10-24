import type { LoyaltyAccount, MenuItem, Order, Squad, Table, Venue, VenueConfig } from "./types";

export const DEMO_PHONE = "+91 98450 00000";
export const DEMO_OTP = "1234";
// Fixed reference time keeps the seed deterministic for SSR and tests.
const BASE = Date.UTC(2026, 9, 23, 12, 0, 0);

type Seed = Omit<MenuItem, "id" | "venueId" | "modifiers" | "vibes" | "mysteryReason"> &
  Partial<Pick<MenuItem, "modifiers" | "vibes" | "mysteryReason">> & { key: string };

const milk = [
  { id: "oat", name: "Oat milk", price: 40 },
  { id: "shot", name: "Extra shot", price: 50 },
];
const spice = [
  { id: "hot", name: "Extra spicy", price: 0 },
  { id: "dip", name: "Extra dip", price: 30 },
];

const taproom: Seed[] = [
  { key: "filter", name: "Nilgiri Filter Coffee", description: "Chicory-kissed decoction, frothed tall.", price: 120, category: "coffee", image: "coffee", available: true, prepMins: 4, quick: true, veg: true, vibes: ["focus", "chill"], modifiers: milk },
  { key: "flat", name: "Flat White", description: "Double ristretto, silky microfoam.", price: 190, category: "coffee", image: "coffee", available: true, prepMins: 5, quick: true, veg: true, vibes: ["focus"], modifiers: milk },
  { key: "coldbrew", name: "Signature Cold Brew", description: "18-hour Chikmagalur steep, served on ice.", price: 220, category: "cold-brew", image: "coffee", available: true, prepMins: 2, quick: true, veg: true, vibes: ["focus", "chill"], modifiers: milk },
  { key: "tonic", name: "Espresso Tonic", description: "Bright, bitter, bubbly. Lime zest.", price: 240, category: "cold-brew", image: "coffee", available: true, prepMins: 3, quick: true, veg: true, vibes: ["date", "chill"], mysteryEligible: true, mysteryReason: "Our newest coffee launch — fizzy and bright.", isNew: true },
  { key: "fries", name: "Masala Fries", description: "Twice-fried, peri peri masala, garlic dip.", price: 180, category: "bites", image: "bites", available: true, prepMins: 7, quick: true, veg: true, vibes: ["party", "chill"], modifiers: spice },
  { key: "paneer", name: "Chilli Paneer Bites", description: "Crisp paneer, Indo-Chinese glaze.", price: 290, category: "bites", image: "bites", available: true, prepMins: 9, quick: true, veg: true, vibes: ["party"], modifiers: spice, mysteryEligible: true, mysteryReason: "A crowd favourite that pairs with every tap." },
  { key: "wings", name: "Ghee Roast Wings", description: "Mangalorean ghee roast, curry leaf crunch.", price: 360, category: "bites", image: "bites", available: true, prepMins: 12, quick: false, veg: false, vibes: ["party"], modifiers: spice, mysteryEligible: true, mysteryReason: "Under-ordered gem the chef wants you to try." },
  { key: "banana", name: "Banana Chips & Podi Nuts", description: "Low-mess, keyboard-safe crunch.", price: 140, category: "bites", image: "bites", available: true, prepMins: 2, quick: true, veg: true, vibes: ["focus"] },
  { key: "burger", name: "Smash Burger", description: "Double smashed patty, cheddar, pickled onion.", price: 420, category: "mains", image: "beer", available: true, prepMins: 15, quick: false, veg: false, vibes: ["party", "date"], modifiers: [{ id: "cheese", name: "Extra cheese", price: 60 }, { id: "egg", name: "Fried egg", price: 40 }] },
  { key: "biryani", name: "Donne Biryani Bowl", description: "Bangalore-style green biryani, raita.", price: 380, category: "mains", image: "bites", available: false, prepMins: 18, quick: false, veg: false, vibes: ["chill"] },
  { key: "ipa", name: "Hazy Silk Board IPA", description: "6.5% · Mango, citrus, soft bitterness.", price: 390, category: "beer", image: "beer", available: true, prepMins: 2, quick: false, veg: true, vibes: ["party", "chill"], mysteryEligible: true, mysteryReason: "Brewer's pick this week — juicy and hazy.", isNew: true },
  { key: "wit", name: "Cubbon Wit", description: "4.8% · Coriander, orange peel, cloudy.", price: 340, category: "beer", image: "beer", available: true, prepMins: 2, quick: false, veg: true, vibes: ["date", "chill"] },
  { key: "stout", name: "Monsoon Coffee Stout", description: "7% · Roasty, local coffee, velvety.", price: 420, category: "beer", image: "beer", available: true, prepMins: 2, quick: false, veg: true, vibes: ["date"], mysteryEligible: true, mysteryReason: "Brewed with our own cold brew beans." },
  { key: "brownie", name: "Filter Coffee Brownie", description: "Fudgy, warm, vanilla scoop.", price: 210, category: "desserts", image: "coffee", available: true, prepMins: 6, quick: true, veg: true, vibes: ["date", "chill"], mysteryEligible: true, mysteryReason: "Sweet finish nobody regrets." },
];

function build(venueId: string, seeds: Seed[], priceDelta = 0): MenuItem[] {
  return seeds.map(({ key, ...s }) => ({
    modifiers: [],
    vibes: [],
    mysteryReason: "",
    mysteryEligible: false,
    ...s,
    price: s.price + priceDelta,
    id: `${venueId}-${key}`,
    venueId,
  }));
}

export function seedState() {
  const venues: Venue[] = [
    { id: "v1", slug: "neon-taproom", name: "Neon Taproom", kind: "Brewery", area: "Indiranagar, Bengaluru", tagline: "Small-batch taps. Big-batch fun." },
    { id: "v2", slug: "brew-and-bloom", name: "Brew & Bloom", kind: "Cafe", area: "Koramangala, Bengaluru", tagline: "Specialty coffee for the WFH crowd." },
  ];
  const menu = [
    ...build("v1", taproom),
    ...build("v2", taproom.filter((s) => s.category !== "beer"), -20),
  ];
  const tables: Table[] = [
    ...Array.from({ length: 14 }, (_, i) => ({ id: `v1-t${i + 1}`, venueId: "v1", number: i + 1, seats: i % 3 === 0 ? 6 : 4 })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `v2-t${i + 1}`, venueId: "v2", number: i + 1, seats: 2 })),
  ];
  const config = (v: string): VenueConfig => ({
    quick: { categories: ["coffee", "cold-brew", "bites", "desserts"], maxPrepMins: 7 },
    campaigns: [
      { id: `${v}-rain`, condition: "rainy", title: "Monsoon Warm-up", message: "Rainy outside? Warm up with filter coffee.", itemIds: [`${v}-filter`, `${v}-flat`, `${v}-brownie`], pct: 10, durationMin: 30, maxRedemptions: 50, redeemed: 4, enabled: true },
      { id: `${v}-hot`, condition: "hot", title: "Heatwave Chill", message: "Scorching out there? Cool down with cold brew.", itemIds: [`${v}-coldbrew`, `${v}-tonic`], pct: 15, durationMin: 45, maxRedemptions: 40, redeemed: 0, enabled: true },
    ],
    mystery: { enabled: true, rewardItemId: `${v}-fries`, maxRedemptions: 100, redeemed: 12 },
    loyalty: { enabled: true, stampsNeeded: 5, minSpend: 150, rewardItemId: `${v}-coldbrew`, rewardExpiryDays: 30 },
  });

  const loyalty: Record<string, LoyaltyAccount> = {
    [`v1:${DEMO_PHONE}`]: { venueId: "v1", phone: DEMO_PHONE, name: "Demo Customer", stamps: 3, stampedOrderIds: ["seed-a", "seed-b", "seed-c"], rewards: [], demo: true },
  };

  // Deterministic history for analytics (14 days).
  const orders: Order[] = [];
  const names = ["filter", "coldbrew", "fries", "ipa", "paneer", "burger", "wit", "flat", "brownie", "stout"];
  for (let d = 13; d >= 0; d--) {
    const count = 6 + ((d * 5) % 7);
    for (let k = 0; k < count; k++) {
      const a = names[(d + k) % names.length];
      const b = names[(d * 3 + k * 2) % names.length];
      const venueId = k % 4 === 3 ? "v2" : "v1";
      const ia = menu.find((m) => m.id === `${venueId}-${a}`) ?? menu.find((m) => m.id === `${venueId}-filter`)!;
      const ib = menu.find((m) => m.id === `${venueId}-${b}`) ?? menu.find((m) => m.id === `${venueId}-fries`)!;
      const subtotal = (ia.price + ib.price * (1 + (k % 2))) * 100;
      const tax = Math.round(subtotal * 0.05);
      orders.push({
        id: `h-${d}-${k}`,
        venueId,
        table: 1 + ((d + k) % 12),
        lines: [
          { lineId: "a", itemId: ia.id, qty: 1, modifierIds: [] },
          { lineId: "b", itemId: ib.id, qty: 1 + (k % 2), modifierIds: [] },
        ],
        subtotal,
        discount: 0,
        tax,
        total: subtotal + tax,
        discounts: [],
        freebies: [],
        status: "served",
        payment: "paid_at_counter",
        createdAt: BASE - d * 86400000 - k * 1800000,
        phone: k % 3 === 0 ? `+91 9${(d + k) % 4}000 1000${k % 3}` : undefined,
        demo: true,
      });
    }
  }
  // Live orders on the floor right now.
  orders.push(
    { id: "live-1", venueId: "v1", table: 4, lines: [{ lineId: "x", itemId: "v1-ipa", qty: 2, modifierIds: [] }, { lineId: "y", itemId: "v1-paneer", qty: 1, modifierIds: [] }], subtotal: 107000, discount: 0, tax: 5350, total: 112350, discounts: [], freebies: [], status: "preparing", payment: "unpaid", createdAt: BASE + 600000, demo: true },
    { id: "live-2", venueId: "v1", table: 9, lines: [{ lineId: "x", itemId: "v1-coldbrew", qty: 1, modifierIds: [], owner: "Priya" }, { lineId: "y", itemId: "v1-burger", qty: 1, modifierIds: [], owner: "Arjun" }, { lineId: "z", itemId: "v1-fries", qty: 1, modifierIds: [], owner: "Arjun" }], subtotal: 82000, discount: 0, tax: 4100, total: 86100, discounts: [], freebies: [], status: "placed", payment: "requested", createdAt: BASE + 900000, squadCode: "SQ-DEMO", participants: ["Priya", "Arjun"], demo: true },
  );

  return {
    venues,
    menu,
    tables,
    configs: { v1: config("v1"), v2: config("v2") } as Record<string, VenueConfig>,
    orders,
    loyalty,
    squads: {} as Record<string, Squad>,
  };
}

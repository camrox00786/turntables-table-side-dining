export type Category = "coffee" | "cold-brew" | "bites" | "mains" | "beer" | "desserts";
export type Vibe = "focus" | "chill" | "party" | "date";
export type Weather = "sunny" | "rainy" | "hot";
export type ImageKey = "coffee" | "bites" | "beer" | "hero";

export interface Modifier {
  id: string;
  name: string;
  price: number; // rupees
}

export interface MenuItem {
  id: string;
  venueId: string;
  name: string;
  description: string;
  price: number; // rupees
  category: Category;
  image: ImageKey;
  available: boolean;
  prepMins: number; // estimate only
  quick: boolean;
  veg: boolean;
  vibes: Vibe[];
  mysteryEligible: boolean;
  mysteryReason: string;
  isNew?: boolean;
  modifiers: Modifier[];
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  kind: "Brewery" | "Cafe" | "Restaurant";
  area: string;
  tagline: string;
}

export interface Table {
  id: string;
  venueId: string;
  number: number;
  seats: number;
}

export interface Campaign {
  id: string;
  condition: Weather;
  title: string;
  message: string;
  itemIds: string[];
  pct: number;
  durationMin: number;
  maxRedemptions: number;
  redeemed: number;
  enabled: boolean;
}

export interface MysteryConfig {
  enabled: boolean;
  rewardItemId: string; // free side given when a mystery pick is ordered
  maxRedemptions: number;
  redeemed: number;
}

export interface LoyaltyConfig {
  enabled: boolean;
  stampsNeeded: number;
  minSpend: number; // rupees, order total needed to earn a stamp
  rewardItemId: string;
  rewardExpiryDays: number;
}

export interface QuickConfig {
  categories: Category[];
  maxPrepMins: number;
}

export interface VenueConfig {
  quick: QuickConfig;
  campaigns: Campaign[];
  mystery: MysteryConfig;
  loyalty: LoyaltyConfig;
}

export interface CartLine {
  lineId: string;
  itemId: string;
  qty: number;
  modifierIds: string[];
  owner?: string; // SquadTab participant
  source?: "mystery" | "monsoon" | "quick";
}

export type OrderStatus = "placed" | "preparing" | "ready" | "served" | "cancelled";
export type PaymentStatus = "unpaid" | "requested" | "paid_at_counter";

export interface Order {
  id: string;
  venueId: string;
  table: number;
  lines: CartLine[];
  subtotal: number; // paise
  discount: number; // paise
  tax: number; // paise
  total: number; // paise
  discounts: { label: string; amount: number }[];
  freebies: string[];
  status: OrderStatus;
  payment: PaymentStatus;
  createdAt: number;
  phone?: string;
  squadCode?: string;
  participants?: string[];
  campaignId?: string;
  usedMysteryReward?: boolean;
  usedLoyaltyReward?: boolean;
  demo?: boolean;
}

export interface LoyaltyReward {
  id: string;
  itemId: string;
  unlockedAt: number;
  expiresAt: number;
  redeemedAt?: number;
  orderId?: string;
}

export interface LoyaltyAccount {
  venueId: string;
  phone: string;
  name: string;
  stamps: number;
  stampedOrderIds: string[];
  rewards: LoyaltyReward[];
  demo?: boolean;
}

export interface Squad {
  code: string;
  venueId: string;
  table: number;
  participants: string[];
  createdAt: number;
}

export interface ActiveOffer {
  campaignId: string;
  expiresAt: number;
}

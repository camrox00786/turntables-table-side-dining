import { requireSupabaseClient } from "../supabase";

export type BranchMenuItem = {
  id: string;
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price_minor: number;
  available: boolean;
  prep_minutes: number | null;
  vegetarian: boolean;
};

export type BranchMenuCategory = {
  id: string;
  branch_id: string;
  name: string;
  sort_order: number;
};

export type DiningSessionSummary = {
  id: string;
  branch_id: string;
  table_id: string;
  status: "open" | "checkout" | "closed";
};

export type BillSummary = {
  id: string;
  dining_session_id: string;
  total_minor: number;
  paid_minor: number;
  outstanding_minor: number;
  status: string;
};

/**
 * Production reads use Supabase RLS. Customer-facing joins and order creation
 * must be implemented as narrow server-side RPCs/Edge Functions before exposing
 * writes to an anonymous browser session.
 */
export async function loadBranchMenu(branchId: string) {
  const supabase = requireSupabaseClient();
  const [categories, items] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, branch_id, name, sort_order")
      .eq("branch_id", branchId)
      .eq("status", "active")
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, branch_id, category_id, name, description, image_url, price_minor, available, prep_minutes, vegetarian",
      )
      .eq("branch_id", branchId)
      .eq("status", "active")
      .eq("available", true),
  ]);

  if (categories.error) throw categories.error;
  if (items.error) throw items.error;
  return {
    categories: categories.data as BranchMenuCategory[],
    items: items.data as BranchMenuItem[],
  };
}

export async function loadDiningSession(sessionId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("dining_sessions")
    .select("id, branch_id, table_id, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as DiningSessionSummary | null;
}

export async function loadBillForSession(sessionId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, dining_session_id, total_minor, paid_minor, outstanding_minor, status")
    .eq("dining_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as BillSummary | null;
}

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

export type ProductionBranch = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
};

export type ProductionRestaurant = {
  id: string;
  name: string;
  slug: string;
};

export type ProductionDiningTable = {
  id: string;
  branch_id: string;
  table_number: number;
  display_name: string | null;
  seats: number;
  status: "active" | "inactive" | "archived";
};

export type MenuItemInput = {
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price_minor: number;
  available: boolean;
  prep_minutes: number;
  vegetarian: boolean;
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

export type CustomerSessionContext = {
  session_id: string;
  member_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  branch_id: string;
  branch_name: string;
  branch_slug: string;
  table_id: string;
  table_number: number;
  currency: string;
};

export type CustomerCartLine = {
  id: string;
  menu_item_id: string;
  variant_id: string | null;
  modifier_ids: string[];
  quantity: number;
  name: string;
  price_minor: number;
  available: boolean;
};

export async function signInOwner(email: string, password: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUpOwner(email: string, password: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutOwner() {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function bootstrapOwner(input: {
  restaurantName: string;
  restaurantSlug: string;
  branchName: string;
  branchSlug: string;
  timezone?: string;
  currency?: string;
}) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("bootstrap_restaurant_owner", {
    p_restaurant_name: input.restaurantName,
    p_restaurant_slug: input.restaurantSlug,
    p_branch_name: input.branchName,
    p_branch_slug: input.branchSlug,
    p_timezone: input.timezone ?? "Asia/Kolkata",
    p_currency: input.currency ?? "INR",
  });
  if (error) throw error;
  return data as {
    restaurant_id: string;
    branch_id: string;
    restaurant_name: string;
    branch_name: string;
    branch_slug: string;
  };
}

export async function loadOwnerBranches() {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, restaurant_id, name, slug, timezone, currency, restaurants!inner(id, name, slug)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
    return {
      branch: {
        id: row.id,
        restaurant_id: row.restaurant_id,
        name: row.name,
        slug: row.slug,
        timezone: row.timezone,
        currency: row.currency,
      } satisfies ProductionBranch,
      restaurant: restaurant as ProductionRestaurant,
    };
  });
}

export async function loadBranchTables(branchId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .select("id, branch_id, table_number, display_name, seats, status")
    .eq("branch_id", branchId)
    .neq("status", "archived")
    .order("table_number");
  if (error) throw error;
  return (data ?? []) as ProductionDiningTable[];
}

export async function createDiningTable(input: {
  branch_id: string;
  table_number: number;
  display_name?: string;
  seats: number;
}) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("dining_tables")
    .insert({
      branch_id: input.branch_id,
      table_number: input.table_number,
      display_name: input.display_name?.trim() || null,
      seats: input.seats,
      status: "active",
    })
    .select("id, branch_id, table_number, display_name, seats, status")
    .single();
  if (error) throw error;
  return data as ProductionDiningTable;
}

export async function updateDiningTable(
  id: string,
  input: Partial<Pick<ProductionDiningTable, "table_number" | "display_name" | "seats" | "status">>,
) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from("dining_tables")
    .update({
      ...input,
      ...(input.display_name !== undefined
        ? { display_name: input.display_name?.trim() || null }
        : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function loadEditableMenu(branchId: string) {
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
        "id, branch_id, category_id, name, description, price_minor, available, prep_minutes, vegetarian, menu_item_variants(id, name, price_minor, status), menu_item_modifiers(id, name, price_minor, status)",
      )
      .eq("branch_id", branchId)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
  ]);
  if (categories.error) throw categories.error;
  if (items.error) throw items.error;
  return { categories: (categories.data ?? []) as BranchMenuCategory[], items: items.data ?? [] };
}

export async function createMenuCategory(branchId: string, name: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .insert({ branch_id: branchId, name: name.trim(), sort_order: 0 })
    .select("id, branch_id, name, sort_order")
    .single();
  if (error) throw error;
  return data as BranchMenuCategory;
}

export async function updateMenuCategory(id: string, name: string) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function archiveMenuCategory(id: string) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw error;
}

export async function createMenuItem(input: MenuItemInput) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from("menu_items").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateMenuItem(id: string, input: Partial<MenuItemInput>) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("menu_items").update(input).eq("id", id);
  if (error) throw error;
}

export async function archiveMenuItem(id: string) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("menu_items").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}

export async function createMenuModifier(menuItemId: string, name: string, priceMinor: number) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from("menu_item_modifiers")
    .insert({ menu_item_id: menuItemId, name: name.trim(), price_minor: priceMinor });
  if (error) throw error;
}

export async function updateMenuModifier(
  id: string,
  input: { name?: string; price_minor?: number; status?: "active" | "inactive" | "archived" },
) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("menu_item_modifiers").update(input).eq("id", id);
  if (error) throw error;
}

export async function createMenuVariant(menuItemId: string, name: string, priceMinor: number) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from("menu_item_variants")
    .insert({ menu_item_id: menuItemId, name: name.trim(), price_minor: priceMinor });
  if (error) throw error;
}

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

export async function loadPublishedMenu(slug: string) {
  const supabase = requireSupabaseClient();
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (restaurantError) throw restaurantError;
  if (!restaurant) return null;
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, restaurant_id, name, slug, timezone, currency")
    .eq("restaurant_id", restaurant.id)
    .eq("status", "active")
    .order("name");
  if (branchError) throw branchError;
  const branch = branches?.[0];
  if (!branch) return null;
  return {
    restaurant: restaurant as ProductionRestaurant,
    branch: branch as ProductionBranch,
    ...(await loadBranchMenu(branch.id)),
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

export async function openCustomerSession(input: {
  restaurantSlug: string;
  branchSlug?: string;
  tableNumber: number;
  customerToken: string;
  displayName?: string;
}) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("open_customer_session", {
    p_restaurant_slug: input.restaurantSlug,
    p_branch_slug: input.branchSlug ?? null,
    p_table_number: input.tableNumber,
    p_customer_token: input.customerToken,
    p_display_name: input.displayName ?? null,
  });
  if (error) throw error;
  return data as CustomerSessionContext;
}

export async function loadCustomerCart(customerToken: string, sessionId: string) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("get_customer_cart", {
    p_customer_token: customerToken,
    p_session_id: sessionId,
  });
  if (error) throw error;
  return (data ?? []) as CustomerCartLine[];
}

export async function addCustomerCartItem(input: {
  customerToken: string;
  sessionId: string;
  menuItemId: string;
  quantity?: number;
  variantId?: string;
  modifierIds?: string[];
}) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("add_customer_cart_item", {
    p_customer_token: input.customerToken,
    p_session_id: input.sessionId,
    p_menu_item_id: input.menuItemId,
    p_quantity: input.quantity ?? 1,
    p_variant_id: input.variantId ?? null,
    p_modifier_ids: input.modifierIds ?? [],
  });
  if (error) throw error;
  return (data ?? []) as CustomerCartLine[];
}

export async function placeCustomerOrder(
  customerToken: string,
  sessionId: string,
  idempotencyKey: string,
) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.rpc("place_customer_order", {
    p_customer_token: customerToken,
    p_session_id: sessionId,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data as {
    order_id: string;
    order_number: number;
    status: string;
    total_minor?: number;
    currency?: string;
  };
}

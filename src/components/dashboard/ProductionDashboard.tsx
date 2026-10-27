import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Btn, Card } from "@/components/kit";
import {
  archiveMenuItem,
  bootstrapOwner,
  createMenuCategory,
  createMenuItem,
  createMenuModifier,
  loadEditableMenu,
  loadOwnerBranches,
  signInOwner,
  signOutOwner,
  signUpOwner,
  updateMenuItem,
  type BranchMenuCategory,
} from "@/lib/backend/turntables-service";
import { dataMode, getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const inputCls = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

type BranchChoice = Awaited<ReturnType<typeof loadOwnerBranches>>[number];
type MenuData = Awaited<ReturnType<typeof loadEditableMenu>>;
type MenuItemRow = MenuData["items"][number];

export function ProductionDashboard() {
  const client = getSupabaseClient();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [branches, setBranches] = useState<BranchChoice[]>([]);
  const [branchId, setBranchId] = useState("");
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(false);

  async function refreshBranches() {
    const next = await loadOwnerBranches();
    setBranches(next);
    setBranchId((current) => current || next[0]?.branch.id || "");
  }

  useEffect(() => {
    if (!client) {
      setAuthLoading(false);
      return;
    }
    client.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
      setAuthLoading(false);
      if (data.session) refreshBranches().catch((error) => toast.error(error.message));
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      setSessionEmail(next?.user.email ?? null);
      if (next) refreshBranches().catch((error) => toast.error(error.message));
      else {
        setBranches([]);
        setMenu(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!branchId || !sessionEmail) return;
    setLoading(true);
    loadEditableMenu(branchId)
      .then(setMenu)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [branchId, sessionEmail]);

  if (!isSupabaseConfigured || dataMode !== "supabase") {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          Supabase mode is disabled. Set <code>VITE_TURNTABLES_DATA_MODE=supabase</code> and the
          public Supabase variables to use the real dashboard.
        </p>
      </Card>
    );
  }
  if (authLoading)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Checking your owner session…</p>
      </Card>
    );
  if (!sessionEmail) return <OwnerAuth onAuthenticated={setSessionEmail} />;
  if (branches.length === 0) return <BootstrapOwner onComplete={refreshBranches} />;

  const selected = branches.find((x) => x.branch.id === branchId) ?? branches[0]!;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Production workspace
          </p>
          <h1 className="text-3xl font-black">{selected.restaurant.name}</h1>
          <p className="text-sm text-muted-foreground">Signed in as {sessionEmail}</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-muted-foreground">
            Branch
            <select
              className={`${inputCls} mt-1 block min-w-48`}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((x) => (
                <option key={x.branch.id} value={x.branch.id}>
                  {x.branch.name}
                </option>
              ))}
            </select>
          </label>
          <Btn
            variant="ghost"
            onClick={() => signOutOwner().catch((error) => toast.error(error.message))}
          >
            Sign out
          </Btn>
        </div>
      </div>
      {loading || !menu ? (
        <Card>
          <p className="text-sm text-muted-foreground">Loading persisted menu…</p>
        </Card>
      ) : (
        <ProductionMenuEditor
          branchId={branchId}
          menu={menu}
          onRefresh={() => loadEditableMenu(branchId).then(setMenu)}
        />
      )}
    </div>
  );
}

function OwnerAuth({ onAuthenticated }: { onAuthenticated: (email: string) => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const session = signup
        ? await signUpOwner(email, password)
        : await signInOwner(email, password);
      if (session) onAuthenticated(email);
      else toast.success("Check your email to confirm the account, then sign in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="max-w-lg">
      <h2 className="text-xl font-bold">{signup ? "Create owner account" : "Owner sign in"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Production data is protected by Supabase Auth and RLS.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          required
          type="email"
          autoComplete="email"
          placeholder="Owner email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputCls} w-full`}
        />
        <input
          required
          minLength={8}
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputCls} w-full`}
        />
        <Btn type="submit" disabled={busy}>
          {busy ? "Working…" : signup ? "Create account" : "Sign in"}
        </Btn>
      </form>
      <button className="mt-4 text-sm text-primary underline" onClick={() => setSignup((v) => !v)}>
        {signup ? "Already have an account? Sign in" : "First time? Create an owner account"}
      </button>
    </Card>
  );
}

function BootstrapOwner({ onComplete }: { onComplete: () => Promise<void> }) {
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantSlug, setRestaurantSlug] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrapOwner({ restaurantName, restaurantSlug, branchName, branchSlug });
      toast.success("Restaurant and branch created");
      await onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bootstrap failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="max-w-2xl">
      <h2 className="text-xl font-bold">Set up your restaurant</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This creates the first restaurant owner membership through a protected server-side RPC.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Restaurant name"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          className={inputCls}
        />
        <input
          required
          placeholder="Restaurant slug"
          value={restaurantSlug}
          onChange={(e) => setRestaurantSlug(e.target.value)}
          className={inputCls}
        />
        <input
          required
          placeholder="Branch name"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          className={inputCls}
        />
        <input
          required
          placeholder="Branch slug"
          value={branchSlug}
          onChange={(e) => setBranchSlug(e.target.value)}
          className={inputCls}
        />
        <div className="sm:col-span-2">
          <Btn type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create restaurant"}
          </Btn>
        </div>
      </form>
    </Card>
  );
}

function ProductionMenuEditor({
  branchId,
  menu,
  onRefresh,
}: {
  branchId: string;
  menu: MenuData;
  onRefresh: () => Promise<void>;
}) {
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("250");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const categories = useMemo(() => menu.categories, [menu.categories]);
  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    try {
      await createMenuCategory(branchId, categoryName);
      setCategoryName("");
      await onRefresh();
      toast.success("Category saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category");
    } finally {
      setBusy(false);
    }
  }
  async function addItem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createMenuItem({
        branch_id: branchId,
        category_id: categoryId || null,
        name: itemName.trim(),
        description: itemDescription.trim(),
        price_minor: Math.round(Number(itemPrice) * 100),
        available: true,
        prep_minutes: 15,
        vegetarian: true,
      });
      setItemName("");
      setItemDescription("");
      await onRefresh();
      toast.success("Menu item saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Menu categories</h2>
          <form onSubmit={addCategory} className="mt-3 flex gap-2">
            <input
              required
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className={`${inputCls} min-w-0 flex-1`}
            />
            <Btn type="submit" disabled={busy}>
              Add
            </Btn>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {category.name}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Add menu item</h2>
          <form onSubmit={addItem} className="mt-3 space-y-2">
            <input
              required
              placeholder="Item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className={`${inputCls} w-full`}
            />
            <textarea
              required
              placeholder="Description"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                aria-label="Price in rupees"
                placeholder="Price ₹"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className={inputCls}
              />
              <select
                aria-label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputCls}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Btn type="submit" disabled={busy || !itemName.trim()}>
              Save item
            </Btn>
          </form>
        </Card>
      </div>
      <Card>
        <h2 className="font-bold">Persisted menu items</h2>
        <div className="mt-3 space-y-3">
          {menu.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No production items yet.</p>
          )}
          {menu.items.map((item) => (
            <ProductionItemRow
              key={item.id}
              item={item}
              categories={categories}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProductionItemRow({
  item,
  categories,
  onRefresh,
}: {
  item: MenuItemRow;
  categories: BranchMenuCategory[];
  onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price_minor / 100));
  const [description, setDescription] = useState(item.description ?? "");
  const [available, setAvailable] = useState(item.available);
  const category = categories.find((x) => x.id === item.category_id)?.name ?? "Uncategorized";
  async function save() {
    try {
      await updateMenuItem(item.id, {
        name,
        description,
        price_minor: Math.round(Number(price) * 100),
        available,
      });
      await onRefresh();
      toast.success("Item updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item");
    }
  }
  async function archive() {
    try {
      await archiveMenuItem(item.id);
      await onRefresh();
      toast.success("Item archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive item");
    }
  }
  async function addModifier() {
    const modifierName = window.prompt("Modifier name");
    if (!modifierName) return;
    const raw = window.prompt("Modifier price in rupees", "0");
    await createMenuModifier(item.id, modifierName, Math.round(Number(raw ?? 0) * 100));
    await onRefresh();
  }
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_7rem_1fr_auto] md:items-center">
        <input
          aria-label={`Name of ${item.name}`}
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label={`Price of ${item.name}`}
          type="number"
          min="0"
          step="0.01"
          className={inputCls}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          aria-label={`Description of ${item.name}`}
          className={inputCls}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />{" "}
          Available
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{category}</span>
        {(item.menu_item_modifiers ?? [])
          .filter((x: { status: string }) => x.status === "active")
          .map((modifier: { id: string; name: string; price_minor: number }) => (
            <span key={modifier.id} className="rounded-full bg-secondary px-2 py-1">
              {modifier.name} +₹{modifier.price_minor / 100}
            </span>
          ))}
        <button className="text-primary underline" onClick={addModifier}>
          Add modifier
        </button>
        <span className="ml-auto flex gap-2">
          <Btn size="sm" onClick={save}>
            Save
          </Btn>
          <Btn size="sm" variant="danger" onClick={archive}>
            Archive
          </Btn>
        </span>
      </div>
    </div>
  );
}

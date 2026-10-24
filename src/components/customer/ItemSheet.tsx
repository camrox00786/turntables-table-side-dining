import { useEffect, useState } from "react";
import { Minus, Plus, Clock } from "lucide-react";
import { Btn, Sheet } from "@/components/kit";
import { IMAGES } from "@/lib/images";
import { formatINR, unitPrice } from "@/lib/pricing";
import type { MenuItem } from "@/lib/types";

export function ItemSheet({
  item,
  onClose,
  onAdd,
  discountPct,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (mods: string[], qty: number) => void;
  discountPct?: number;
}) {
  const [mods, setMods] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  useEffect(() => {
    setMods([]);
    setQty(1);
  }, [item?.id]);
  if (!item) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;
  const total = unitPrice(item, mods) * qty;
  return (
    <Sheet open={!!item} onClose={onClose} title={item.name}>
      <img src={IMAGES[item.image]} alt={item.name} className="mb-4 aspect-video w-full rounded-2xl object-cover" />
      <p className="text-muted-foreground">{item.description}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> ~{item.prepMins} min prep (estimate, not a guarantee)
      </p>
      {item.modifiers.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold">Customise</p>
          {item.modifiers.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={mods.includes(m.id)}
                  onChange={(e) => setMods((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                />
                {m.name}
              </span>
              <span className="text-sm text-muted-foreground">{m.price ? `+${formatINR(m.price * 100)}` : "Free"}</span>
            </label>
          ))}
        </div>
      )}
      {discountPct ? <p className="mt-3 text-sm text-accent">{discountPct}% weather offer applies at checkout</p> : null}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-full bg-secondary p-1">
          <button aria-label="Decrease quantity" className="rounded-full p-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-5 text-center font-bold">{qty}</span>
          <button aria-label="Increase quantity" className="rounded-full p-2" onClick={() => setQty((q) => q + 1)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Btn size="lg" className="flex-1" disabled={!item.available} onClick={() => onAdd(mods, qty)}>
          {item.available ? `Add · ${formatINR(total)}` : "Sold out"}
        </Btn>
      </div>
    </Sheet>
  );
}

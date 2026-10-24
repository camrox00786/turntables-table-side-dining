import { useState } from "react";
import { Copy, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Btn, Sheet, SimBadge } from "@/components/kit";
import { formatINR, unitPrice } from "@/lib/pricing";
import { cartKey } from "@/lib/store";
import type { TableCtx } from "./useTable";

export function SquadSheet({ ctx, open, onClose, initialCode }: { ctx: TableCtx; open: boolean; onClose: () => void; initialCode?: string }) {
  const { venue, squad, set, state, menu, lines } = ctx;
  const [name, setName] = useState(state.customer.myName ?? "");
  const [code, setCode] = useState(initialCode ?? "");
  if (!venue) return null;
  const tableNo = ctx.table?.number ?? 0;
  const link = squad && typeof window !== "undefined" ? `${window.location.origin}/v/${venue.slug}/t/${tableNo}?squad=${squad.code}` : "";

  function create() {
    if (!name.trim()) return toast.error("Pick a display name first");
    const newCode = "SQ-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    set((d) => {
      d.squads[newCode] = { code: newCode, venueId: venue!.id, table: tableNo, participants: [name.trim()], createdAt: Date.now() };
      d.customer.squadCode = newCode;
      d.customer.myName = name.trim();
      const solo = d.carts[cartKey(venue!.id, tableNo)] ?? [];
      d.carts[`squad:${newCode}`] = solo.map((l) => ({ ...l, owner: name.trim() }));
      d.carts[cartKey(venue!.id, tableNo)] = [];
    });
    toast.success(`SquadTab ${newCode} started`);
  }
  function join() {
    const c = code.trim().toUpperCase();
    const s = state.squads[c];
    if (!name.trim()) return toast.error("Pick a display name first");
    if (!s || s.venueId !== venue!.id || s.table !== tableNo) return toast.error("No SquadTab with that code at this table");
    set((d) => {
      if (!d.squads[c].participants.includes(name.trim())) d.squads[c].participants.push(name.trim());
      d.customer.squadCode = c;
      d.customer.myName = name.trim();
    });
  }
  function addDemoFriends() {
    const friends = [
      { n: "Priya", item: `${venue!.id}-coldbrew` },
      { n: "Arjun", item: `${venue!.id}-paneer` },
    ];
    set((d) => {
      const sq = d.squads[squad!.code];
      friends.forEach((f) => {
        if (!sq.participants.includes(f.n)) sq.participants.push(f.n);
      });
    });
    friends.forEach((f) => ctx.actions.addItem(f.item, [], 1, undefined, f.n));
  }
  function leave() {
    set((d) => {
      d.customer.squadCode = undefined;
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="SquadTab">
      {!squad ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Order individually, share one table tab, and split the bill your way.</p>
          <input
            aria-label="Your display name"
            className="h-11 w-full rounded-xl border border-input bg-background px-3"
            placeholder="Your display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Btn size="lg" className="w-full" onClick={create}><Users className="h-5 w-5" /> Start a SquadTab for Table {tableNo}</Btn>
          <div className="flex gap-2">
            <input aria-label="Session code" className="h-10 flex-1 rounded-xl border border-input bg-background px-3 uppercase" placeholder="SQ-XXXX" value={code} onChange={(e) => setCode(e.target.value)} />
            <Btn variant="ghost" onClick={join}>Join</Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-xs text-muted-foreground">Session code</p>
            <p className="font-display text-3xl font-black text-primary">{squad.code}</p>
            <button
              className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success("Invite link copied"), () => toast.error("Couldn't copy — share the code instead"))}
            >
              <Copy className="h-4 w-4" /> Copy invite link
            </button>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Who's in</p>
              <Btn size="sm" variant="outline" onClick={addDemoFriends}><UserPlus className="h-3.5 w-3.5" /> Add demo friends</Btn>
            </div>
            <SimBadge>Demo: friends are simulated on this device, not live-synced</SimBadge>
            <ul className="mt-3 space-y-2">
              {squad.participants.map((p) => {
                const mine = lines.filter((l) => l.owner === p);
                const sub = mine.reduce((a, l) => {
                  const it = menu.find((m) => m.id === l.itemId);
                  return it ? a + unitPrice(it, l.modifierIds) * l.qty : a;
                }, 0);
                return (
                  <li key={p} className="rounded-xl border border-border p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{p}{p === state.customer.myName && <span className="text-primary"> (you)</span>}</span>
                      <span className="tabular-nums">{formatINR(sub)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{mine.map((l) => `${l.qty}× ${menu.find((m) => m.id === l.itemId)?.name}`).join(", ") || "Nothing yet"}</p>
                  </li>
                );
              })}
            </ul>
          </div>
          <Btn variant="ghost" className="w-full" onClick={leave}>Leave SquadTab</Btn>
        </div>
      )}
    </Sheet>
  );
}

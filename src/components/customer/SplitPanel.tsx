import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Btn, Pill, SimBadge } from "@/components/kit";
import { customSplit, equalSplit, formatINR, itemSplit } from "@/lib/pricing";
import type { CartLine, MenuItem } from "@/lib/types";

export function SplitPanel({
  lines,
  menu,
  participants,
  total,
  venueName,
  table,
  onRequest,
}: {
  lines: CartLine[];
  menu: MenuItem[];
  participants: string[];
  total: number;
  venueName: string;
  table: number;
  onRequest?: () => void;
}) {
  const [mode, setMode] = useState<"equal" | "item" | "custom">("item");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [requested, setRequested] = useState(false);

  const rows =
    mode === "equal"
      ? equalSplit(total, participants.length).map((share, i) => ({ name: participants[i], share }))
      : mode === "item"
        ? itemSplit(lines, menu, participants, total)
        : participants.map((name) => ({ name, share: Math.round(parseFloat(custom[name] || "0") * 100) || 0 }));
  const { assigned, outstanding } = customSplit(rows.map((r) => r.share), total);

  const message =
    `Turntables · ${venueName} · Table ${table}\nSplit request (${mode === "item" ? "by items" : mode}):\n` +
    rows.map((r) => `• ${r.name}: ${formatINR(r.share)}`).join("\n") +
    `\nTotal ${formatINR(total)} (incl. 5% GST). Please pay at the counter or via your usual UPI app.`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg font-bold">Split the tab</p>
        <span className="text-xs text-muted-foreground">{participants.length} people</span>
      </div>
      <div className="mb-3 flex gap-2">
        <Pill active={mode === "item"} onClick={() => setMode("item")}>By items</Pill>
        <Pill active={mode === "equal"} onClick={() => setMode("equal")}>Equal</Pill>
        <Pill active={mode === "custom"} onClick={() => setMode("custom")}>Custom</Pill>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{r.name}</span>
            {mode === "custom" ? (
              <input
                aria-label={`Amount for ${r.name}`}
                inputMode="decimal"
                className="w-28 rounded-lg border border-input bg-background px-2 py-1 text-right"
                placeholder="₹0"
                value={custom[r.name] ?? ""}
                onChange={(e) => setCustom((s) => ({ ...s, [r.name]: e.target.value.replace(/[^\d.]/g, "") }))}
              />
            ) : (
              <span className="tabular-nums">{formatINR(r.share)}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span>Assigned {formatINR(assigned)}</span>
        <span className={outstanding === 0 ? "text-success" : "text-accent"} data-testid="outstanding">
          {outstanding === 0 ? "Fully assigned" : outstanding > 0 ? `Outstanding ${formatINR(outstanding)}` : `Over by ${formatINR(-outstanding)}`}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn
          variant="ghost"
          size="sm"
          disabled={outstanding !== 0}
          onClick={() => {
            setRequested(true);
            onRequest?.();
          }}
        >
          Request payment
        </Btn>
        <a
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
        </a>
      </div>
      {requested && (
        <p className="mt-3 text-xs text-muted-foreground">
          <SimBadge className="mr-1">Demo</SimBadge> Payment request prepared. No payment has been received or confirmed — staff will mark it paid at the counter.
        </p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">WhatsApp opens with a prepared message; Turntables does not send it or confirm delivery.</p>
    </div>
  );
}

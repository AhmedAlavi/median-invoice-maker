import type { LineItem } from "../../types";
import { Plus, Trash2, Minus, Plus as PlusIcon } from "lucide-react";

type Props = {
  items: LineItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<LineItem>) => void;
  currencyFmt?: (n: number) => string; // optional, for the per-line total pill
};

export default function ItemsEditor({
  items,
  addItem,
  removeItem,
  updateItem,
  currencyFmt = (n) => String(n),
}: Props) {
  return (
    <>
      <div className="space-y-3">
        {items.map((it) => (
          <ItemCard
            key={it.id}
            item={it}
            onChange={(patch) => updateItem(it.id, patch)}
            onRemove={() => removeItem(it.id)}
            currencyFmt={currencyFmt}
          />
        ))}
      </div>

      {/* Mobile-first: full-width Add button; desktop keeps classic inline button */}
      <div className="mt-3">
        <button
          onClick={addItem}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add line
        </button>
      </div>
    </>
  );
}

function ItemCard({
  item,
  onChange,
  onRemove,
  currencyFmt,
}: {
  item: LineItem;
  onChange: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
  currencyFmt: (n: number) => string;
}) {
  const lineTotal = (item.qty || 0) * (item.price || 0);

  // qty stepper handlers (mobile-friendly)
  const stepQty = (delta: number) => {
    const next = Math.max(0, (item.qty || 0) + delta);
    onChange({ qty: next });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      {/* Top row: Description (full width on mobile; 6/12 on desktop) */}
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 sm:col-span-6">
          <label className="mb-1 block text-xs text-white/60 sm:hidden">
            Description
          </label>
          <input
            className="w-full min-w-0 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Description"
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        {/* Qty – stepper on mobile, plain number on desktop */}
        <div className="col-span-6 sm:col-span-2">
          <label className="mb-1 block text-xs text-white/60 sm:hidden">
            Qty
          </label>
          <div className="flex items-stretch rounded-lg bg-white/10">
            {/* Mobile stepper buttons (hidden on sm+) */}
            <button
              type="button"
              className="inline-flex items-center justify-center px-2 text-white/70 hover:bg-white/10 sm:hidden rounded-lg"
              onClick={() => stepQty(-1)}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-center placeholder:text-center tabular-nums outline-none focus:ring-2 focus:ring-white/30"
              placeholder="0"
              value={item.qty === 0 ? "" : item.qty}
              onChange={(e) =>
                onChange({
                  qty: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
            />
            <button
              type="button"
              className="inline-flex items-center justify-center px-2 text-white/70 hover:bg-white/10 sm:hidden rounded-lg"
              onClick={() => stepQty(1)}
              aria-label="Increase quantity"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Unit price */}
        <div className="col-span-6 sm:col-span-3">
          <label className="mb-1 block text-xs text-white/60 sm:hidden">
            Unit price
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            className="w-full min-w-0 rounded-lg bg-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/30"
            placeholder="0.00"
            value={item.price === 0 ? "" : item.price}
            onChange={(e) =>
              onChange({
                price: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            autoComplete="off"
          />
        </div>

        {/* Remove button (right on desktop; small pill below on mobile) */}
        <div className="col-span-12 flex items-center justify-between sm:col-span-1 sm:block">
          {/* Per-line total pill (mobile-visible; desktop shows in table preview) */}
          <span className="mr-2 inline-flex items-center rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs text-white/80 sm:hidden">
            Item total : {currencyFmt(lineTotal)}
          </span>

          <button
            onClick={onRemove}
            className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-2 px-4 md:px-2 cursor-pointer text-red-300 hover:bg-red-500/20"
            aria-label="Remove line"
            title="Remove line"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

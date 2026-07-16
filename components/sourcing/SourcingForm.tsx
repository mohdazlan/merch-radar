"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { FEE_PRESETS } from "@/lib/fees/presets";
import type { Condition } from "@/lib/ebay/DemandSource";

export type SourcingFormValues = {
  q: string;
  buyCost: number;
  shippingCost: number;
  qty: number;
  condition: Condition;
  presetId: string;
};

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "USED_LIKE_NEW", label: "Used – Like New" },
  { value: "USED_GOOD", label: "Used – Good" },
  { value: "FOR_PARTS", label: "For Parts" },
];

const inputCls =
  "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2 focus:border-accent";
const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2";

export function SourcingForm({
  onAnalyze,
  loading,
  prefill,
}: {
  onAnalyze: (values: SourcingFormValues) => void;
  loading: boolean;
  prefill?: Partial<SourcingFormValues>;
}) {
  const [q, setQ] = useState(prefill?.q ?? "");
  const [buyCost, setBuyCost] = useState(prefill?.buyCost?.toString() ?? "");
  const [shippingCost, setShippingCost] = useState(
    prefill?.shippingCost?.toString() ?? "8.00",
  );
  const [qty, setQty] = useState(prefill?.qty?.toString() ?? "1");
  const [condition, setCondition] = useState<Condition>(
    prefill?.condition ?? "USED_GOOD",
  );
  const [presetId, setPresetId] = useState(prefill?.presetId ?? "ebay");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (q.trim().length < 2) errs.q = "Enter a product name or UPC/EAN.";
    const buy = Number(buyCost);
    if (!Number.isFinite(buy) || buy <= 0)
      errs.buyCost = "Buy cost must be greater than 0.";
    const ship = Number(shippingCost);
    if (!Number.isFinite(ship) || ship < 0)
      errs.shippingCost = "Shipping must be 0 or more.";
    const quantity = Math.floor(Number(qty));
    if (!Number.isFinite(quantity) || quantity < 1)
      errs.qty = "Quantity must be at least 1.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onAnalyze({
      q: q.trim(),
      buyCost: buy,
      shippingCost: ship,
      qty: quantity,
      condition,
      presetId,
    });
  }

  return (
    <form onSubmit={submit} noValidate className="border border-line bg-surface/50 p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="sf-q" className={labelCls}>
            Product name or UPC/EAN
          </label>
          <input
            id="sf-q"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Nintendo Switch OLED Console"
            className={inputCls}
            aria-invalid={Boolean(errors.q)}
            aria-describedby={errors.q ? "sf-q-err" : undefined}
          />
          {errors.q && (
            <p id="sf-q-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.q}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="sf-buy" className={labelCls}>
            Buy cost $
          </label>
          <input
            id="sf-buy"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={buyCost}
            onChange={(e) => setBuyCost(e.target.value)}
            placeholder="0.00"
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.buyCost)}
            aria-describedby={errors.buyCost ? "sf-buy-err" : undefined}
          />
          {errors.buyCost && (
            <p id="sf-buy-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.buyCost}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="sf-ship" className={labelCls}>
            Est. shipping $
          </label>
          <input
            id="sf-ship"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.shippingCost)}
            aria-describedby={errors.shippingCost ? "sf-ship-err" : undefined}
          />
          {errors.shippingCost && (
            <p id="sf-ship-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.shippingCost}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="sf-qty" className={labelCls}>
            Qty
          </label>
          <input
            id="sf-qty"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.qty)}
            aria-describedby={errors.qty ? "sf-qty-err" : undefined}
          />
          {errors.qty && (
            <p id="sf-qty-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.qty}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="sf-cond" className={labelCls}>
            Condition
          </label>
          <select
            id="sf-cond"
            value={condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className={inputCls}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sf-platform" className={labelCls}>
            Target platform
          </label>
          <select
            id="sf-platform"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className={inputCls}
          >
            {Object.values(FEE_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end md:col-span-2 lg:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 border border-accent bg-accent/15 px-6 text-sm font-bold uppercase tracking-wide text-ink hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Analyzing…
              </>
            ) : (
              <>
                <Search size={15} aria-hidden />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

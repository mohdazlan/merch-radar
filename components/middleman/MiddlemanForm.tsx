"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { FEE_PRESETS } from "@/lib/fees/presets";
import {
  DEFAULT_SUPPLIER_CURRENCY,
  FX_SEED_DATE,
  SUPPLIER_CURRENCIES,
  findCurrency,
} from "@/lib/middleman/currencies";

export type MiddlemanFormValues = {
  q: string;
  supplierPrice: number;
  currency: string;
  fxRatePerUsd: number;
  shippingCostUsd: number;
  presetId: string;
  promotedListingPct: number;
  undercutPct: number;
};

const inputCls =
  "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2 focus:border-accent";
const labelCls =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2";

export function MiddlemanForm({
  onAnalyze,
  loading,
}: {
  onAnalyze: (values: MiddlemanFormValues) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [currency, setCurrency] = useState(DEFAULT_SUPPLIER_CURRENCY);
  const [fxRate, setFxRate] = useState<string>(
    String(findCurrency(DEFAULT_SUPPLIER_CURRENCY).seededRatePerUsd),
  );
  const [shippingCostUsd, setShippingCostUsd] = useState("12");
  const [presetId, setPresetId] = useState("ebay");
  const [promotedPct, setPromotedPct] = useState("0");
  const [undercutPct, setUndercutPct] = useState("5");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCurrency = findCurrency(currency);

  function onCurrencyChange(code: string) {
    setCurrency(code);
    // reset the FX rate to the seed for the newly-picked currency, so the
    // operator isn't left holding an obviously-wrong rate from a prior pick
    setFxRate(String(findCurrency(code).seededRatePerUsd));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (q.trim().length < 2)
      errs.q = "Enter a product name or model number to search eBay for.";
    const supplier = Number(supplierPrice);
    if (!Number.isFinite(supplier) || supplier <= 0)
      errs.supplierPrice = "Friend's price must be greater than 0.";
    const fx = Number(fxRate);
    if (!Number.isFinite(fx) || fx <= 0)
      errs.fxRate = "FX rate must be greater than 0.";
    const ship = Number(shippingCostUsd);
    if (!Number.isFinite(ship) || ship < 0)
      errs.shippingCostUsd = "Shipping must be 0 or more.";
    const undercut = Number(undercutPct);
    if (!Number.isFinite(undercut) || undercut < 0 || undercut > 90)
      errs.undercutPct = "Undercut must be between 0 and 90%.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    onAnalyze({
      q: q.trim(),
      supplierPrice: supplier,
      currency,
      fxRatePerUsd: fx,
      shippingCostUsd: ship,
      presetId,
      promotedListingPct: Number(promotedPct) / 100 || 0,
      undercutPct: undercut / 100,
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="border border-line bg-surface/50 p-4"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-4">
          <label htmlFor="mf-q" className={labelCls}>
            Product on eBay (search terms your competitors use)
          </label>
          <input
            id="mf-q"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Tupperware silicone oven glove"
            className={inputCls}
            aria-invalid={Boolean(errors.q)}
            aria-describedby={errors.q ? "mf-q-err" : undefined}
          />
          {errors.q && (
            <p id="mf-q-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.q}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mf-currency" className={labelCls}>
            Supplier currency
          </label>
          <select
            id="mf-currency"
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={inputCls}
          >
            {SUPPLIER_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mf-supplier" className={labelCls}>
            Friend&apos;s price ({selectedCurrency.symbol})
          </label>
          <input
            id="mf-supplier"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={supplierPrice}
            onChange={(e) => setSupplierPrice(e.target.value)}
            placeholder="0.00"
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.supplierPrice)}
            aria-describedby={errors.supplierPrice ? "mf-supplier-err" : undefined}
          />
          {errors.supplierPrice && (
            <p id="mf-supplier-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.supplierPrice}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mf-fx" className={labelCls}>
            FX rate ({selectedCurrency.code} per 1 USD)
          </label>
          <input
            id="mf-fx"
            type="number"
            inputMode="decimal"
            min="0.0001"
            step="0.0001"
            value={fxRate}
            onChange={(e) => setFxRate(e.target.value)}
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.fxRate)}
            aria-describedby="mf-fx-help"
          />
          <p id="mf-fx-help" className="mt-1 text-xs text-ink-2">
            Seeded {FX_SEED_DATE} — override with the rate your bank/PayPal
            actually gives you.
          </p>
        </div>

        <div>
          <label htmlFor="mf-shipping" className={labelCls}>
            International shipping $ (per unit)
          </label>
          <input
            id="mf-shipping"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={shippingCostUsd}
            onChange={(e) => setShippingCostUsd(e.target.value)}
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.shippingCostUsd)}
            aria-describedby={
              errors.shippingCostUsd ? "mf-shipping-err" : undefined
            }
          />
          {errors.shippingCostUsd && (
            <p id="mf-shipping-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.shippingCostUsd}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mf-preset" className={labelCls}>
            Target platform
          </label>
          <select
            id="mf-preset"
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

        <div>
          <label htmlFor="mf-undercut" className={labelCls}>
            Undercut floor by (%)
          </label>
          <input
            id="mf-undercut"
            type="number"
            inputMode="decimal"
            min="0"
            max="90"
            step="0.5"
            value={undercutPct}
            onChange={(e) => setUndercutPct(e.target.value)}
            className={`${inputCls} num`}
            aria-invalid={Boolean(errors.undercutPct)}
            aria-describedby={
              errors.undercutPct ? "mf-undercut-err" : "mf-undercut-help"
            }
          />
          {errors.undercutPct ? (
            <p id="mf-undercut-err" role="alert" className="mt-1 text-xs text-loss-text">
              {errors.undercutPct}
            </p>
          ) : (
            <p id="mf-undercut-help" className="mt-1 text-xs text-ink-2">
              5% is a typical Buy Box undercut.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="mf-ads" className={labelCls}>
            Promoted listing rate (%)
          </label>
          <input
            id="mf-ads"
            type="number"
            inputMode="decimal"
            min="0"
            max="30"
            step="0.5"
            value={promotedPct}
            onChange={(e) => setPromotedPct(e.target.value)}
            className={`${inputCls} num`}
          />
        </div>

        <div className="flex items-end lg:col-span-4">
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
                Analyze the flip
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

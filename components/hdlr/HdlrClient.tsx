"use client";

import { useState } from "react";
import { AlertTriangle, Check, CircleHelp, Loader2, Search, X } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { evaluateHdlr } from "@/lib/hdlr/evaluate";
import type { ScoutResult } from "@/lib/scout/types";

const inputClass = "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2";

export function HdlrClient() {
  const { demoMode } = useDemoMode();
  const [keyword, setKeyword] = useState("silicone oven glove");
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const [veroReviewed, setVeroReviewed] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierCost, setSupplierCost] = useState("");
  const [result, setResult] = useState<ScoutResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (keyword.trim().length < 2) {
      setError("Enter a product phrase with at least two characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          matchMode: "relevance",
          soldWindowDays: windowDays,
          maxSellerFeedback: null,
          removeHighRisk: false,
          sort: "feedback_asc",
          demo: demoMode,
        }),
      });
      const body = (await response.json()) as ScoutResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `Research failed (${response.status}).`);
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Research failed.");
    } finally {
      setLoading(false);
    }
  }

  const evaluation = result
    ? evaluateHdlr(result, {
        soldWindowDays: windowDays,
        veroReviewed,
        supplierName,
        supplierUnitCost: supplierCost === "" ? null : Number(supplierCost),
      })
    : null;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="border border-line bg-surface/50 p-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="hdlr-product">Product phrase</label>
            <input id="hdlr-product" className={inputClass} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. silicone oven glove" />
          </div>
          <div>
            <label className={labelClass} htmlFor="hdlr-window">Evidence window</label>
            <select id="hdlr-window" className={inputClass} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value) as 30 | 60 | 90)}>
              <option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="hdlr-supplier">Supplier</label>
            <input id="hdlr-supplier" className={inputClass} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="name or marketplace" />
          </div>
          <div>
            <label className={labelClass} htmlFor="hdlr-cost">Supplier unit cost $</label>
            <input id="hdlr-cost" className={`${inputClass} num`} type="number" min="0.01" step="0.01" value={supplierCost} onChange={(e) => setSupplierCost(e.target.value)} placeholder="0.00" />
          </div>
          <label className="flex min-h-11 items-center gap-3 border border-line px-3 text-sm md:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={veroReviewed} onChange={(e) => setVeroReviewed(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            I reviewed eBay VeRO participant profiles and the product&apos;s trademark/copyright risk.
          </label>
        </div>
        <button type="submit" disabled={loading} className="mt-4 inline-flex min-h-11 items-center gap-2 bg-accent px-5 text-sm font-bold text-white disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Search size={16} aria-hidden />}
          {loading ? "Testing evidence…" : "Run HDLR test"}
        </button>
      </form>

      {error && <ErrorState title="HDLR research failed" body={error} />}

      {evaluation && result && (
        <section aria-live="polite" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border-y border-line py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-2">HDLR decision</p>
              <h2 className={`mt-1 font-display text-3xl font-black uppercase ${evaluation.verdict === "QUALIFIED" ? "text-gain-text" : evaluation.verdict === "REJECT" ? "text-loss-text" : "text-warn-text"}`}>{evaluation.verdict}</h2>
            </div>
            <p className="max-w-xl text-sm text-ink-2">
              {result.provenance} {result.mode.toLowerCase()} evidence. A qualification is research support, not permission to list or a profitability guarantee.
            </p>
          </div>

          <div className="grid border-l border-t border-line md:grid-cols-5">
            {evaluation.gates.map((gate) => {
              const Icon = gate.status === "PASS" ? Check : gate.status === "FAIL" ? X : CircleHelp;
              return (
                <article key={gate.id} className="border-b border-r border-line p-3">
                  <div className={`flex items-center gap-1.5 text-xs font-bold uppercase ${gate.status === "PASS" ? "text-gain-text" : gate.status === "FAIL" ? "text-loss-text" : "text-warn-text"}`}>
                    <Icon size={14} aria-hidden /> {gate.status}
                  </div>
                  <h3 className="mt-2 text-sm font-bold">{gate.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{gate.evidence}</p>
                </article>
              );
            })}
          </div>

          {result.mode === "ACTIVE" && (
            <p className="flex items-start gap-2 border border-warn/60 bg-warn/10 p-3 text-sm text-warn-text">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              Live Browse access returned active listings only. The engine refuses to convert asking prices into sales evidence.
            </p>
          )}
          <p className="text-xs text-ink-2">Next step: open the product in Scout to inspect individual sellers, then send the supplier cost to Sourcing for fee-true margin and ROI.</p>
        </section>
      )}
    </div>
  );
}

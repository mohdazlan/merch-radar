"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import pLimit from "p-limit";
import {
  AlertTriangle,
  Bot,
  Download,
  FileWarning,
  PackageX,
  Play,
} from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { VerdictChip } from "@/components/sourcing/VerdictChip";
import {
  dedupeRows,
  mapRows,
  parseManifest,
  type ColumnMapping,
  type ManifestRow,
  type ParsedManifest,
} from "@/lib/manifest/parse";
import { analyze, type Analysis } from "@/lib/analysis/compute";
import type { CompsResult } from "@/lib/analysis/types";

type AnalyzedRow = {
  item: string;
  qty: number;
  unitCost: number;
  provenance: "LIVE" | "DEMO";
  analysis: Analysis | null; // null = no comps
  totalNet: number;
  deadStock: boolean;
  aiFlag: string | null;
};

type SortKey = "roi" | "capitalPerDay" | "totalNet";

const money = (x: number) => `$${x.toFixed(2)}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const MAX_AI_BATCHES = 8; // §9 hard cap
const AI_BATCH_SIZE = 25;

export function ManifestClient() {
  const { demoMode } = useDemoMode();
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedManifest | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [phase, setPhase] = useState<"input" | "preview" | "running" | "done">(
    "input",
  );
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<AnalyzedRow[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("roi");
  const [sortDesc, setSortDesc] = useState(true);
  const [aiState, setAiState] = useState<
    "idle" | "running" | "done" | "unavailable"
  >("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mappedRows: ManifestRow[] = useMemo(() => {
    if (!parsed || !mapping) return [];
    return mapRows(parsed.rows, mapping, parsed.hasHeader);
  }, [parsed, mapping]);
  const validRows = mappedRows.filter((r) => !r.error);
  const errorRows = mappedRows.filter((r) => r.error);

  function loadText(text: string) {
    const p = parseManifest(text);
    setRawText(text);
    setParsed(p);
    setMapping({
      item: p.guess.item === -1 ? 0 : p.guess.item,
      qty: p.guess.qty,
      unitCost: p.guess.unitCost === -1 ? 0 : p.guess.unitCost,
    });
    setPhase("preview");
    setResults([]);
    setAiState("idle");
  }

  async function onFile(file: File) {
    loadText(await file.text());
  }

  const runAnalysis = useCallback(async () => {
    const deduped = dedupeRows(mappedRows);
    setPhase("running");
    setProgress({ done: 0, total: deduped.length });
    setResults([]);

    const limit = pLimit(5); // §9: rate-limited concurrency
    await Promise.all(
      deduped.map((row) =>
        limit(async () => {
          let analyzed: AnalyzedRow;
          try {
            const res = await fetch("/api/comps", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ q: row.item, demo: demoMode }),
            });
            if (!res.ok) throw new Error(String(res.status));
            const comps = (await res.json()) as CompsResult;
            const a = analyze(comps, {
              buyCost: row.unitCost,
              shippingCost: 0, // manifest costs are unit buy costs; shipping added at listing time
              qty: row.qty,
              presetId: "ebay",
              promotedListingPct: 0,
            });
            const ok = a.status === "OK" ? a : null;
            analyzed = {
              item: row.item,
              qty: row.qty,
              unitCost: row.unitCost,
              provenance: comps.provenance,
              analysis: ok,
              totalNet: ok ? ok.metrics.netProfit * row.qty : 0,
              deadStock: ok?.verdict.verdict === "PASS — DEAD STOCK RISK",
              aiFlag: null,
            };
          } catch {
            analyzed = {
              item: row.item,
              qty: row.qty,
              unitCost: row.unitCost,
              provenance: "DEMO",
              analysis: null,
              totalNet: 0,
              deadStock: false,
              aiFlag: null,
            };
          }
          // partial-results streaming: rows populate as they resolve
          setResults((prev) => [...prev, analyzed]);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }),
      ),
    );
    setPhase("done");
  }, [mappedRows, demoMode]);

  const runTriage = useCallback(async () => {
    setAiState("running");
    const scored = results.filter((r) => r.analysis);
    const batches: AnalyzedRow[][] = [];
    for (
      let i = 0;
      i < scored.length && batches.length < MAX_AI_BATCHES;
      i += AI_BATCH_SIZE
    ) {
      batches.push(scored.slice(i, i + AI_BATCH_SIZE));
    }
    let anyAvailable = false;
    for (const batch of batches) {
      try {
        const res = await fetch("/api/manifest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: batch.map((r) => ({
              item: r.item,
              verdict: r.analysis!.verdict.verdict,
              roi: r.analysis!.metrics.roi,
            })),
          }),
        });
        const data = (await res.json()) as {
          available: boolean;
          flags?: { item: string; flag: string }[];
        };
        if (!data.available) continue;
        anyAvailable = true;
        const flagMap = new Map(
          (data.flags ?? []).map((f) => [f.item.toLowerCase(), f.flag]),
        );
        setResults((prev) =>
          prev.map((r) =>
            flagMap.has(r.item.toLowerCase())
              ? { ...r, aiFlag: flagMap.get(r.item.toLowerCase())! }
              : r,
          ),
        );
      } catch {
        // batch failure is non-fatal — engine verdicts stand
      }
    }
    setAiState(anyAvailable ? "done" : "unavailable");
  }, [results]);

  const sorted = useMemo(() => {
    const key = sortKey;
    return [...results].sort((a, b) => {
      const va =
        key === "totalNet"
          ? a.totalNet
          : (a.analysis?.metrics[key] ?? -Infinity);
      const vb =
        key === "totalNet"
          ? b.totalNet
          : (b.analysis?.metrics[key] ?? -Infinity);
      return sortDesc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [results, sortKey, sortDesc]);

  const summary = useMemo(() => {
    const scored = results.filter((r) => r.analysis);
    const totalCost = results.reduce((a, r) => a + r.unitCost * r.qty, 0);
    const totalNet = scored.reduce((a, r) => a + r.totalNet, 0);
    const deadCount = results.filter((r) => r.deadStock).length;
    let capWeightedDays = 0;
    let capWithDays = 0;
    for (const r of scored) {
      const d = r.analysis!.metrics.daysToFlip;
      if (d !== null) {
        capWeightedDays += d * r.unitCost * r.qty;
        capWithDays += r.unitCost * r.qty;
      }
    }
    return {
      totalCost,
      totalNet,
      blendedRoi: totalCost > 0 ? totalNet / totalCost : 0,
      deadCount,
      daysToClear: capWithDays > 0 ? capWeightedDays / capWithDays : null,
    };
  }, [results]);

  function exportCsv() {
    const header =
      "Item,Qty,Unit Cost,Est Sell,Net/Unit,Total Net,ROI,Sell-through,Days to Flip,Verdict,Rule,Confidence,Provenance,AI Flag";
    const lines = sorted.map((r) => {
      const m = r.analysis?.metrics;
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        esc(r.item),
        r.qty,
        r.unitCost.toFixed(2),
        m ? m.estSellPrice.toFixed(2) : "",
        m ? m.netProfit.toFixed(2) : "",
        r.totalNet.toFixed(2),
        m ? (m.roi * 100).toFixed(1) + "%" : "",
        m?.sellThroughRate != null ? (m.sellThroughRate * 100).toFixed(1) + "%" : "",
        m?.daysToFlip != null ? Math.round(m.daysToFlip) : "",
        esc(r.analysis?.verdict.verdict ?? "NO COMPS"),
        r.analysis?.verdict.ruleId ?? "",
        r.analysis ? r.analysis.confidence.confidence + "%" : "",
        r.provenance,
        esc(r.aiFlag ?? ""),
      ].join(",");
    });
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manifest-analyzed.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 12,
  });

  const aiBatchCount = Math.min(
    Math.ceil(results.filter((r) => r.analysis).length / AI_BATCH_SIZE),
    MAX_AI_BATCHES,
  );

  const sortButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => {
        if (sortKey === key) setSortDesc((d) => !d);
        else {
          setSortKey(key);
          setSortDesc(true);
        }
      }}
      aria-pressed={sortKey === key}
      className={`min-h-11 border px-3 text-xs font-medium uppercase tracking-wide ${
        sortKey === key
          ? "border-accent text-ink"
          : "border-line text-ink-2 hover:text-ink"
      }`}
    >
      {label} {sortKey === key ? (sortDesc ? "↓" : "↑") : ""}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* ---- input ---- */}
      <section aria-label="Manifest input" className="border border-line bg-surface/50 p-4">
        <label
          htmlFor="manifest-paste"
          className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2"
        >
          Paste CSV / TSV / spreadsheet rows — or drop a .csv
        </label>
        <textarea
          id="manifest-paste"
          rows={6}
          value={rawText}
          onChange={(e) => e.target.value.trim() ? loadText(e.target.value) : setRawText(e.target.value)}
          onDrop={(e) => {
            const f = e.dataTransfer.files?.[0];
            if (f) {
              e.preventDefault();
              void onFile(f);
            }
          }}
          placeholder={"Item Name,Qty,Unit Buy Cost\nNintendo Switch OLED Console,2,150\nStanley Quencher 40oz Tumbler,24,15\nFunko Pop Grogu 1105,60,4"}
          className="num w-full border border-line bg-bg p-3 text-sm placeholder:text-ink-2 focus:border-accent"
        />
        <div className="mt-2 flex items-center gap-3">
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            aria-label="Upload manifest file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
            className="text-xs text-ink-2 file:mr-2 file:min-h-9 file:border file:border-line file:bg-surface file:px-3 file:text-xs file:text-ink"
          />
        </div>
      </section>

      {/* ---- mapper + preview ---- */}
      {parsed && mapping && phase !== "input" && (
        <section aria-label="Column mapping" className="border border-line p-4">
          <div className="flex flex-wrap items-end gap-4">
            {(
              [
                ["item", "Item Name"],
                ["qty", "Qty (optional)"],
                ["unitCost", "Unit Buy Cost"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label
                  htmlFor={`map-${field}`}
                  className="mb-1 block text-xs uppercase tracking-wide text-ink-2"
                >
                  {label}
                </label>
                <select
                  id={`map-${field}`}
                  value={mapping[field]}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field]: Number(e.target.value) })
                  }
                  className="h-11 border border-line bg-surface px-2 text-sm"
                >
                  {field === "qty" && <option value={-1}>— none (qty 1)</option>}
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={phase === "running" || validRows.length === 0}
              className="inline-flex h-11 items-center gap-2 border border-accent bg-accent/15 px-5 text-sm font-bold uppercase tracking-wide hover:bg-accent/25 disabled:opacity-60"
            >
              <Play size={14} aria-hidden />
              Analyze {dedupeRows(mappedRows).length} unique items
            </button>
          </div>
          <p className="num mt-3 text-xs text-ink-2">
            {mappedRows.length} rows · {validRows.length} valid ·{" "}
            {errorRows.length} skipped · deduped to{" "}
            {dedupeRows(mappedRows).length} unique items — cached comps are
            reused, so re-runs are free
          </p>
          {errorRows.length > 0 && (
            <details className="mt-2">
              <summary className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs text-warn-text">
                <FileWarning size={12} aria-hidden />
                {errorRows.length} rows skipped (malformed — never crash)
              </summary>
              <ul className="num mt-1 space-y-0.5 text-xs text-ink-2">
                {errorRows.slice(0, 10).map((r) => (
                  <li key={r.line}>
                    line {r.line}: {r.error} — “{r.item || "(empty)"}”
                  </li>
                ))}
                {errorRows.length > 10 && <li>… and {errorRows.length - 10} more</li>}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ---- progress ---- */}
      {phase === "running" && (
        <div role="status" aria-live="polite" className="border border-line p-4">
          <p className="num text-sm">
            Analyzing {progress.done} / {progress.total} items — rows populate
            as they resolve
          </p>
          <div className="mt-2 h-1.5 w-full bg-surface">
            <div
              className="h-1.5 bg-accent transition-[width] duration-150"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ---- results ---- */}
      {results.length > 0 && (
        <section aria-label="Manifest analysis results" className="space-y-3">
          <p className="num border border-line bg-surface/60 px-4 py-3 text-sm">
            total cost {money(summary.totalCost)} · projected net{" "}
            <span className={summary.totalNet > 0 ? "text-gain-text" : "text-loss-text"}>
              {money(summary.totalNet)}
            </span>{" "}
            · blended ROI {pct(summary.blendedRoi)} ·{" "}
            <span className={summary.deadCount > 0 ? "text-loss-text" : ""}>
              {summary.deadCount} dead-stock risk{summary.deadCount === 1 ? "" : "s"}
            </span>{" "}
            · days to clear{" "}
            {summary.daysToClear === null ? "—" : Math.round(summary.daysToClear)}{" "}
            (capital-weighted) · shipping excluded
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-ink-2">Sort:</span>
            {sortButton("roi", "ROI")}
            {sortButton("capitalPerDay", "Profit/day")}
            {sortButton("totalNet", "Total net")}
            <span className="flex-1" />
            {phase === "done" && aiState === "idle" && (
              <button
                type="button"
                onClick={() => void runTriage()}
                className="inline-flex min-h-11 items-center gap-1.5 border border-line px-3 text-xs font-medium hover:border-ink-2"
              >
                <Bot size={13} aria-hidden />
                AI triage ({aiBatchCount} call{aiBatchCount === 1 ? "" : "s"}, engine math already done)
              </button>
            )}
            {aiState === "running" && (
              <span className="text-xs text-ink-2" role="status">
                Triaging in batches of 25…
              </span>
            )}
            {aiState === "unavailable" && (
              <span className="text-xs text-ink-2">
                AI triage unavailable (no API key) — engine verdicts are unaffected.
              </span>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-11 items-center gap-1.5 border border-line px-3 text-xs font-medium hover:border-ink-2"
            >
              <Download size={13} aria-hidden />
              Export CSV
            </button>
          </div>

          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label="Analyzed manifest rows (scrollable)"
            className="max-h-[560px] overflow-auto border border-line"
          >
            <div
              style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
            >
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const r = sorted[vi.index];
                const m = r.analysis?.metrics;
                return (
                  <div
                    key={`${r.item}-${vi.index}`}
                    className={`absolute left-0 top-0 flex w-full items-center gap-3 border-b border-line px-3 text-sm ${
                      r.deadStock
                        ? "bg-loss/10"
                        : r.analysis?.verdict.verdict.startsWith("CAUTION")
                          ? "bg-warn/5"
                          : ""
                    }`}
                    style={{ height: 64, transform: `translateY(${vi.start}px)` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {r.deadStock && (
                          <PackageX size={13} className="shrink-0 text-loss-text" aria-hidden />
                        )}
                        <span className="truncate font-medium">{r.item}</span>
                      </div>
                      <span className="num text-xs text-ink-2">
                        qty {r.qty} · unit {money(r.unitCost)} ·{" "}
                        {r.provenance === "DEMO" ? "demo comps" : "live comps"}
                        {r.deadStock && (
                          <span className="text-loss-text"> · dead stock risk</span>
                        )}
                      </span>
                      {r.aiFlag && (
                        <p className="mt-0.5 flex items-start gap-1 text-xs text-warn-text">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" aria-hidden />
                          {r.aiFlag}
                        </p>
                      )}
                    </div>
                    {m ? (
                      <>
                        <span className="num hidden w-20 text-right text-xs md:block">
                          {money(m.estSellPrice)}
                          <br />
                          <span className="text-ink-2">est sell</span>
                        </span>
                        <span
                          className={`num w-24 text-right text-xs ${
                            r.totalNet > 0 ? "text-gain-text" : "text-loss-text"
                          }`}
                        >
                          {money(r.totalNet)}
                          <br />
                          <span className="text-ink-2">total net</span>
                        </span>
                        <span className="num hidden w-14 text-right text-xs sm:block">
                          {pct(m.roi)}
                          <br />
                          <span className="text-ink-2">roi</span>
                        </span>
                        <span className="num hidden w-14 text-right text-xs lg:block">
                          {m.sellThroughRate === null ? "—" : pct(m.sellThroughRate)}
                          <br />
                          <span className="text-ink-2">str</span>
                        </span>
                        <span className="num hidden w-14 text-right text-xs lg:block">
                          {m.daysToFlip === null ? "—" : Math.round(m.daysToFlip)}
                          <br />
                          <span className="text-ink-2">days</span>
                        </span>
                        <span className="w-44 shrink-0">
                          <VerdictChip
                            verdict={r.analysis!.verdict.verdict}
                            weak={r.analysis!.weak}
                          />
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-ink-2">
                        no comps — unmodeled line
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

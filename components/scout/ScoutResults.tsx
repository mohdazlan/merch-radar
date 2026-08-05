"use client";

import { AlertTriangle, Download, ExternalLink, Printer, Sprout } from "lucide-react";
import { Chip } from "@/components/shared/Chip";
import { EmptyState } from "@/components/shared/EmptyState";
import { toCsv } from "@/lib/scout/filters";
import type { ScoutQuery, ScoutResult } from "@/lib/scout/types";

const money = (x: number) => `$${x.toFixed(2)}`;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** feedback score at or below this earns the "new seller" highlight */
const NEW_SELLER_HIGHLIGHT = 100;

export function ScoutResults({
  result,
  sort,
}: {
  result: ScoutResult;
  /** the sort the last search actually ran with, so the banner can name it */
  sort?: ScoutQuery["sort"];
}) {
  function exportCsv() {
    const blob = new Blob([toCsv(result.items)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scout-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="No listings survived the filters"
        body={
          result.pipeline.length > 0
            ? "eBay returned results but every one was filtered out. Loosen the seller-feedback cap, widen the price range, or turn off high-risk removal."
            : "eBay returned nothing for this search. Try broader keywords, a different category, or a wider sold window."
        }
      />
    );
  }

  return (
    <section aria-label="Scout results" className="space-y-3">
      {/* mode banner — an active listing is not proof of a sale */}
      {result.mode === "ACTIVE" && (
        <p
          role="status"
          className="flex items-start gap-2 border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn-text"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            These are <strong>active listings</strong>, not confirmed sales.
            Real sold history needs eBay&apos;s Marketplace Insights API, which
            is a separate approval from the Browse access this app already has.
            Until it&apos;s granted, treat these as &ldquo;what sellers are
            asking&rdquo; — not &ldquo;what buyers paid&rdquo;. That also means
            the &ldquo;Sold within&rdquo; window is ignored right now, and
            {sort === "recent"
              ? " “Newest first” is sorted by listing date, not sale date."
              : " any date-based sort or filter reflects listing date, not sale date."}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={result.provenance === "DEMO" ? "warn" : "gain"}>
          {result.provenance}
        </Chip>
        <Chip tone={result.mode === "SOLD" ? "gain" : "warn"}>
          {result.mode === "SOLD" ? "sold data" : "active listings"}
        </Chip>
        <span className="num text-xs text-ink-2">
          {result.items.length} shown · {result.totalMatched} matched on eBay
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex min-h-11 items-center gap-1.5 border border-line px-3 text-xs font-medium hover:border-ink-2"
        >
          <Download size={13} aria-hidden />
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-1.5 border border-line px-3 text-xs font-medium hover:border-ink-2"
        >
          <Printer size={13} aria-hidden />
          Print / PDF
        </button>
      </div>

      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Result listings (scrollable)"
      >
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <caption className="sr-only">
            eBay listings matching the search, after the disclosed filter
            pipeline. Sellers with low feedback scores are highlighted.
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-2">
              <th scope="col" className="py-2 pr-4 font-medium">Item</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Price</th>
              <th scope="col" className="py-2 pr-4 font-medium">Seller</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Feedback</th>
              <th scope="col" className="py-2 pr-4 font-medium">From</th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {result.mode === "SOLD" ? "Sold" : "Listed"}
              </th>
              <th scope="col" className="py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((it) => {
              const isNewSeller =
                it.seller.feedbackScore !== null &&
                it.seller.feedbackScore <= NEW_SELLER_HIGHLIGHT;
              return (
                <tr
                  key={it.itemId}
                  className={`border-b border-line align-top ${
                    isNewSeller ? "bg-gain/5" : ""
                  }`}
                >
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                    <span className="line-clamp-2 max-w-[320px] font-medium">
                      {it.title}
                    </span>
                    {it.itemWebUrl && (
                      <a
                        href={it.itemWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-ink-2 underline hover:text-ink"
                      >
                        view on eBay <ExternalLink size={10} aria-hidden />
                      </a>
                    )}
                  </th>
                  <td className="num py-2.5 pr-4 text-right font-medium">
                    {money(it.price)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="num text-xs">{it.seller.username}</span>
                    {isNewSeller && (
                      <span className="mt-0.5 block">
                        <Chip tone="gain" icon={Sprout}>
                          new seller
                        </Chip>
                      </span>
                    )}
                  </td>
                  <td className="num py-2.5 pr-4 text-right">
                    {it.seller.feedbackScore ?? "—"}
                    {it.seller.feedbackPct !== null && (
                      <span className="block text-xs text-ink-2">
                        {it.seller.feedbackPct}%
                      </span>
                    )}
                  </td>
                  <td className="num py-2.5 pr-4 text-xs">
                    {it.itemLocation ?? "—"}
                  </td>
                  <td className="num py-2.5 pr-4 text-xs">
                    {fmtDate(it.soldDate)}
                  </td>
                  <td className="py-2.5">
                    {it.riskFlags.length === 0 ? (
                      <span className="text-xs text-ink-2">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {it.riskFlags.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-1 text-xs text-warn-text"
                          >
                            <AlertTriangle
                              size={11}
                              className="mt-0.5 shrink-0"
                              aria-hidden
                            />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

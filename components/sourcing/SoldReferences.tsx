"use client";

import { useState } from "react";
import { ExternalLink, History, ListChecks } from "lucide-react";
import type { CompsResult } from "@/lib/analysis/types";
import type { SoldReference } from "@/lib/ebay/DemandSource";

const INITIAL_ROWS = 8;

function money(reference: SoldReference) {
  return `${reference.currency} ${reference.price.toFixed(2)}`;
}

export function SoldReferences({ sold }: { sold: CompsResult["sold"] }) {
  const [expanded, setExpanded] = useState(false);

  if (sold.status === "UNAVAILABLE") {
    return (
      <section
        className="border border-line bg-surface/30 p-4"
        aria-labelledby="sold-evidence-title"
      >
        <div className="flex items-start gap-3">
          <History
            size={18}
            className="mt-0.5 shrink-0 text-ink-2"
            aria-hidden
          />
          <div>
            <h3
              id="sold-evidence-title"
              className="font-display text-sm font-black uppercase tracking-tight"
            >
              Sold evidence unavailable
            </h3>
            <p className="mt-1 text-sm text-ink-2">
              eBay returned no completed-sale records or matched listings with
              a reported sold quantity. The estimate therefore falls back to
              discounted active-listing prices and no sold-item list is shown.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isCompleted = sold.status === "OK";
  const references = sold.references;
  const visible = expanded ? references : references.slice(0, INITIAL_ROWS);

  return (
    <section
      className="border border-line bg-surface/30"
      aria-labelledby="sold-evidence-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
        <div className="flex items-start gap-3">
          <ListChecks
            size={18}
            className="mt-0.5 shrink-0 text-gain-text"
            aria-hidden
          />
          <div>
            <h3
              id="sold-evidence-title"
              className="font-display text-sm font-black uppercase tracking-tight"
            >
              {isCompleted
                ? "Completed-sale references"
                : "Listings with confirmed sales"}
            </h3>
            <p className="num mt-1 text-xs text-ink-2">
              {isCompleted
                ? `${sold.count.toLocaleString()} units sold / 90d · ${references.length} priced records`
                : `${sold.count.toLocaleString()} lifetime units · ${references.length} sold-backed listings from ${sold.scannedListingCount} sampled matches`}
            </p>
          </div>
        </div>
        <span className="border border-gain/60 bg-gain/10 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-gain-text">
          {isCompleted ? "completed prices" : "sales verified"}
        </span>
      </div>

      <p className="border-b border-line px-4 py-3 text-xs text-ink-2">
        {isCompleted
          ? "The estimated selling price uses the median completed-sale price below."
          : "eBay reports sales on these currently active listings. The displayed amount is the current asking price, not the historic checkout price. The estimate uses only this sold-backed subset; 90-day sell-through and velocity remain unavailable."}
      </p>

      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Sold-item evidence (scrollable)"
      >
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-2">
              <th
                scope="col"
                className="border-b border-line px-4 py-2 font-medium"
              >
                Item
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-2 text-right font-medium"
              >
                {isCompleted ? "Sold price" : "Current price"}
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-2 text-right font-medium"
              >
                {isCompleted ? "Sold date" : "Units sold"}
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-2 font-medium"
              >
                Seller · condition
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-2 text-right font-medium"
              >
                Reference
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((reference) => (
              <tr
                key={`${reference.itemId}-${reference.soldDate ?? "listing"}`}
                className="align-top"
              >
                <th
                  scope="row"
                  className="max-w-[340px] border-b border-line px-4 py-3 text-left font-normal"
                >
                  <span className="line-clamp-2">{reference.title}</span>
                </th>
                <td className="num border-b border-line px-4 py-3 text-right">
                  {money(reference)}
                </td>
                <td className="num border-b border-line px-4 py-3 text-right">
                  {isCompleted
                    ? (reference.soldDate?.slice(0, 10) ?? "—")
                    : reference.soldQuantity.toLocaleString()}
                </td>
                <td className="border-b border-line px-4 py-3 text-xs text-ink-2">
                  {reference.sellerName ?? "seller unavailable"}
                  {reference.condition ? ` · ${reference.condition}` : ""}
                </td>
                <td className="border-b border-line px-4 py-3 text-right">
                  {reference.itemWebUrl ? (
                    <a
                      href={reference.itemWebUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-accent underline underline-offset-2"
                    >
                      Open eBay <ExternalLink size={12} aria-hidden />
                    </a>
                  ) : (
                    <span className="text-xs text-ink-2">demo record</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {references.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="min-h-11 w-full border-t border-line px-4 text-left text-sm font-medium hover:bg-surface"
        >
          {expanded
            ? "Show fewer references"
            : `Show all ${references.length} references`}
        </button>
      )}
    </section>
  );
}

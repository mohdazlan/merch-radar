import { Filter } from "lucide-react";
import type { FilterStep } from "@/lib/scout/types";

/**
 * The funnel, made visible. Every filter that removed rows says so and names
 * its rule — no silent shrinking of the result set (Rule 3).
 */
export function FilterPipeline({
  pipeline,
  totalMatched,
}: {
  pipeline: FilterStep[];
  totalMatched: number;
}) {
  if (pipeline.length === 0) return null;

  return (
    <details className="border border-line">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium">
        <Filter size={14} aria-hidden />
        Filter pipeline — {pipeline.length} step
        {pipeline.length === 1 ? "" : "s"} applied after fetching
      </summary>
      <ol className="border-t border-line">
        <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2 text-sm">
          <span className="text-ink-2">Matched on eBay</span>
          <span className="num font-medium">{totalMatched}</span>
        </li>
        {pipeline.map((s) => (
          <li
            key={s.step}
            className="border-b border-line px-4 py-2 text-sm last:border-b-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{s.step}</span>
              <span className="num text-xs">
                <span className={s.removed > 0 ? "text-loss-text" : "text-ink-2"}>
                  −{s.removed}
                </span>{" "}
                <span className="text-ink-2">→ {s.remaining} left</span>
              </span>
            </div>
            <p className="mt-0.5 max-w-prose text-xs text-ink-2">{s.rule}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

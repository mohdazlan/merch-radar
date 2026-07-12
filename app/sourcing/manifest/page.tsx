import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SourcingTabs } from "@/components/sourcing/SourcingTabs";

export const metadata: Metadata = { title: "Manifest" };

export default function ManifestPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SourcingTabs />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 min-[900px]:mt-0">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Manifest Analyzer
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Pallet and lot triage: paste a manifest, see which lines make money
            and which are dead stock.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-10">
        <EmptyState
          icon={FileSpreadsheet}
          title="The manifest pipeline lands in M6"
          body="CSV paste and upload, column mapping, cached batched comps, per-row verdicts at zero AI cost, and the manifest-level bid line: total cost, projected net, blended ROI, dead-stock count, days to clear."
        />
      </div>
    </div>
  );
}

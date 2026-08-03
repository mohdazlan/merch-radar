import type { Metadata } from "next";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ScoutClient } from "@/components/scout/ScoutClient";

export const metadata: Metadata = {
  title: "Scout",
  description:
    "Find what's selling on eBay and who's selling it — filter for brand-new sellers already moving product, and copy what works.",
};

export default function ScoutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Scout
          </h1>
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            Find what&apos;s moving and who&apos;s moving it. The filter that
            matters: sellers with almost no feedback who are{" "}
            <em>already selling</em> — if a nobody can shift it, the product is
            doing the work, and you can do it too.
          </p>
        </div>
        <DemoBadge />
      </div>

      <ScoutClient />
    </div>
  );
}

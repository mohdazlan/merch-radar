import type { Metadata } from "next";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { TrendsClient } from "@/components/trends/TrendsClient";

export const metadata: Metadata = {
  title: "Trends",
  description:
    "Compare product ideas on live eBay market composition — active listings, price spread, top brands/styles already listed, and new-seller approachability.",
};

export default function TrendsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Trends
          </h1>
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            Not a &ldquo;most searched keywords&rdquo; panel — eBay and Google
            don&apos;t publish a free API for that, and faking one would be
            exactly the kind of hype-tool guess this app refuses to show.
            Instead: enter a few product ideas, and we compare them on live
            eBay market composition — how many are already listed, at what
            price, under which brands/styles, and whether newcomers are still
            breaking in.
          </p>
        </div>
        <DemoBadge />
      </div>

      <TrendsClient />
    </div>
  );
}

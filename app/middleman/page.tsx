import type { Metadata } from "next";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { MiddlemanClient } from "@/components/middleman/MiddlemanClient";

export const metadata: Metadata = {
  title: "Middleman",
  description:
    "Should I list what my friend can supply? Price against live eBay competitors, undercut the floor, know your break-even supplier cost.",
};

export default function MiddlemanPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Middleman
          </h1>
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            Your friend supplies, you resell. Enter what they&apos;re quoting
            you and we&apos;ll price it against live eBay competitors, tell
            you what to list at, and what supplier price your friend has to
            hit for the flip to work.
          </p>
        </div>
        <DemoBadge />
      </div>

      <MiddlemanClient />
    </div>
  );
}

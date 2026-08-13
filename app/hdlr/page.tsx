import type { Metadata } from "next";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { HdlrClient } from "@/components/hdlr/HdlrClient";

export const metadata: Metadata = {
  title: "HDLR Lab",
  description: "Test eBay product ideas against disclosed high-demand, low-risk evidence gates.",
};

export default function HdlrPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">HDLR Lab</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            High demand, low risk—tested as five evidence gates. We verify what the data can prove, expose what still needs human review, and never treat an active listing as a sale.
          </p>
        </div>
        <DemoBadge />
      </div>

      <HdlrClient />
    </div>
  );
}

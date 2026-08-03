import Link from "next/link";
import { ArrowRight, Handshake, Radar, ShoppingCart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2">
        One app, three questions
      </p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
        Stop finding out too late. Stop buying dead stock.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-ink-2">
        Merch Radar tells you what to launch this week. ApexSourcing tells you
        what&apos;s worth buying today. Middleman tells you what to list from
        a supplier friend. Same live eBay data, same fee math, three
        different decisions.
      </p>

      <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-3">
        <Link
          href="/radar"
          className="group flex flex-col gap-3 bg-bg p-6 hover:bg-surface"
        >
          <div className="flex items-center gap-2">
            <Radar size={18} className="text-riso-red" aria-hidden />
            <span className="font-display text-lg font-black uppercase">
              Radar
            </span>
          </div>
          <p className="text-sm text-ink-2">
            <em>What should I create and list, and by when?</em> Seasonal and
            event demand with launch-by dates — for POD sellers who keep
            finding out two weeks late.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-riso-red">
            Plan launches <ArrowRight size={14} aria-hidden />
          </span>
        </Link>

        <Link
          href="/sourcing"
          className="group flex flex-col gap-3 bg-bg p-6 hover:bg-surface"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-riso-blue" aria-hidden />
            <span className="font-display text-lg font-black uppercase">
              ApexSourcing
            </span>
          </div>
          <p className="text-sm text-ink-2">
            <em>Should I buy this unit, this pallet, at this cost?</em> Comps,
            sell-through, fee-true margin, and a rule-based verdict — for
            resellers with capital on the line.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-riso-blue">
            Analyze a buy <ArrowRight size={14} aria-hidden />
          </span>
        </Link>

        <Link
          href="/middleman"
          className="group flex flex-col gap-3 bg-bg p-6 hover:bg-surface"
        >
          <div className="flex items-center gap-2">
            <Handshake size={18} className="text-gain-text" aria-hidden />
            <span className="font-display text-lg font-black uppercase">
              Middleman
            </span>
          </div>
          <p className="text-sm text-ink-2">
            <em>My friend supplies — can I resell it on eBay?</em> Live
            competitor ladder, undercut pricing, and the exact break-even
            supplier price to negotiate against.
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-gain-text">
            Price the flip <ArrowRight size={14} aria-hidden />
          </span>
        </Link>
      </div>

      <p className="mt-10 max-w-2xl text-sm text-ink-2">
        Every number is either pulled live from the marketplace, computed by a
        disclosed formula, or clearly badged as demo data. The app never shows
        a number it can&apos;t defend.
      </p>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/shared/Header";

/**
 * Applies the surface's lightness mode by route:
 * paper (light) for planning surfaces, console (dark) for execution surfaces.
 * The shift is instant — never animated (spec §10).
 */
export function SurfaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mode = pathname.startsWith("/sourcing") ? "console" : "paper";

  return (
    <div
      data-mode={mode}
      className="flex min-h-screen flex-col bg-bg text-ink"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line px-4 py-3 text-center text-xs text-ink-2">
        Estimates based on marketplace data and modeled projections. Not
        financial advice. Verify comps before purchasing.
      </footer>
    </div>
  );
}

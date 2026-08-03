"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";

const NAV_ITEMS = [
  { label: "Radar", href: "/radar", match: /^\/radar/ },
  { label: "Sourcing", href: "/sourcing", match: /^\/sourcing$/ },
  {
    label: "Manifest",
    href: "/sourcing/manifest",
    match: /^\/sourcing\/manifest/,
    // sub-tab within Sourcing on <900px, hidden from the top nav there
    hideBelow900: true,
  },
  { label: "Middleman", href: "/middleman", match: /^\/middleman/ },
];

export function Header() {
  const pathname = usePathname();
  const { demoMode, setDemoMode } = useDemoMode();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // close the mobile sheet on Escape; link clicks close it directly
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <header
      className="sticky top-0 border-b border-line bg-bg"
      style={{ zIndex: "var(--z-sticky)" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-base font-black uppercase tracking-tight"
        >
          Merch&nbsp;Radar
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.match.test(pathname);
              return (
                <li
                  key={item.label}
                  className={item.hideBelow900 ? "hidden min-[900px]:block" : ""}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${
                      active
                        ? "border-accent text-ink"
                        : "border-transparent text-ink-2 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-2">
            <span>Demo Mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              aria-label="Demo Mode"
              onClick={() => setDemoMode(!demoMode)}
              className={`relative h-6 w-11 rounded-full border transition-colors duration-150 ${
                demoMode ? "border-warn bg-warn/30" : "border-line bg-surface"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform duration-150 ${
                  demoMode ? "translate-x-5 bg-warn" : "translate-x-0 bg-ink-2"
                }`}
              />
            </button>
          </label>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center md:hidden"
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "Close menu" : "Open menu"}
            onClick={() => setSheetOpen((o) => !o)}
          >
            {sheetOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div
          ref={sheetRef}
          className="fixed inset-x-0 bottom-0 top-14 overflow-y-auto border-t border-line bg-bg md:hidden"
          style={{ zIndex: "var(--z-modal)" }}
        >
          <nav aria-label="Primary mobile">
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => {
                const active = item.match.test(pathname);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSheetOpen(false)}
                      className={`flex min-h-11 items-center border-b border-line px-4 text-base font-medium ${
                        active ? "text-accent" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

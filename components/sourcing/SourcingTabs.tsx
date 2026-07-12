"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Manifest lives as a sub-tab within Sourcing on <900px (spec §4). */
export function SourcingTabs() {
  const pathname = usePathname();
  const tabs = [
    { label: "Co-Pilot", href: "/sourcing" },
    { label: "Manifest", href: "/sourcing/manifest" },
  ];
  return (
    <nav aria-label="Sourcing sections" className="min-[900px]:hidden">
      <ul className="flex border-b border-line">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium ${
                  active
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-2"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

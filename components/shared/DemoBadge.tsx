"use client";

import { FlaskConical } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";

/**
 * Persistent amber badge for synthetic data (Rule 2). Cannot be dismissed.
 * `always` forces it on regardless of the Demo Mode toggle — use it on
 * surfaces that are synthetic at MVP (e.g. the hype panel).
 */
export function DemoBadge({ always = false }: { always?: boolean }) {
  const { demoMode } = useDemoMode();
  if (!demoMode && !always) return null;
  return (
    <span className="inline-flex items-center gap-1.5 border border-warn bg-warn/15 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-warn-text">
      <FlaskConical size={12} aria-hidden />
      Demo data
    </span>
  );
}

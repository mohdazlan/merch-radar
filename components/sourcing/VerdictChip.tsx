import { AlertTriangle, TrendingUp, XCircle } from "lucide-react";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import type { Verdict } from "@/lib/verdict/rules";

/**
 * Never color alone — every verdict pairs an icon with its text (§5.5).
 * `weak` renders the low-confidence variant so a shaky verdict can't be
 * mistaken for a confident one (§5.4).
 */
export function VerdictChip({
  verdict,
  weak = false,
}: {
  verdict: Verdict;
  weak?: boolean;
}) {
  const tone: ChipTone = verdict.startsWith("PASS")
    ? "loss"
    : verdict.startsWith("CAUTION")
      ? "warn"
      : "gain";
  const icon = verdict.startsWith("PASS")
    ? XCircle
    : verdict.startsWith("CAUTION")
      ? AlertTriangle
      : TrendingUp;
  return (
    <Chip tone={tone} icon={icon} weak={weak}>
      {verdict}
    </Chip>
  );
}

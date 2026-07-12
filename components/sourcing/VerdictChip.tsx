import { AlertTriangle, TrendingUp, XCircle } from "lucide-react";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import type { Verdict } from "@/lib/verdict/rules";

/** Never color alone — every verdict pairs an icon with its text (§5.5). */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
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
    <Chip tone={tone} icon={icon}>
      {verdict}
    </Chip>
  );
}

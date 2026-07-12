import type { LucideIcon } from "lucide-react";

export type ChipTone = "neutral" | "gain" | "warn" | "loss" | "accent" | "blue";

const TONES: Record<ChipTone, string> = {
  neutral: "border-line text-ink-2",
  gain: "border-gain/60 bg-gain/10 text-gain-text",
  warn: "border-warn/60 bg-warn/10 text-warn-text",
  loss: "border-loss/60 bg-loss/10 text-loss-text",
  accent: "border-accent/60 bg-accent/10 text-accent",
  blue: "border-riso-blue/60 bg-riso-blue/10 text-riso-blue",
};

/** Small labeled tag. Never color alone — pass an icon for status tones. */
export function Chip({
  children,
  tone = "neutral",
  icon: Icon,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  icon?: LucideIcon;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${TONES[tone]}`}
    >
      {Icon && <Icon size={11} aria-hidden />}
      {children}
    </span>
  );
}

/** Provenance labels per Rule 2 — every projected number carries one. */
export function ProvenanceTag({
  kind,
}: {
  kind: "LIVE" | "MODELED" | "DEMO" | "UNAVAILABLE";
}) {
  const tone: ChipTone =
    kind === "LIVE"
      ? "gain"
      : kind === "MODELED"
        ? "accent"
        : kind === "DEMO"
          ? "warn"
          : "neutral";
  return <Chip tone={tone}>{kind}</Chip>;
}

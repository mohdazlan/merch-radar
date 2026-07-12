/**
 * Dense label/value row — the workbench aesthetic. Numbers are mono,
 * right-aligned, tabular. No cards, hairline dividers only.
 */
export function StatLine({
  label,
  value,
  suffix,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-b-0">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="num text-right text-sm font-medium text-ink">
          {value}
        </span>
        {suffix}
      </span>
    </div>
  );
}

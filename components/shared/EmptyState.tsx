import type { LucideIcon } from "lucide-react";

/** Honest empty state — designed, not an afterthought (spec §10). */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border border-dashed border-line px-6 py-12 text-center">
      {Icon && <Icon size={24} className="text-ink-2" aria-hidden />}
      <p className="font-display text-base font-bold">{title}</p>
      {body && <p className="max-w-md text-sm text-ink-2">{body}</p>}
      {action}
    </div>
  );
}
